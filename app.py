from __future__ import annotations

import base64
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


def _save_base64_image(base64_data: str, output_path: Path) -> bool:
    try:
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]

        image_data = base64.b64decode(base64_data)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_data)
        return True
    except Exception as e:
        print(f"Failed to save image: {e}")
        return False


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
    json_files = list(DATA_DIR.glob("*.json"))

    for json_path in json_files:
        try:
            content = json.loads(json_path.read_text(encoding="utf-8"))
            file_prefix = json_path.stem

            original_image = DATA_DIR / f"{file_prefix}-original.png"
            annotated_image = DATA_DIR / f"{file_prefix}-annotated.png"

            has_original = original_image.exists()
            has_annotated = annotated_image.exists()

            session = {
                "filePrefix": file_prefix,
                "projectName": content.get("projectName", "Untitled"),
                "notes": content.get("projectNotes", ""),
                "savedAt": _parse_timestamp(json_path.name) or content.get("savedAtUtc", ""),
                "annotationCount": len(content.get("annotations", [])),
                "imageName": content.get("imageMeta", {}).get("name", ""),
                "hasOriginalImage": has_original,
                "hasAnnotatedImage": has_annotated,
            }
            sessions.append(session)
        except (json.JSONDecodeError, IOError):
            continue

    sessions.sort(key=lambda s: s["savedAt"], reverse=True)
    return jsonify({"sessions": sessions}), 200


@app.get("/api/sessions/<file_prefix>")
def get_session(file_prefix: str):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    safe_prefix = Path(file_prefix).name
    json_path = DATA_DIR / f"{safe_prefix}.json"

    if not json_path.exists():
        return jsonify({"error": "Session not found."}), 404

    try:
        content = json.loads(json_path.read_text(encoding="utf-8"))

        annotated_image_path = DATA_DIR / f"{safe_prefix}-annotated.png"
        if annotated_image_path.exists():
            try:
                image_data = annotated_image_path.read_bytes()
                content["annotatedImage"] = "data:image/png;base64," + base64.b64encode(image_data).decode("utf-8")
            except Exception:
                pass

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
    project_notes = str(payload.get("projectNotes") or "")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file_prefix = f"{timestamp}-{_slugify(project_name)}"

    original_image = payload.get("originalImage")
    annotated_image = payload.get("annotatedImage")

    saved_files = []

    if original_image:
        original_path = DATA_DIR / f"{file_prefix}-original.png"
        if _save_base64_image(original_image, original_path):
            saved_files.append(original_path.name)

    if annotated_image:
        annotated_path = DATA_DIR / f"{file_prefix}-annotated.png"
        if _save_base64_image(annotated_image, annotated_path):
            saved_files.append(annotated_path.name)

    document = {
        "projectName": project_name,
        "projectNotes": project_notes,
        "savedAtUtc": timestamp,
        "imageMeta": payload.get("imageMeta", {}),
        "annotations": annotations,
    }

    json_path = DATA_DIR / f"{file_prefix}.json"
    json_path.write_text(
        json.dumps(document, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    saved_files.append(json_path.name)

    return (
        jsonify(
            {
                "message": "Annotations saved successfully.",
                "filePrefix": file_prefix,
                "savedFiles": saved_files,
            }
        ),
        201,
    )


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
