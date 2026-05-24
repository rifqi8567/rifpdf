import asyncio
import logging
import shutil
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from redis import Redis
from rq import Queue, Retry, Worker
from rq.job import Job
from starlette.requests import Request

from .converter import conversion_job, validate_office_file
from .logging_config import configure_logging
from .settings import get_settings
from .storage import read_job_meta, write_job_meta

configure_logging()
logger = logging.getLogger("conversion.api")

settings = get_settings()
redis = Redis.from_url(settings.redis_url)
queue = Queue(settings.queue_name, connection=redis, default_timeout=settings.conversion_timeout_seconds + 30)

app = FastAPI(title="DocuMind Office Conversion Service", version="1.0.0")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex)
    logger.exception(
        "conversion_api_unhandled_error request_id=%s method=%s path=%s error=%s",
        request_id,
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc) or exc.__class__.__name__,
            "detail": str(exc) or exc.__class__.__name__,
            "requestId": request_id,
        },
    )


def extension_from_name(filename: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext not in settings.allowed_extensions:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {ext or 'none'}")
    return ext


async def persist_upload(file: UploadFile, job_id: str, extension: str) -> Path:
    target = settings.upload_dir / f"{job_id}.{extension}"
    max_bytes = settings.max_upload_mb * 1024 * 1024
    written = 0

    with target.open("wb") as handle:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_mb}MB limit")
            handle.write(chunk)

    logger.info(
        "upload_persisted job_id=%s filename=%s content_type=%s size=%s extension=%s",
        job_id,
        file.filename,
        file.content_type,
        written,
        extension,
    )

    try:
        validate_office_file(target, extension)
    except Exception as exc:
        logger.warning("upload_validation_failed job_id=%s filename=%s error=%s", job_id, file.filename, exc)
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return target


@app.get("/health")
def health() -> dict[str, str | bool | int]:
    try:
        redis.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    try:
        worker_count = len(Worker.all(connection=redis)) if redis_ok else 0
    except Exception:
        worker_count = 0

    return {
        "status": "ok" if redis_ok and worker_count > 0 else "degraded",
        "redis_connected": redis_ok,
        "worker_count": worker_count,
        "queued_jobs": queue.count if redis_ok else 0,
    }


@app.post("/v1/conversions")
async def create_conversion(file: UploadFile = File(...)) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    job_id = uuid.uuid4().hex
    extension = extension_from_name(file.filename)
    source_path = await persist_upload(file, job_id, extension)
    logger.info("async_conversion_queued job_id=%s filename=%s", job_id, file.filename)

    write_job_meta(
        job_id,
        job_id=job_id,
        status="queued",
        original_filename=file.filename,
        extension=extension,
        input_path=str(source_path),
        created_at=int(time.time()),
    )
    queue.enqueue(
        conversion_job,
        job_id,
        str(source_path),
        file.filename,
        extension,
        job_id=job_id,
        retry=Retry(max=1),
        result_ttl=3600,
        failure_ttl=24 * 3600,
    )
    return {"job_id": job_id, "status": "queued", "status_url": f"/v1/conversions/{job_id}"}


@app.get("/v1/conversions/{job_id}")
def get_conversion(job_id: str) -> dict[str, object]:
    meta = read_job_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Conversion job not found")

    try:
        rq_job = Job.fetch(job_id, connection=redis)
        if rq_job.is_failed and meta.get("status") not in {"failed", "completed"}:
            meta = write_job_meta(job_id, status="failed", error=str(rq_job.exc_info or "worker failed")[:2000])
    except Exception:
        pass

    if meta.get("status") == "completed":
        meta["download_url"] = f"/v1/conversions/{job_id}/download"
    return meta


@app.get("/v1/conversions/{job_id}/download")
def download_conversion(job_id: str) -> FileResponse:
    meta = read_job_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Conversion job not found")
    if meta.get("status") != "completed":
        raise HTTPException(status_code=409, detail=f"Conversion is {meta.get('status', 'not ready')}")

    output_path = Path(str(meta["output_path"]))
    if not output_path.exists():
        raise HTTPException(status_code=410, detail="Converted file has been cleaned up")
    return FileResponse(output_path, media_type="application/pdf", filename=str(meta["filename"]))


@app.post("/v1/conversions/sync")
async def convert_sync(file: UploadFile = File(...)) -> FileResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    job_id = uuid.uuid4().hex
    extension = extension_from_name(file.filename)
    source_path = await persist_upload(file, job_id, extension)
    logger.info("sync_conversion_queued job_id=%s filename=%s", job_id, file.filename)
    write_job_meta(
        job_id,
        job_id=job_id,
        status="queued",
        original_filename=file.filename,
        extension=extension,
        input_path=str(source_path),
        created_at=int(time.time()),
    )
    queue.enqueue(
        conversion_job,
        job_id,
        str(source_path),
        file.filename,
        extension,
        job_id=job_id,
        result_ttl=3600,
        failure_ttl=24 * 3600,
    )

    deadline = time.time() + settings.conversion_timeout_seconds + 30
    while time.time() < deadline:
        meta = read_job_meta(job_id)
        if meta and meta.get("status") == "completed":
            logger.info("sync_conversion_completed job_id=%s", job_id)
            return FileResponse(Path(str(meta["output_path"])), media_type="application/pdf", filename=str(meta["filename"]))
        if meta and meta.get("status") == "failed":
            logger.warning("sync_conversion_failed job_id=%s error=%s", job_id, meta.get("error"))
            raise HTTPException(status_code=422, detail=f"Conversion failed: {str(meta.get('error', 'unknown'))[:1000]}")
        await asyncio.sleep(0.5)

    logger.warning("sync_conversion_timeout job_id=%s timeout_seconds=%s", job_id, settings.conversion_timeout_seconds + 30)
    write_job_meta(job_id, status="failed", error="Gateway timed out waiting for conversion worker")
    raise HTTPException(status_code=504, detail="Conversion timed out")


@app.post("/admin/cleanup")
def cleanup() -> dict[str, int]:
    cutoff = time.time() - (settings.cleanup_retention_hours * 3600)
    removed = 0
    for directory in (settings.upload_dir, settings.output_dir, settings.tmp_dir, settings.job_dir):
        for path in directory.glob("*"):
            if path.stat().st_mtime < cutoff:
                if path.is_dir():
                    shutil.rmtree(path, ignore_errors=True)
                else:
                    path.unlink(missing_ok=True)
                removed += 1
    return {"removed": removed}
