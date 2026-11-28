"""Devpost gallery from a real playthrough (SHIP-5.2).

    npm run build && python3 tools/assets/gallery.py [YYYY-MM-DD]

Starts the local preview as if it were that UTC day (default 2026-12-09, judging day 1), plays one
loop in Chrome: pick the Old Captain's chart, walk to his chest, find it, bury a chest, chart it from
memory, Ink check, result, share sheet, plus the desktop hunt. Then lays the screenshots out as
1500 × 1000 slides in docs/assets/gallery-*.png. Every screen is the shipped client; nothing is mocked
except the preview's in-memory store.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import base64, json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
DAY = ARGS[0] if ARGS else "2026-12-09"
CAPTURE_ONLY = "--capture-only" in sys.argv  # screenshots in /tmp/iom-gallery, no slides
BASE = "http://localhost:5180"
SHOTS = "/tmp/iom-gallery"
os.makedirs(SHOTS, exist_ok=True)
NAMES = {"palm": "Palm", "twinPalms": "Twin palms", "boulder": "Boulder", "skullRock": "Skull rock", "hut": "Hut",
         "wreck": "Wreck", "well": "Well", "statue": "Statue", "campfire": "Campfire", "cave": "Cave"}
STEP = {"ArrowUp": (0, -1), "ArrowDown": (0, 1), "ArrowLeft": (-1, 0), "ArrowRight": (1, 0)}
FRAMES = {"hunt": [], "chart": []}  # phone frames for the animated GIFs


def start_preview():
    env = dict(os.environ, PREVIEW_DAY=DAY, PREVIEW_ANON="0")
    p = subprocess.Popen(["node", "--experimental-strip-types", "--no-warnings", "tools/preview/server.ts"], cwd=ROOT, env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            return p, json.loads(urllib.request.urlopen(BASE + "/api/init", timeout=1).read())
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("preview did not start")


def capture(init):
    seed, mod = init["island"]["seed"], init["island"]["modifier"]
    r = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "--no-warnings", "tools/assets/captain-route.ts", seed, mod], cwd=ROOT))
    with sync_playwright() as p:
        b = p.chromium.launch(**chrome(), args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 390, "height": 512}, device_scale_factor=2)
        pg.goto(BASE + "/splash.html"); pg.wait_for_timeout(1000); pg.screenshot(path=f"{SHOTS}/splash.png"); pg.close()

        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg.add_init_script("localStorage.setItem('iom:quality', 'fixed')")
        logs = []
        pg.on("console", lambda m: logs.append(m.text) if m.type in ("error", "warning") and "GL Driver Message" not in m.text else None)
        btn = lambda n, exact=False: pg.get_by_role("button", name=n, exact=exact)

        def grab(name):
            from io import BytesIO
            from PIL import Image
            FRAMES[name].append(Image.open(BytesIO(pg.screenshot())).convert("RGB").resize((300, 650)))
        pg.goto(BASE + "/game.html"); pg.wait_for_timeout(1000)
        btn("Skip").first.click(); pg.wait_for_timeout(800); pg.screenshot(path=f"{SHOTS}/dispatch.png")
        btn("Today’s island →").click(); pg.wait_for_timeout(900); pg.screenshot(path=f"{SHOTS}/pick.png")
        btn("Follow this chart").nth(2).click(); pg.wait_for_timeout(6000)  # the Old Captain's card
        # The 3D hunt (ADV-3): hold keys to walk and run, then three digs and the ending on the island.
        grab("hunt")
        for k, ms in [("ArrowUp", 1800), ("ArrowLeft", 1200), ("ArrowUp", 1500), ("ArrowRight", 900)]:
            pg.keyboard.down(k)
            for _ in range(ms // 300):
                pg.wait_for_timeout(300); grab("hunt")
            pg.keyboard.up(k)
            if k == "ArrowUp" and not os.path.exists(f"{SHOTS}/hunt-taken"):
                # The first stretch, still near the dock where the island is open and readable.
                pg.screenshot(path=f"{SHOTS}/hunt.png"); open(f"{SHOTS}/hunt-taken", "w").close()
        for _ in range(3):
            btn("Dig", True).click()
            for _ in range(6):
                pg.wait_for_timeout(300); grab("hunt")
        for _ in range(8):
            pg.wait_for_timeout(350); grab("hunt")
        pg.wait_for_timeout(1500); pg.screenshot(path=f"{SHOTS}/reveal.png")
        btn("True map").click(); pg.wait_for_timeout(500)
        btn("Bury your chest").click(); pg.wait_for_timeout(2500)
        dock = (r["dock"]["x"], r["dock"]["y"])
        for k in ["ArrowUp", "ArrowUp", "ArrowLeft"]:
            pg.keyboard.press(k); pg.wait_for_timeout(120)
        pg.wait_for_timeout(400); pg.screenshot(path=f"{SHOTS}/bury.png")
        pg.keyboard.press("Enter"); pg.wait_for_timeout(1200)
        c = {"x": dock[0] - 1, "y": dock[1] - 4}
        cur = (c["x"], c["y"])

        # Chart from memory: the nearest landmarks, a path from the dock, the X.
        svg = pg.locator("svg[viewBox='0 0 400 400']").first
        bb = svg.bounding_box()
        tap = lambda x, y: pg.mouse.click(bb["x"] + (x + 0.5) / 40 * bb["width"], bb["y"] + (y + 0.5) / 40 * bb["height"])
        X = cur
        near = [l for l in sorted(r["landmarks"], key=lambda l: abs(l["at"]["x"] - c["x"]) + abs(l["at"]["y"] - c["y"]))
                if max(abs(l["at"]["x"] - X[0]), abs(l["at"]["y"] - X[1])) > 2][:4]
        grab("chart")
        for l in near:
            btn(NAMES[l["type"]], True).click(); pg.wait_for_timeout(150); tap(l["at"]["x"], l["at"]["y"]); pg.wait_for_timeout(200); grab("chart")
        btn("Path", True).click(); pg.wait_for_timeout(150)
        for x, y in [dock, (dock[0], X[1] + 6), (X[0] + 2, X[1] + 6), (X[0] + 2, X[1] + 2)]:
            tap(x, y); pg.wait_for_timeout(150); grab("chart")
        btn("X", True).click(); pg.wait_for_timeout(150); tap(*X); pg.wait_for_timeout(300)
        grab("chart"); grab("chart")
        pg.screenshot(path=f"{SHOTS}/chart.png")
        btn("Submit chart").click()
        for _ in range(14):
            pg.wait_for_timeout(260); grab("chart")
        pg.wait_for_timeout(300); pg.screenshot(path=f"{SHOTS}/ink.png")
        btn("Continue").click(); pg.wait_for_timeout(1000); pg.screenshot(path=f"{SHOTS}/result.png")
        btn("Share my chart").click(); pg.wait_for_timeout(1200); pg.screenshot(path=f"{SHOTS}/share.png")
        if logs:
            raise RuntimeError(f"console messages during capture: {logs[:3]}")
        pg.close()

        pg = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1.5)
        pg.add_init_script("localStorage.setItem('iom:quality', 'fixed')")
        pg.goto(BASE + "/game.html"); pg.wait_for_timeout(1000)
        for n in ["Skip", "Today’s island →"]:
            if pg.get_by_role("button", name=n).count():
                pg.get_by_role("button", name=n).first.click(); pg.wait_for_timeout(800)
        pg.get_by_role("button", name="Follow this chart").first.click(); pg.wait_for_timeout(6000)
        pg.keyboard.down("ArrowUp"); pg.wait_for_timeout(2500); pg.keyboard.up("ArrowUp")
        pg.wait_for_timeout(800); pg.screenshot(path=f"{SHOTS}/wide.png"); pg.close()
        b.close()


def crop_top(name, keep):
    """A copy of a phone shot cut to its top part, for screens that are mostly empty below."""
    from PIL import Image
    im = Image.open(f"{SHOTS}/{name}.png")
    im.crop((0, 0, im.width, int(im.height * keep))).save(f"{SHOTS}/{name}-top.png")


def img(name):
    return "data:image/png;base64," + base64.b64encode(open(f"{SHOTS}/{name}.png", "rb").read()).decode()


def font(path):
    return base64.b64encode(open(os.path.join(ROOT, "node_modules/@fontsource", path), "rb").read()).decode()


WAVES = "data:image/svg+xml;base64," + base64.b64encode(open(os.path.join(ROOT, "src/client/assets/waves.svg"), "rb").read()).decode()
CSS = f"""
@font-face{{font-family:Fell;src:url(data:font/woff2;base64,{font('im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2')})}}
@font-face{{font-family:Atk;font-weight:400;src:url(data:font/woff2;base64,{font('bricolage-grotesque/files/bricolage-grotesque-latin-400-normal.woff2')})}}
@font-face{{font-family:Fra;font-weight:700;src:url(data:font/woff2;base64,{font('fraunces/files/fraunces-latin-700-normal.woff2')})}}
@font-face{{font-family:Atk;font-weight:700;src:url(data:font/woff2;base64,{font('bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2')})}}
html,body{{margin:0;width:1500px;height:1000px;overflow:hidden;background:#0A6468 url({WAVES});background-size:150px 75px;color:#FFF7E8;font-family:Atk}}
h1{{font-family:Fra;font-weight:700;letter-spacing:-0.01em;font-size:58px;line-height:1.08;margin:0;max-width:32ch}}
.lead{{color:#C8EEE7;font-size:28px;line-height:1.4;margin:16px 0 34px;max-width:52ch}}
.phone{{border-radius:26px;border:9px solid #08575C;box-shadow:0 10px 0 rgba(4,52,56,.45);overflow:hidden;background:#0A6468}}
.phone img{{display:block;width:100%}}
.cap{{font-family:Fra;font-weight:700;font-size:28px;margin-top:18px;text-align:center;color:#FFF7E8}}
.num{{display:inline-flex;width:42px;height:42px;border-radius:50%;background:#FFB21E;color:#2B1D12;font-family:Atk;font-weight:700;font-size:23px;align-items:center;justify-content:center;margin-right:10px;vertical-align:middle}}
.paper{{background:#FFF4DC;color:#2B1D12;border-radius:8px;box-shadow:0 8px 0 rgba(4,52,56,.4);padding:34px 38px}}
ul{{margin:0;padding:0;list-style:none}} li{{font-size:26px;line-height:1.38;margin:0 0 18px}} li b{{color:#B8233F}}
"""


def page(body):
    return f"<!doctype html><meta charset='utf-8'><style>{CSS}</style>{body}"


def phones(items, w=300):
    cells = "".join(
        f"<div style='width:{w}px'><div class='phone'><img src='{img(n)}'></div><div class='cap'>{'<span class=num>' + str(i + 1) + '</span>' if num else ''}{cap}</div></div>"
        for i, (n, cap, num) in enumerate(items))
    return f"<div style='display:flex;gap:44px;justify-content:center;align-items:flex-start'>{cells}</div>"


def slides():
    return {
        "gallery-1-loop": page(f"""<div style='padding:56px 70px'><h1>A new 3D island every day, and a stranger’s map to it</h1>
          <p class=lead>Pick a map another redditor drew from memory, then walk and run before the tide comes in. Dig with three shovels.</p>
          {phones([("pick", "Pick a map", True), ("hunt", "Walk the island", True), ("reveal", "Dig", True)], 280)}</div>"""),
        "gallery-2-chart": page(f"""<div style='padding:56px 70px'><h1>Then bury yours and chart it from memory</h1>
          <p class=lead>Ten stamps, a dotted path, one X, on paper. The Ink check lays your map over the real island and grades it.</p>
          {phones([("chart", "Chart it", True), ("ink", "Ink check", True), ("result", "Tomorrow’s island", True)], 280)}</div>"""),
        "gallery-3-tomorrow": page(f"""<div style='display:flex;gap:60px;align-items:center;padding:60px 80px;height:880px'>
          <div class=paper style='flex:1'><h1 style='color:#2B1D12;font-size:52px'>Tomorrow, see who found your chest</h1>
          <ul style='margin-top:30px'>
            <li><b>Dispatch:</b> how many sailors tried your map, how many found it, and the salvage gold.</li>
            <li><b>True or Cursed:</b> players rate every map; good mapmakers climb Cartographer tiers and earn flair.</li>
            <li><b>Share as a comment</b> under the day’s thread, only after a confirm sheet.</li>
            <li><b>Crew goal:</b> enough finds turn tomorrow into Lantern night. The top reply names the next island.</li>
          </ul></div>
          {phones([("dispatch-top", "Dispatch", False), ("share", "Share sheet", False)], 290)}</div>"""),
        "gallery-4-desktop": page(f"""<div style='padding:56px 70px'><h1>On desktop the paper map sits beside the island</h1>
          <p class=lead style='margin-bottom:26px'>Read and walk at the same time. WASD or arrows walk, Shift runs, Space digs, M shows the map.</p>
          <div class='phone' style='border-radius:16px;width:1180px;margin:0 auto'><img src='{img("wide")}'></div></div>"""),
        "gallery-5-fair": page(f"""<div style='display:flex;gap:70px;align-items:center;padding:60px 80px;height:880px'>
          <div style='width:410px'><div class='phone' style='border-radius:14px;border-width:6px'><img src='{img("splash")}'></div><div class='cap'>The post explains itself</div></div>
          <div class=paper style='flex:1'><h1 style='color:#2B1D12;font-size:52px'>Fair, safe and made for a subreddit</h1>
          <ul style='margin-top:30px'>
            <li><b>The server decides.</b> Every step and dig is re-checked; the chest never reaches your device before the hunt ends.</li>
            <li><b>No free text, no freehand.</b> Maps are fixed stamps, a snapped path, one X and an optional phrase from a fixed list.</li>
            <li><b>Never empty.</b> The Old Captain’s honest-ish maps fill quiet days, clearly labelled.</li>
            <li><b>Gone in 30 days.</b> Player content expires; moderators get a review queue and a stats menu.</li>
          </ul></div></div>"""),
    }


GIFS = {
    "gallery-0-hunt": ("hunt", "Beat the tide", "Walk and run a new 3D island with a stranger’s map. The tide rises, quicksand waits, and you have three shovels."),
    "gallery-0-chart": ("chart", "Chart it from memory", "Stamps, a dotted path and one X on paper. Then the Ink check lays your map over the real island."),
}


def make_gifs():
    """900 × 600 GIFs: a caption on the lagoon and the phone frames playing beside it (< 5 MB each)."""
    from PIL import Image
    with sync_playwright() as p:
        b = p.chromium.launch(**chrome(), args=["--no-sandbox"])
        for name, (key, title, lead) in GIFS.items():
            frames = FRAMES[key]
            if not frames:
                continue
            html = page(f"""<div style='width:900px;height:600px;position:relative'>
              <div style='position:absolute;left:46px;top:70px;width:480px'><h1 style='font-size:46px'>{title}</h1><p class=lead style='font-size:22px'>{lead}</p>
              <div style='display:flex;align-items:center;gap:12px;margin-top:30px'><span style='font-family:Fra;font-weight:700;font-size:30px'>Isle of Maybe</span></div></div>
              <div class='phone' style='position:absolute;left:570px;top:24px;width:262px;height:550px;border-width:8px'></div></div>""").replace("width:1500px;height:1000px", "width:900px;height:600px")
            f = f"{SHOTS}/{name}.html"
            open(f, "w").write(html)
            pg = b.new_page(viewport={"width": 900, "height": 600})
            pg.goto("file://" + f); pg.wait_for_timeout(300)
            bg = f"{SHOTS}/{name}-bg.png"
            pg.screenshot(path=bg); pg.close()
            base = Image.open(bg).convert("RGB")
            out = []
            for fr in frames:
                im = base.copy()
                im.paste(fr.resize((262, 568)).crop((0, 9, 262, 559)), (578, 32))
                out.append(im)
            out += [out[-1]] * 6  # hold the last frame before the loop restarts
            pal = out[len(out) // 2].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
            q = [o.quantize(palette=pal, dither=Image.Dither.NONE) for o in out]
            path = os.path.join(ROOT, f"docs/assets/{name}.gif")
            q[0].save(path, save_all=True, append_images=q[1:], duration=170, loop=0, optimize=True)
            print(f"docs/assets/{name}.gif", len(q), "frames", os.path.getsize(path) // 1024, "KB")
        b.close()


def compose():
    with sync_playwright() as p:
        b = p.chromium.launch(**chrome(), args=["--no-sandbox"])
        for name, html in slides().items():
            f = f"{SHOTS}/{name}.html"
            open(f, "w").write(html)
            pg = b.new_page(viewport={"width": 1500, "height": 1000})
            pg.goto("file://" + f); pg.wait_for_timeout(400)
            out = os.path.join(ROOT, f"docs/assets/{name}.png")
            pg.screenshot(path=out); pg.close()
            # Truecolor keeps the gradients smooth; Devpost allows 5 MB per image.
            print(f"docs/assets/{name}.png", os.path.getsize(out) // 1024, "KB")
        b.close()


if __name__ == "__main__":
    if os.path.exists(f"{SHOTS}/hunt-taken"):
        os.remove(f"{SHOTS}/hunt-taken")
    srv, init = start_preview()
    try:
        print("preview day", init["day"], "· Day", init["dayNumber"], "·", init["island"]["name"])
        capture(init)
    finally:
        srv.terminate(); srv.wait()
    if not CAPTURE_ONLY:
        crop_top("dispatch", 0.5)
        compose()
        make_gifs()
