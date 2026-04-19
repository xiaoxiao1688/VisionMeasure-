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


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.get("/api/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


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
    app.run(debug=True)
