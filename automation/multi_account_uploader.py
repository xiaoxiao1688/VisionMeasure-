from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
EXTERNAL_ACCOUNT_DIR = Path(r"D:\work\account")
DEFAULT_ACCOUNTS_PATH = EXTERNAL_ACCOUNT_DIR / "accounts.local.json"
DEFAULT_SITE_PATH = EXTERNAL_ACCOUNT_DIR / "site.local.json"
AUTH_DIR = BASE_DIR / ".auth"
RUN_LOG_PATH = BASE_DIR / "run-log.jsonl"


@dataclass
class Account:
    alias: str
    email: str
    password: str


@dataclass
class SiteConfig:
    login_url: str
    upload_url: str
    selectors: dict[str, str]
    timeouts: dict[str, int]


class ConfigError(RuntimeError):
    pass


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ConfigError(f"Invalid JSON in {path}: {error}") from error

    if not isinstance(payload, dict):
        raise ConfigError(f"Expected a JSON object in {path}.")

    return payload


def load_accounts(path: Path) -> list[Account]:
    payload = load_json(path)
    raw_accounts = payload.get("accounts")
    if not isinstance(raw_accounts, list) or not raw_accounts:
        raise ConfigError("`accounts` must be a non-empty list.")

    accounts: list[Account] = []
    for index, raw in enumerate(raw_accounts, start=1):
        if not isinstance(raw, dict):
            raise ConfigError(f"Account #{index} must be a JSON object.")

        alias = str(raw.get("alias") or "").strip()
        email = str(raw.get("email") or "").strip()
        password = str(raw.get("password") or "").strip()
        password_env = str(raw.get("password_env") or "").strip()

        if not alias:
            raise ConfigError(f"Account #{index} is missing `alias`.")
        if not email:
            raise ConfigError(f"Account `{alias}` is missing `email`.")
        if not password and password_env:
            password = str(os.getenv(password_env) or "").strip()
        if not password:
            raise ConfigError(
                f"Account `{alias}` is missing a password. Use `password` or `password_env`."
            )

        accounts.append(Account(alias=alias, email=email, password=password))

    return accounts


def load_site(path: Path) -> SiteConfig:
    payload = load_json(path)
    login_url = str(payload.get("login_url") or "").strip()
    upload_url = str(payload.get("upload_url") or "").strip()
    selectors = payload.get("selectors") or {}
    timeouts = payload.get("timeouts") or {}

    if not login_url:
        raise ConfigError("`login_url` is required.")
    if not upload_url:
        raise ConfigError("`upload_url` is required.")
    if not isinstance(selectors, dict):
        raise ConfigError("`selectors` must be a JSON object.")
    if not isinstance(timeouts, dict):
        raise ConfigError("`timeouts` must be a JSON object.")

    defaults = {
        "default_ms": 15000,
        "post_login_ms": 1000,
        "post_upload_ms": 1000,
    }

    normalized_timeouts: dict[str, int] = {}
    for key, fallback in defaults.items():
        value = timeouts.get(key, fallback)
        try:
            normalized_timeouts[key] = int(value)
        except (TypeError, ValueError) as error:
            raise ConfigError(f"Timeout `{key}` must be an integer.") from error

    return SiteConfig(
        login_url=login_url,
        upload_url=upload_url,
        selectors={str(key): str(value) for key, value in selectors.items() if value},
        timeouts=normalized_timeouts,
    )


def select_accounts(accounts: list[Account], requested_aliases: str) -> list[Account]:
    if requested_aliases.lower() == "all":
        return accounts

    requested = {item.strip() for item in requested_aliases.split(",") if item.strip()}
    selected = [account for account in accounts if account.alias in requested]
    missing = requested.difference({account.alias for account in selected})
    if missing:
        raise ConfigError(f"Unknown account aliases: {', '.join(sorted(missing))}")
    if not selected:
        raise ConfigError("No accounts selected.")
    return selected


def append_run_log(record: dict[str, Any]) -> None:
    RUN_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with RUN_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def wait_for_optional(page: Any, selector: str | None, timeout_ms: int) -> None:
    if not selector:
        return
    page.locator(selector).first.wait_for(state="visible", timeout=timeout_ms)


def is_selector_visible(page: Any, selector: str | None, timeout_ms: int) -> bool:
    if not selector:
        return False

    try:
        page.locator(selector).first.wait_for(state="visible", timeout=timeout_ms)
        return True
    except Exception:
        return False


def ensure_logged_in(page: Any, account: Account, site: SiteConfig) -> None:
    default_timeout = site.timeouts["default_ms"]
    selectors = site.selectors

    page.goto(site.login_url, wait_until="domcontentloaded")

    if is_selector_visible(page, selectors.get("logged_in_indicator"), 2000):
        return

    required = ("email", "password", "submit")
    missing = [name for name in required if not selectors.get(name)]
    if missing:
        raise ConfigError(
            "Missing login selectors in site.local.json: " + ", ".join(missing)
        )

    page.locator(selectors["email"]).first.fill(account.email)
    page.locator(selectors["password"]).first.fill(account.password)
    page.locator(selectors["submit"]).first.click()

    if selectors.get("logged_in_indicator"):
        wait_for_optional(
            page,
            selectors["logged_in_indicator"],
            timeout_ms=default_timeout,
        )
    else:
        time.sleep(site.timeouts["post_login_ms"] / 1000)


def upload_once(page: Any, account: Account, site: SiteConfig, file_path: Path) -> None:
    selectors = site.selectors
    default_timeout = site.timeouts["default_ms"]

    if not selectors.get("file_input"):
        raise ConfigError("Missing `file_input` selector in site.local.json.")

    page.goto(site.upload_url, wait_until="domcontentloaded")
    page.locator(selectors["file_input"]).first.set_input_files(str(file_path))

    if selectors.get("upload_submit"):
        page.locator(selectors["upload_submit"]).first.click()

    if selectors.get("upload_success"):
        wait_for_optional(
            page,
            selectors["upload_success"],
            timeout_ms=default_timeout,
        )
    else:
        time.sleep(site.timeouts["post_upload_ms"] / 1000)

    append_run_log(
        {
            "account": account.alias,
            "email": account.email,
            "file": str(file_path),
            "status": "uploaded",
            "savedAtUtc": datetime.now(timezone.utc).isoformat(),
        }
    )


def run_uploads(
    *,
    file_path: Path,
    accounts_path: Path,
    site_path: Path,
    requested_aliases: str,
    headless: bool,
) -> None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise RuntimeError(
            "Playwright is not installed. Run `pip install -r requirements-automation.txt` "
            "and `python -m playwright install chromium`."
        ) from error

    if not file_path.exists():
        raise ConfigError(f"Upload file not found: {file_path}")

    accounts = select_accounts(load_accounts(accounts_path), requested_aliases)
    site = load_site(site_path)
    AUTH_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        for account in accounts:
            profile_dir = AUTH_DIR / account.alias
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(profile_dir),
                headless=headless,
            )
            try:
                page = context.pages[0] if context.pages else context.new_page()
                ensure_logged_in(page, account, site)
                upload_once(page, account, site, file_path)
                print(f"[ok] {account.alias}: uploaded {file_path.name}")
            except Exception as error:
                append_run_log(
                    {
                        "account": account.alias,
                        "email": account.email,
                        "file": str(file_path),
                        "status": "failed",
                        "error": str(error),
                        "savedAtUtc": datetime.now(timezone.utc).isoformat(),
                    }
                )
                print(f"[failed] {account.alias}: {error}", file=sys.stderr)
            finally:
                context.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Switch between multiple accounts and upload the same file."
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to the file to upload.",
    )
    parser.add_argument(
        "--accounts",
        default=str(DEFAULT_ACCOUNTS_PATH),
        help="Path to accounts.local.json.",
    )
    parser.add_argument(
        "--site",
        default=str(DEFAULT_SITE_PATH),
        help="Path to site.local.json.",
    )
    parser.add_argument(
        "--account",
        default="all",
        help="Comma-separated aliases or `all`.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run without opening the browser window.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        run_uploads(
            file_path=Path(args.file).expanduser().resolve(),
            accounts_path=Path(args.accounts).expanduser().resolve(),
            site_path=Path(args.site).expanduser().resolve(),
            requested_aliases=args.account,
            headless=bool(args.headless),
        )
    except (ConfigError, RuntimeError) as error:
        print(error, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
