"""Key art and the find GIF from the real renderer (ADV-9.6).

    python3 tools/assets/scene.py

Builds tools/assets/scene (the island, the explorer and the found-chest cinematic), serves it,
and writes src/client/assets/keyart.webp and docs/assets/gallery-0-find.gif.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import http.server, os, subprocess, threading, functools
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
subprocess.run(["npx", "vite", "build", "--config", "tools/assets/scene/vite.config.mjs"], cwd=ROOT, check=True)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory="/tmp/iom-scene")
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 5191), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
frames = []
times = []
with sync_playwright() as p:
    b = p.chromium.launch(**chrome(), args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1200, "height": 800})
    import time
    t0 = time.time()
    pg.goto("http://127.0.0.1:5191/index.html"); pg.wait_for_timeout(900)
    for i in range(30):
        pg.wait_for_timeout(90)
        frames.append(Image.open(BytesIO(pg.screenshot())).convert("RGB")); times.append(time.time() - t0)
    b.close()
srv.shutdown()
# The best moment: coins in the air, about 2.8 s after load (the chest opens at 0.9 s + 0.6 s).
best = min(range(len(frames)), key=lambda i: abs(times[i] - 2.8))
key = frames[best].crop((150, 0, 1200, 800)).resize((900, 686))
key.save(os.path.join(ROOT, "src/client/assets/keyart.webp"), "WEBP", quality=66, method=6)
start = min(range(len(frames)), key=lambda i: abs(times[i] - 1.6))
gif = [f.resize((750, 500)).quantize(colors=96, method=Image.Quantize.MEDIANCUT) for f in frames[start:start + 20]]
out = os.path.join(ROOT, "docs/assets/gallery-0-find.gif")
gif[0].save(out, save_all=True, append_images=gif[1:], duration=110, loop=0, optimize=True)
print("keyart.webp", os.path.getsize(os.path.join(ROOT, "src/client/assets/keyart.webp")) // 1024, "KB;", "gallery-0-find.gif", len(gif), "frames", os.path.getsize(out) // 1024, "KB")
