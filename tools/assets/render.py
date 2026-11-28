"""Screenshot tools/assets pages (see make-art.ts) into docs/assets/*.png at their exact sizes."""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import glob, os, re
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(**chrome(), args=["--no-sandbox"])
    for f in sorted(glob.glob("/tmp/iom-art/*.html")):
        name = os.path.basename(f)[:-5]
        m = re.search(r"(\d+)x(\d+)$", name) or re.search(r"(\d+)$", name)
        w = int(m.group(1)); h = int(m.group(2)) if m.lastindex == 2 else w
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto("file://" + f); pg.wait_for_timeout(300)
        pg.screenshot(path=f"docs/assets/{name}.png"); pg.close(); print("docs/assets/" + name + ".png")
        if name.startswith("subreddit-"):
            # Reddit caps header images at a few hundred KB; a 256-colour palette keeps the red X.
            from PIL import Image
            Image.open(f"docs/assets/{name}.png").convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(f"docs/assets/{name}.png", optimize=True)
    b.close()
