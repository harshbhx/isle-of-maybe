"""Where Chrome lives, for the Playwright scripts in tools/ (QA, screenshots, art).

CHROME_PATH wins; otherwise the usual Linux, macOS and Windows install paths; otherwise nothing,
and Playwright uses its own Chromium (`python -m playwright install chromium`).
"""
import os

CANDIDATES = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def chrome() -> dict:
    """Keyword arguments for chromium.launch(): an executable_path when one is found."""
    path = os.environ.get("CHROME_PATH") or next((c for c in CANDIDATES if os.path.exists(c)), None)
    return {"executable_path": path} if path else {}
