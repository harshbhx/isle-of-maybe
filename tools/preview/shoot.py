"""Screenshots of the local preview at phone and desktop widths, plus console errors.

    python3 tools/preview/shoot.py game.html /tmp/shots [--click "Set sail"] ...

Needs the preview server running (npm run preview:local) and Playwright for Python.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import sys, json
from playwright.sync_api import sync_playwright

page_path, out = sys.argv[1], sys.argv[2]
steps = sys.argv[3:]
with sync_playwright() as p:
    b = p.chromium.launch(**chrome(), args=["--no-sandbox"])
    for name, w, h in [("phone", 390, 844), ("desktop", 1440, 900)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg = ctx.new_page()
        logs = []
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
        pg.goto(f"http://localhost:5180/{page_path}")
        pg.wait_for_timeout(700)
        i = 0
        while i < len(steps):
            act, arg = steps[i], steps[i + 1]
            if act == "--click":
                pg.get_by_role("button", name=arg).first.click()
            elif act == "--tap":
                x, y = arg.split(",")
                pg.mouse.click(int(x), int(y))
            elif act == "--key":
                pg.keyboard.press(arg)
            elif act == "--wait":
                pg.wait_for_timeout(int(arg))
            elif act == "--shot":
                pg.screenshot(path=f"{out}-{name}-{arg}.png", full_page=True)
            i += 2
            pg.wait_for_timeout(250)
        pg.screenshot(path=f"{out}-{name}.png", full_page=True)
        print(name, json.dumps(logs))
        ctx.close()
    b.close()
