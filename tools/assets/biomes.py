"""Biome shots from the real renderer (ADV-10.2).

    python3 tools/assets/biomes.py

Builds tools/assets/biomes, renders the first launch day of each biome, and writes
docs/assets/biome-<name>.webp plus a six-up docs/assets/biomes.webp.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import http.server, os, subprocess, threading, functools
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# First launch day of each biome (src/shared/biome.test.ts checks the fortnight has all six).
DAYS = {"tropical": "2026-12-05", "coral": "2026-12-06", "autumn": "2026-12-07",
        "mangrove": "2026-12-08", "frost": "2026-12-10", "volcanic": "2026-12-11"}
ZOOM = os.environ.get("ZOOM", "0.26")
subprocess.run(["npx", "vite", "build", "--config", "tools/assets/biomes/vite.config.mjs"], cwd=ROOT, check=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory="/tmp/iom-biomes")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 5192), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
shots = {}
with sync_playwright() as p:
    b = p.chromium.launch(**chrome(), args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for name, day in DAYS.items():
        pg = b.new_page(viewport={"width": 1200, "height": 800})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"http://127.0.0.1:5192/index.html?day={day}&zoom={ZOOM}")
        pg.wait_for_timeout(5000)
        img = Image.open(BytesIO(pg.screenshot())).convert("RGB")
        shots[name] = img
        img.resize((900, 600)).save(os.path.join(ROOT, f"docs/assets/biome-{name}.webp"), "WEBP", quality=70, method=6)
        print(name, day, "errors:", errs[:3])
        pg.close()
    b.close()
srv.shutdown()
order = ["tropical", "volcanic", "autumn", "mangrove", "frost", "coral"]
tile = (600, 400)
sheet = Image.new("RGB", (tile[0] * 3, tile[1] * 2))
for i, n in enumerate(order):
    sheet.paste(shots[n].resize(tile), ((i % 3) * tile[0], (i // 3) * tile[1]))
sheet.save(os.path.join(ROOT, "docs/assets/biomes.webp"), "WEBP", quality=70, method=6)
print("biomes.webp", os.path.getsize(os.path.join(ROOT, "docs/assets/biomes.webp")) // 1024, "KB")
