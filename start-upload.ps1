param(
    [Parameter(Mandatory = $true)]
    [string]$File,
    [string]$Account = "all",
    [switch]$Headless
)

$python = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = "python"
}

$args = @(
    "automation\multi_account_uploader.py",
    "--file",
    $File,
    "--account",
    $Account
)

if ($Headless) {
    $args += "--headless"
}

& $python @args
