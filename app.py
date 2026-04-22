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
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.jinja_env.auto_reload = True

IMAGE_MIME_TO_SUFFIX = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/x-ms-bmp": ".bmp",
}

IMAGE_SUFFIX_TO_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}


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


def _get_data_url_parts(base64_data: str) -> tuple[str | None, str]:
    if base64_data.startswith("data:") and "," in base64_data:
        header, encoded = base64_data.split(",", 1)
        mime_type = header[5:].split(";", 1)[0].lower()
        return mime_type, encoded

    return None, base64_data


def _get_suffix_for_base64_image(base64_data: str, default_suffix: str = ".png") -> str:
    mime_type, _ = _get_data_url_parts(base64_data)
    return IMAGE_MIME_TO_SUFFIX.get(mime_type or "", default_suffix)


def _save_base64_image(base64_data: str, output_path: Path) -> bool:
    try:
        _, encoded = _get_data_url_parts(base64_data)
        image_data = base64.b64decode(encoded)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_data)
        return True
    except Exception as error:
        print(f"Failed to save image {output_path.name}: {error}")
        return False


def _load_base64_image(path: Path | None) -> str | None:
    if not path or not path.exists():
        return None

    encoded = base64.b64encode(path.read_bytes()).decode("utf-8")
    mime_type = IMAGE_SUFFIX_TO_MIME.get(path.suffix.lower(), "application/octet-stream")
    return f"data:{mime_type};base64,{encoded}"


def _find_saved_image(file_prefix: str, suffix: str) -> Path | None:
    for extension in (".png", ".jpg", ".jpeg", ".webp", ".bmp"):
        candidate = DATA_DIR / f"{file_prefix}{suffix}{extension}"
        if candidate.exists():
            return candidate

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
                "imageTags": content.get("imageTags", []),
                "exportFilename": content.get("exportFilename", ""),
                "hasOriginalImage": _find_saved_image(file_prefix, "-original") is not None,
                "hasAnnotatedImage": _find_saved_image(file_prefix, "-annotated") is not None,
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

    content["originalImage"] = _load_base64_image(_find_saved_image(safe_prefix, "-original"))
    content["annotatedImage"] = _load_base64_image(_find_saved_image(safe_prefix, "-annotated"))
    return jsonify(content), 200


@app.delete("/api/sessions/<file_prefix>")
def delete_session(file_prefix: str):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    safe_prefix = _safe_prefix(file_prefix)
    if not safe_prefix:
        return jsonify({"error": "Invalid session id."}), 400

    targets = [DATA_DIR / f"{safe_prefix}.json"]
    for suffix in ("-original", "-annotated"):
        for extension in (".png", ".jpg", ".jpeg", ".webp", ".bmp"):
            targets.append(DATA_DIR / f"{safe_prefix}{suffix}{extension}")

    deleted_files: list[str] = []
    for target in targets:
        if target.exists():
            try:
                target.unlink()
                deleted_files.append(target.name)
            except OSError as error:
                return jsonify({"error": f"Failed to delete {target.name}: {error}"}), 500

    if not deleted_files:
        return jsonify({"error": "Session not found."}), 404

    return jsonify({"message": "Session deleted successfully.", "deletedFiles": deleted_files}), 200


@app.post("/api/annotations")
def save_annotations():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be valid JSON."}), 400

    annotations = payload.get("annotations", [])
    if not isinstance(annotations, list):
        return jsonify({"error": "`annotations` must be a list."}), 400

    image_tags = payload.get("imageTags", [])
    if not isinstance(image_tags, list):
        return jsonify({"error": "`imageTags` must be a list."}), 400

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    project_name = str(payload.get("projectName") or "GeoDraft")
    project_notes = str(payload.get("projectNotes") or "")
    export_filename = str(payload.get("exportFilename") or "")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file_prefix = f"{timestamp}-{_slugify(project_name)}"

    saved_files: list[str] = []

    original_image = payload.get("originalImage")
    if isinstance(original_image, str) and original_image:
        original_path = DATA_DIR / f"{file_prefix}-original{_get_suffix_for_base64_image(original_image)}"
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
        "exportFilename": export_filename,
        "imageTags": image_tags,
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
    app.run(debug=False, use_reloader=False, host="127.0.0.1", port=5000)
