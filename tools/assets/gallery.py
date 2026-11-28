"""Devpost gallery from a real playthrough (SHIP-5.2).

    npm run build && python3 tools/assets/gallery.py [YYYY-MM-DD]

Starts the local preview as if it were that UTC day (default 2026-12-09, judging day 1), plays one
loop in Chrome: pick the Old Captain's chart, walk to his chest, find it, bury a chest, chart it from
memory, Ink check, result, share sheet, plus the desktop hunt. Then lays the screenshots out as
1500 × 1000 slides in docs/assets/gallery-*.png. Every screen is the shipped client; nothing is mocked
except the preview's in-memory store.
"""
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
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 390, "height": 512}, device_scale_factor=2)
        pg.goto(BASE + "/splash.html"); pg.wait_for_timeout(1000); pg.screenshot(path=f"{SHOTS}/splash.png"); pg.close()

        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        logs = []
        pg.on("console", lambda m: logs.append(m.text) if m.type in ("error", "warning") and "GL Driver Message" not in m.text else None)
        btn = lambda n, exact=False: pg.get_by_role("button", name=n, exact=exact)
        pg.goto(BASE + "/game.html"); pg.wait_for_timeout(1000)
        btn("Skip").first.click(); pg.wait_for_timeout(800); pg.screenshot(path=f"{SHOTS}/dispatch.png")
        btn("Today’s island →").click(); pg.wait_for_timeout(900); pg.screenshot(path=f"{SHOTS}/pick.png")
        btn("Follow this chart").nth(2).click(); pg.wait_for_timeout(900)  # the Old Captain's card
        leg_found = 0
        for li, leg in enumerate(r["legs"]):
            for i, k in enumerate(leg):
                # Software WebGL renders slowly here; wait for each step to finish before the next key.
                pg.keyboard.press(k); pg.wait_for_timeout(450)
                if li == 0 and i == len(leg) - 6:
                    pg.screenshot(path=f"{SHOTS}/hunt.png")
            pg.wait_for_timeout(1500); pg.keyboard.press(" "); pg.wait_for_timeout(2000)
            if "Rate this chart" in pg.inner_text("main"):
                leg_found = li
                break
        pg.wait_for_timeout(1200); pg.screenshot(path=f"{SHOTS}/reveal.png")
        btn("True map").click(); pg.wait_for_timeout(500)
        btn("Bury your chest").click(); pg.wait_for_timeout(900)

        # The bury cursor starts at the dock and jumps to the next buryable tile; steer it to a spot
        # two tiles from the found chest, inside what the sailor uncovered.
        walked = [(r["dock"]["x"], r["dock"]["y"])]
        for k in [k for leg in r["legs"][: leg_found + 1] for k in leg]:
            x, y = walked[-1]; dx, dy = STEP[k]; walked.append((x + dx, y + dy))
        rad = {"clear": 4, "fog": 2}.get(mod, 3)
        seen = {(x + i, y + j) for (x, y) in walked for i in range(-rad, rad + 1) for j in range(-rad, rad + 1) if i * i + j * j <= rad * rad}
        marks = {(l["at"]["x"], l["at"]["y"]) for l in r["landmarks"]}
        dock = (r["dock"]["x"], r["dock"]["y"])
        ok = lambda t: t in seen and 0 <= t[0] < 40 and 0 <= t[1] < 40 and r["walk"][t[1] * 40 + t[0]] and t not in marks and t != dock

        def nudge(cur, k):
            dx, dy = STEP[k]
            for n in range(1, 40):
                t = (cur[0] + dx * n, cur[1] + dy * n)
                if not (0 <= t[0] < 40 and 0 <= t[1] < 40):
                    return cur
                if ok(t):
                    return t
            return cur

        c = r["chests"][leg_found]["at"]
        target, cur = (c["x"] + 2, c["y"] - 2), dock
        for _ in range(80):
            if cur == target:
                break
            moves = [(abs(nudge(cur, k)[0] - target[0]) + abs(nudge(cur, k)[1] - target[1]), k) for k in STEP if nudge(cur, k) != cur]
            if not moves:
                break
            _, k = min(moves); cur = nudge(cur, k); pg.keyboard.press(k); pg.wait_for_timeout(60)
        pg.wait_for_timeout(300); pg.screenshot(path=f"{SHOTS}/bury.png")
        pg.keyboard.press("Enter"); pg.wait_for_timeout(1200)

        # Chart from memory: the nearest landmarks, a path from the dock, the X.
        svg = pg.locator("svg[viewBox='0 0 400 400']").first
        bb = svg.bounding_box()
        tap = lambda x, y: pg.mouse.click(bb["x"] + (x + 0.5) / 40 * bb["width"], bb["y"] + (y + 0.5) / 40 * bb["height"])
        X = cur
        near = [l for l in sorted(r["landmarks"], key=lambda l: abs(l["at"]["x"] - c["x"]) + abs(l["at"]["y"] - c["y"]))
                if max(abs(l["at"]["x"] - X[0]), abs(l["at"]["y"] - X[1])) > 2][:4]
        for l in near:
            btn(NAMES[l["type"]], True).click(); pg.wait_for_timeout(150); tap(l["at"]["x"], l["at"]["y"]); pg.wait_for_timeout(200)
        btn("Path", True).click(); pg.wait_for_timeout(150)
        for x, y in [dock, (dock[0], X[1] + 6), (X[0] + 2, X[1] + 6), (X[0] + 2, X[1] + 2)]:
            tap(x, y); pg.wait_for_timeout(150)
        btn("X", True).click(); pg.wait_for_timeout(150); tap(*X); pg.wait_for_timeout(300)
        pg.screenshot(path=f"{SHOTS}/chart.png")
        btn("Submit chart").click(); pg.wait_for_timeout(3900); pg.screenshot(path=f"{SHOTS}/ink.png")
        btn("Continue").click(); pg.wait_for_timeout(1000); pg.screenshot(path=f"{SHOTS}/result.png")
        btn("Share my chart").click(); pg.wait_for_timeout(1200); pg.screenshot(path=f"{SHOTS}/share.png")
        if logs:
            raise RuntimeError(f"console messages during capture: {logs[:3]}")
        pg.close()

        pg = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=1.5)
        pg.goto(BASE + "/game.html"); pg.wait_for_timeout(1000)
        for n in ["Skip", "Today’s island →"]:
            if pg.get_by_role("button", name=n).count():
                pg.get_by_role("button", name=n).first.click(); pg.wait_for_timeout(800)
        pg.get_by_role("button", name="Follow this chart").first.click(); pg.wait_for_timeout(900)
        for k in r["legs"][0][:14]:
            pg.keyboard.press(k); pg.wait_for_timeout(450)
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


CSS = f"""
@font-face{{font-family:Fell;src:url(data:font/woff2;base64,{font('im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff2')})}}
@font-face{{font-family:Atk;font-weight:400;src:url(data:font/woff2;base64,{font('atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2')})}}
@font-face{{font-family:Atk;font-weight:700;src:url(data:font/woff2;base64,{font('atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2')})}}
html,body{{margin:0;width:1500px;height:1000px;overflow:hidden;background:radial-gradient(circle at 70% 30%,#1F4F68,#14202B 65%);color:#F3E6C8;font-family:Atk}}
h1{{font-family:Fell;font-weight:400;font-size:64px;line-height:1.05;margin:0}}
.gold{{color:#E8B341}} .muted{{color:#A9B4BF}}
.phone{{border-radius:28px;border:10px solid #0d161e;box-shadow:0 24px 60px rgba(0,0,0,.5);overflow:hidden;background:#14202B}}
.phone img{{display:block;width:100%}}
.cap{{font-family:Fell;font-size:30px;margin-top:18px;text-align:center}}
.num{{display:inline-flex;width:44px;height:44px;border-radius:50%;background:#E8B341;color:#14202B;font-family:Atk;font-weight:700;font-size:24px;align-items:center;justify-content:center;margin-right:10px;vertical-align:middle}}
ul{{margin:0;padding:0;list-style:none}} li{{font-size:27px;line-height:1.35;margin:0 0 20px}} li b{{color:#E8B341}}
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
        "gallery-1-loop": page(f"""<div style='padding:56px 70px'><h1>One island a day. <span class=gold>Trust a stranger’s map.</span></h1>
          <p class=muted style='font-size:28px;margin:14px 0 36px'>Pick a map another redditor drew from memory, walk the fog, and dig with three shovels.</p>
          {phones([("pick", "Pick a map", True), ("hunt", "Walk the fog", True), ("reveal", "Dig. Gold!", True)], 290)}</div>"""),
        "gallery-2-chart": page(f"""<div style='padding:56px 70px'><h1>Then bury yours, <span class=gold>and chart it from memory.</span></h1>
          <p class=muted style='font-size:28px;margin:14px 0 36px'>Ten stamps, a dotted path, one X. The Ink check grades your map on the spot.</p>
          {phones([("chart", "Chart it", True), ("ink", "Ink check", True), ("result", "Tomorrow’s island", True)], 290)}</div>"""),
        "gallery-3-tomorrow": page(f"""<div style='display:flex;gap:70px;align-items:center;padding:60px 90px;height:880px'>
          <div style='flex:1'><h1>Tomorrow, <span class=gold>see who found your chest.</span></h1>
          <ul style='margin-top:40px'>
            <li><b>Dispatch:</b> how many sailors tried your map, how many found it, salvage gold.</li>
            <li><b>True or Cursed:</b> players rate every map; good mapmakers climb Cartographer tiers and earn flair.</li>
            <li><b>Share as a comment</b> under the day’s thread, only after a confirm sheet.</li>
            <li><b>Crew goal:</b> enough finds turn tomorrow into Lantern night. The top reply names the next island.</li>
          </ul></div>
          {phones([("dispatch-top", "Dispatch", False), ("share", "Share sheet", False)], 300)}</div>"""),
        "gallery-4-desktop": page(f"""<div style='padding:56px 70px'><h1>On desktop, <span class=gold>the map sits beside the island.</span></h1>
          <p class=muted style='font-size:28px;margin:14px 0 30px'>Read and walk at the same time. Keyboard works end to end: arrows, Space to dig, M for the map.</p>
          <div class='phone' style='border-radius:16px;width:1240px;margin:0 auto'><img src='{img("wide")}'></div></div>"""),
        "gallery-5-fair": page(f"""<div style='display:flex;gap:80px;align-items:center;padding:60px 90px;height:880px'>
          <div style='width:430px'><div class='phone' style='border-radius:14px;border-width:6px'><img src='{img("splash")}'></div><div class='cap'>The post in the feed explains itself</div></div>
          <div style='flex:1'><h1>Fair, safe, <span class=gold>and made for Reddit.</span></h1>
          <ul style='margin-top:40px'>
            <li><b>The server decides.</b> Every step and dig is re-checked; the chest never reaches your device before the hunt ends.</li>
            <li><b>No free text, no freehand.</b> Maps are fixed stamps, a snapped path, one X and an optional phrase from a fixed list.</li>
            <li><b>Never empty.</b> The Old Captain’s honest-ish maps fill quiet days, clearly labelled.</li>
            <li><b>Gone in 30 days.</b> Player content expires; moderators get a review queue and a stats menu.</li>
          </ul></div></div>"""),
    }


def compose():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
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
    srv, init = start_preview()
    try:
        print("preview day", init["day"], "· Day", init["dayNumber"], "·", init["island"]["name"])
        capture(init)
    finally:
        srv.terminate(); srv.wait()
    if not CAPTURE_ONLY:
        crop_top("dispatch", 0.5)
        compose()
