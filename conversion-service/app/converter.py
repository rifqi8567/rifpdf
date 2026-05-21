import os
import shutil
import subprocess
import time
import zipfile
from pathlib import Path

from .settings import get_settings
from .storage import write_job_meta


class ConversionError(RuntimeError):
    pass


def validate_office_file(path: Path, extension: str) -> None:
    if extension not in get_settings().allowed_extensions:
        raise ConversionError(f"Unsupported extension: {extension}")
    if not zipfile.is_zipfile(path):
        raise ConversionError("Invalid Office Open XML file or corrupted ZIP container")


def convert_to_pdf(job_id: str, input_path: str, original_filename: str, extension: str) -> dict[str, str | int]:
    settings = get_settings()
    source = Path(input_path)
    validate_office_file(source, extension)

    work_dir = settings.tmp_dir / job_id
    out_dir = work_dir / "out"
    profile_dir = work_dir / "lo-profile"
    out_dir.mkdir(parents=True, exist_ok=True)
    profile_dir.mkdir(parents=True, exist_ok=True)

    started = int(time.time())
    write_job_meta(job_id, status="processing", started_at=started)

    pdf_filters = {
        "docx": "pdf:writer_pdf_Export",
        "xlsx": "pdf:calc_pdf_Export",
        "pptx": "pdf:impress_pdf_Export",
    }

    command = [
        settings.libreoffice_binary,
        "--headless",
        "--invisible",
        "--nodefault",
        "--nofirststartwizard",
        "--nolockcheck",
        "--norestore",
        f"-env:UserInstallation=file://{profile_dir.as_posix()}",
        "--convert-to",
        pdf_filters[extension],
        "--outdir",
        str(out_dir),
        str(source),
    ]

    env = os.environ.copy()
    env.update({"HOME": str(profile_dir), "TMPDIR": str(work_dir)})

    try:
        completed = subprocess.run(
            command,
            env=env,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            timeout=settings.conversion_timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ConversionError(f"LibreOffice timed out after {settings.conversion_timeout_seconds}s") from exc

    if completed.returncode != 0:
        stderr = (completed.stderr or completed.stdout or "unknown LibreOffice error").strip()
        raise ConversionError(stderr[:2000])

    produced = list(out_dir.glob("*.pdf"))
    if not produced:
        raise ConversionError("LibreOffice finished without producing a PDF")

    output_name = f"{job_id}.pdf"
    output_path = settings.output_dir / output_name
    shutil.move(str(produced[0]), output_path)

    result = {
        "job_id": job_id,
        "status": "completed",
        "filename": Path(original_filename).with_suffix(".pdf").name,
        "output_path": str(output_path),
        "size_bytes": output_path.stat().st_size,
        "duration_ms": int((time.time() - started) * 1000),
    }
    write_job_meta(job_id, **result)
    shutil.rmtree(work_dir, ignore_errors=True)
    return result


def conversion_job(job_id: str, input_path: str, original_filename: str, extension: str) -> dict[str, str | int]:
    try:
        return convert_to_pdf(job_id, input_path, original_filename, extension)
    except Exception as exc:
        write_job_meta(job_id, status="failed", error=str(exc)[:2000])
        raise
