import json
import time
from pathlib import Path
from typing import Any

from .settings import get_settings


def job_meta_path(job_id: str) -> Path:
    return get_settings().job_dir / f"{job_id}.json"


def write_job_meta(job_id: str, **updates: Any) -> dict[str, Any]:
    path = job_meta_path(job_id)
    current: dict[str, Any] = {}
    if path.exists():
        current = json.loads(path.read_text(encoding="utf-8"))
    current.update(updates)
    current["updated_at"] = int(time.time())
    path.write_text(json.dumps(current, ensure_ascii=True, indent=2), encoding="utf-8")
    return current


def read_job_meta(job_id: str) -> dict[str, Any] | None:
    path = job_meta_path(job_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
