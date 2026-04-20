# GeoDraft

GeoDraft is a local-first graphics utility prototype for image annotation and geometric measurement. The current scaffold focuses on a practical first slice instead of a toy algorithm demo: load a real image, draw rectangle annotations, inspect their dimensions, and persist the session through a Python backend.

## Stack

- HTML, CSS, JavaScript
- Python
- Flask

## Current Prototype Scope

- Load a local image into a canvas workspace
- Draw rectangle annotations directly on top of the image
- Measure distances with a line tool
- Capture polygon regions and compute area in image pixel space
- Review annotations from a sidebar list
- Save annotation sessions to local JSON files through `/api/annotations`

## Project Structure

```text
geodraft/
├── app.py
├── data/
├── README.md
├── requirements.txt
├── static/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
└── templates/
    └── index.html
```

## Local Setup

```powershell
cd D:\work\work_code\1\geodraft
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000`.

If you want a single-command local start:

```powershell
.\start.ps1
```

For Windows double-click or `cmd` startup:

```bat
start.bat
```

## Next Useful Milestones

1. Add polygon and line measurement tools.
2. Support project reopening by listing previously saved sessions from `data/`.
3. Add image calibration so pixel measurements can map to real-world units.
4. Introduce OpenCV-assisted edge snapping for semi-automatic annotation.
