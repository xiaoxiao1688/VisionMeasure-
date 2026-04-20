from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

app = Flask(__name__, template_folder="templates", static_folder="static")


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return cleaned or "geodraft-session"


def _parse_timestamp(filename: str) -> str | None:
    match = re.match(r"^(\d{8}T\d{6}Z)-", filename)
    if match:
        ts_str = match.group(1)
        try:
            dt = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ")
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            return None
    return None


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.get("/api/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


@app.get("/api/sessions")
def list_sessions():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    sessions = []
    for filepath in DATA_DIR.glob("*.json"):
        try:
            content = json.loads(filepath.read_text(encoding="utf-8"))
            session = {
                "filename": filepath.name,
                "projectName": content.get("projectName", "Untitled"),
                "savedAt": _parse_timestamp(filepath.name) or content.get("savedAtUtc", ""),
                "annotationCount": len(content.get("annotations", [])),
                "imageName": content.get("imageMeta", {}).get("name", ""),
            }
            sessions.append(session)
        except (json.JSONDecodeError, IOError):
            continue

    sessions.sort(key=lambda s: s["savedAt"], reverse=True)
    return jsonify({"sessions": sessions}), 200


@app.get("/api/sessions/<filename>")
def get_session(filename: str):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    safe_filename = Path(filename).name
    if not safe_filename.endswith(".json"):
        return jsonify({"error": "Invalid session file."}), 400

    filepath = DATA_DIR / safe_filename
    if not filepath.exists():
        return jsonify({"error": "Session not found."}), 404

    try:
        content = json.loads(filepath.read_text(encoding="utf-8"))
        return jsonify(content), 200
    except (json.JSONDecodeError, IOError) as e:
        return jsonify({"error": f"Failed to load session: {e}"}), 500


@app.post("/api/annotations")
def save_annotations():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be valid JSON."}), 400

    annotations = payload.get("annotations", [])
    if not isinstance(annotations, list):
        return jsonify({"error": "`annotations` must be a list."}), 400

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    project_name = str(payload.get("projectName") or "GeoDraft")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = f"{timestamp}-{_slugify(project_name)}.json"
    output_path = DATA_DIR / filename

    document = {
        "projectName": project_name,
        "savedAtUtc": timestamp,
        "imageMeta": payload.get("imageMeta", {}),
        "annotations": annotations,
    }

    output_path.write_text(
        json.dumps(document, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )

    return (
        jsonify(
            {
                "message": "Annotations saved successfully.",
                "file": filename,
            }
        ),
        201,
    )


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
