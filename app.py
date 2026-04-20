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


def _safe_prefix(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "", value)


def _parse_timestamp(filename: str) -> str | None:
    match = re.match(r"^(\d{8}T\d{6}Z)-", filename)
    if not match:
        return None

    try:
        parsed = datetime.strptime(match.group(1), "%Y%m%dT%H%M%SZ")
    except ValueError:
        return None

    return parsed.replace(tzinfo=timezone.utc).isoformat()


def _save_base64_image(base64_data: str, output_path: Path) -> bool:
    try:
        encoded = base64_data.split(",", 1)[1] if "," in base64_data else base64_data
        image_data = base64.b64decode(encoded)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_data)
        return True
    except Exception as error:
        print(f"Failed to save image {output_path.name}: {error}")
        return False


def _load_base64_image(path: Path) -> str | None:
    if not path.exists():
        return None

    encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.get("/api/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


@app.get("/api/sessions")
def list_sessions():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    sessions: list[dict[str, object]] = []
    for json_path in DATA_DIR.glob("*.json"):
        try:
            content = json.loads(json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            continue

        file_prefix = _safe_prefix(json_path.stem)
        image_meta = content.get("imageMeta") or {}
        sessions.append(
            {
                "filePrefix": file_prefix,
                "projectName": content.get("projectName", "Untitled"),
                "notes": content.get("projectNotes", ""),
                "savedAt": _parse_timestamp(json_path.name) or content.get("savedAtUtc", ""),
                "annotationCount": len(content.get("annotations", [])),
                "imageName": image_meta.get("name", ""),
                "hasOriginalImage": (DATA_DIR / f"{file_prefix}-original.png").exists(),
                "hasAnnotatedImage": (DATA_DIR / f"{file_prefix}-annotated.png").exists(),
            }
        )

    sessions.sort(key=lambda session: session["savedAt"], reverse=True)
    return jsonify({"sessions": sessions}), 200


@app.get("/api/sessions/<file_prefix>")
def get_session(file_prefix: str):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    safe_prefix = _safe_prefix(file_prefix)
    json_path = DATA_DIR / f"{safe_prefix}.json"
    if not json_path.exists():
        return jsonify({"error": "Session not found."}), 404

    try:
        content = json.loads(json_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, IOError) as error:
        return jsonify({"error": f"Failed to load session: {error}"}), 500

    content["originalImage"] = _load_base64_image(DATA_DIR / f"{safe_prefix}-original.png")
    content["annotatedImage"] = _load_base64_image(DATA_DIR / f"{safe_prefix}-annotated.png")
    return jsonify(content), 200


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

    saved_files: list[str] = []

    original_image = payload.get("originalImage")
    if isinstance(original_image, str) and original_image:
        original_path = DATA_DIR / f"{file_prefix}-original.png"
        if _save_base64_image(original_image, original_path):
            saved_files.append(original_path.name)

    annotated_image = payload.get("annotatedImage")
    if isinstance(annotated_image, str) and annotated_image:
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
    json_path.write_text(json.dumps(document, indent=2, ensure_ascii=True), encoding="utf-8")
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
