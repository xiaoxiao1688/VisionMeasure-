$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  py -m venv .venv
}

& ".\.venv\Scripts\python.exe" -m pip show Flask *> $null
if ($LASTEXITCODE -ne 0) {
  & ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
}

& ".\.venv\Scripts\python.exe" app.py
