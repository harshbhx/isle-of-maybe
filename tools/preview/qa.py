"""Automated part of the QA matrix and break tests (docs/08-TESTING.md, SHIP-4.1).

    npm run build && python3 tools/preview/qa.py [report.md]

Starts the local preview itself (logged in, then logged out), drives Chrome headlessly and hits the
API directly. Prints a PASS/FAIL table; anything that needs a real phone or Reddit is listed as manual.
"""
import json, os, re, subprocess, sys, time, glob, urllib.request
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = "http://localhost:5180"
rows = []

def check(rid, name, fn):
    try:
        ok, note = fn()
    except Exception as e:  # a crash is a failure with its message
        ok, note = False, f"{type(e).__name__}: {str(e)[:120]}"
    rows.append((rid, name, "PASS" if ok else "FAIL", note))
    print(("PASS " if ok else "FAIL ") + rid, name, note)

def server(anon=False):
    env = dict(os.environ, PREVIEW_ANON="1" if anon else "0")
    p = subprocess.Popen(["node", "--experimental-strip-types", "--no-warnings", "tools/preview/server.ts"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE + "/api/init", timeout=1); return p
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("preview did not start")

def api(method, path, body=None):
    req = urllib.request.Request(BASE + "/api" + path, method=method, data=None if body is None else json.dumps(body).encode(), headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")

# ---------- static scroll-trap checks (§2) ----------
def splash_chunk():
    html = open(os.path.join(ROOT, "dist/client/splash.html")).read()
    srcs = re.findall(r'src="/?([^"]+\.js)"', html)
    return "".join(open(os.path.join(ROOT, "dist/client", s)).read() for s in srcs if "platform" not in s), html

def css():
    return "".join(open(f).read() for f in glob.glob(os.path.join(ROOT, "dist/client/*.css")))

def s2_touch():
    js, _ = splash_chunk(); c = css()
    bad = [p for p in ["touch-action:none", "touchAction", "overscroll-behavior:none", "overscrollBehavior"] if p in js or p.replace(" ", "") in c]
    return not bad, "none found" if not bad else f"found {bad}"

def s2_prevent():
    js, _ = splash_chunk()
    return "preventDefault" not in js and "<canvas" not in js and "getContext" not in js, "no preventDefault/canvas in the splash entry"

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])

    def page(w=390, h=844, reduced=False):
        pg = browser.new_page(viewport={"width": w, "height": h}, reduced_motion="reduce" if reduced else "no-preference")
        pg.logs = []
        # Headless Chrome's software WebGL reports its own driver stalls ("GL Driver Message"); those come
        # from the browser, not the app, and never happen with a real GPU, so they don't count.
        pg.on("console", lambda m: pg.logs.append(m.text) if m.type in ("error", "warning") and "GL Driver Message" not in m.text else None)
        pg.on("pageerror", lambda e: pg.logs.append(str(e)))
        return pg

    def btn(pg, name, exact=False):
        return pg.get_by_role("button", name=name, exact=exact)

    def to_pick(pg):
        pg.goto(BASE + "/game.html"); pg.wait_for_timeout(900)
        if btn(pg, "Skip").count(): btn(pg, "Skip").first.click(); pg.wait_for_timeout(400)
        if btn(pg, "Today’s island →").count(): btn(pg, "Today’s island →").click(); pg.wait_for_timeout(700)

    def hunt_and_quit(pg):
        btn(pg, "Follow this chart").first.click(); pg.wait_for_timeout(600)
        btn(pg, "Give up", True).first.click(); pg.wait_for_timeout(200)
        pg.get_by_role("dialog").get_by_role("button", name="Give up").click(); pg.wait_for_timeout(800)

    check("S2.2", "No touch-action / overscroll lock in the splash bundle", s2_touch)
    check("S2.3", "No preventDefault or canvas in the splash entry", s2_prevent)

    srv = server()
    try:
        def s2_scroll():
            out = []
            for w, h in [(320, 300), (360, 320), (390, 320)]:
                pg = page(w, h); pg.goto(BASE + "/splash.html"); pg.wait_for_timeout(800)
                sh, sw = pg.evaluate("[document.documentElement.scrollHeight, document.documentElement.scrollWidth]")
                out.append(sh <= h and sw <= w); pg.close()
            return all(out), "320×300, 360×320, 390×320 fit"
        check("S2.4", "Splash has no internal scrolling", s2_scroll)

        def q1():
            pg = page(); pg.goto(BASE + "/game.html"); pg.wait_for_timeout(900)
            seen = [btn(pg, "Try it").count() > 0]
            btn(pg, "Skip").click(); pg.wait_for_timeout(500)
            seen.append("Dispatch" in pg.inner_text("main"))
            btn(pg, "Today’s island →").click(); pg.wait_for_timeout(700)
            seen.append("Strangers drew these" in pg.inner_text("main"))
            hunt_and_quit(pg)
            btn(pg, "Skip").click(); btn(pg, "Bury your chest").click(); pg.wait_for_timeout(700)
            pg.keyboard.press("ArrowUp"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("Enter"); pg.wait_for_timeout(800)
            pg.keyboard.press("x"); pg.keyboard.press("Enter"); btn(pg, "Submit chart").click(); pg.wait_for_timeout(3500)
            btn(pg, "Continue").click(); pg.wait_for_timeout(800)
            seen.append("Share my chart" in pg.inner_text("main"))
            ok = all(seen) and not pg.logs; pg.close()
            return ok, f"practice, dispatch, pick hint, hunt, bury, chart, result: {seen}; console {len(pg.logs)}"
        check("Q1", "First visit: practice → Dispatch → pick → hunt → bury → chart → result", q1)

        def q5():
            pg = page(); to_pick(pg); btn(pg, "Follow this chart").first.click(); pg.wait_for_timeout(600)
            for _ in range(3): btn(pg, "Dig", True).click(); pg.wait_for_timeout(800)
            t = pg.inner_text("main"); ok = ("paces" in t or "found" in t) and "+0 gold" not in t; pg.close()
            return ok, "three digs end the hunt with a reveal line"
        check("Q5", "Miss all three shovels → reveal with distance", q5)

        def q10():
            pg = page(); to_pick(pg)
            # Already buried and charted in Q1: the editor can't be reached again, which is the point of Q8.
            st, body = api("POST", "/chart", {"pieces": [{"k": "stamp", "t": "palm", "x": 1, "y": 1}]})
            pg.close(); return st in (400, 409), f"chart without an X → HTTP {st}"
        check("Q10", "Chart with no X is refused", q10)

        def q9():
            pg = page()
            while api("GET", "/init")[1]["user"]["huntsLeft"] > 0:
                to_pick(pg); hunt_and_quit(pg); time.sleep(1.1)
            to_pick(pg)
            ui = "Share my chart" in pg.inner_text("main") or "hunted every chart" in pg.inner_text("main")
            # A real, unused chart: the refusal must come from the daily cap (409), not a missing chart.
            codes = [api("POST", "/hunt/start", {"chartId": f"preview-{i}"})[0] for i in range(4)]
            pg.close()
            return ui and 409 in codes and 200 not in codes, f"UI shows the day is done; 4th start → HTTP {codes}"
        check("Q9", "Fourth hunt in a day is refused", q9)

        def q16_17():
            pg = page(reduced=True); to_pick(pg)
            pg.keyboard.press("Tab")
            focused = pg.evaluate("document.activeElement && document.activeElement.tagName")
            coins = pg.locator(".coin-fly").count()
            ok = focused in ("BUTTON", "A") and coins == 0 and not pg.logs; pg.close()
            return ok, f"Tab focuses {focused}; no flying coins under reduced motion"
        check("Q16/Q17", "Keyboard focus and reduced motion", q16_17)

        def q14():
            pg = page(); to_pick(pg)
            t = pg.inner_text("main")
            pg.set_viewport_size({"width": 844, "height": 390}); pg.wait_for_timeout(300)
            ok = pg.inner_text("main")[:40] == t[:40]; pg.close()
            return ok, "rotating keeps the same screen and state"
        check("Q14", "Rotate mid-game keeps state", q14)

        # API break tests (§4) against the running preview (u/you).
        def b9():
            codes = [api("GET", "/init")[0] for _ in range(25)]
            time.sleep(1.1)
            return 429 in codes and api("GET", "/init")[0] == 200, f"{codes.count(429)} of 25 burst calls limited; recovers next second"
        check("B9", "Spam the API → rate limited, no crash", b9)

        def b10():
            time.sleep(1.1); st, body = api("GET", "/charts/pick?challenge=%3Cscript%3E")
            return st == 200, f"garbage challenge id → HTTP {st}, ignored"
        check("B10", "Tampered share deep-link data is ignored", b10)

        def b6():
            time.sleep(1.1)
            st, _ = api("POST", "/chart", {"pieces": [{"k": "stamp", "t": "palm", "x": i % 40, "y": 1} for i in range(50)] + [{"k": "x", "x": 2, "y": 2}]})
            return st == 400, f"50 stamps → HTTP {st}"
        check("B6", "50 stamps via the API → rejected", b6)

        def b12():
            time.sleep(1.1); a = api("POST", "/bury", {"at": {"x": 20, "y": 20}})[0]; b = api("POST", "/bury", {"at": {"x": 20, "y": 20}})[0]
            return a in (400, 409) and b in (400, 409), f"bury again after Q1 → HTTP {a}, {b}"
        check("B12/Q8", "Second bury / double tap → one chest", b12)
    finally:
        srv.terminate(); srv.wait()

    srv = server(anon=True)
    try:
        def q2():
            pg = page(); to_pick(pg)
            t = pg.inner_text("main"); slots = t.count("Old Captain")
            hunt_and_quit(pg); btn(pg, "Bury your chest").click(); pg.wait_for_timeout(500)
            ok = "Log in to bury" in pg.inner_text("main") and not pg.logs; pg.close()
            return ok, f"captain charts only ({slots}); bury asks to log in"
        check("Q2", "Logged out: hunt captain charts, bury asks to log in", q2)
    finally:
        srv.terminate(); srv.wait()
    # Judge red team checks (docs/17-JUDGE-REDTEAM.md), on a fresh logged-in day.
    srv = server()
    try:
        def j1():
            out = []
            for w, h, strip in [(390, 320, False), (390, 512, True), (740, 320, False)]:
                pg = page(w, h); pg.goto(BASE + "/splash.html"); pg.wait_for_timeout(900)
                pitch = pg.get_by_text("Follow a stranger’s map to buried gold")
                box = pitch.bounding_box() if pitch.count() else None
                seen = box is not None and box["y"] + box["height"] <= h
                how = pg.locator("ol").first
                shown = how.count() > 0 and how.is_visible()
                out.append(seen and shown == strip and not pg.logs); pg.close()
            return all(out), "pitch visible at 390×320, 390×512, 740×320; how-it-works strip only when ≥ 440 px tall"
        check("J1", "Splash says what the game is at every post size", j1)

        def j2():
            pg = page(); to_pick(pg); btn(pg, "Follow this chart").first.click(); pg.wait_for_timeout(700)
            before = pg.locator("button:has-text('✦')").count()
            pg.keyboard.press("ArrowUp"); pg.keyboard.press("ArrowUp"); pg.keyboard.press("Enter"); pg.wait_for_timeout(900)
            after = pg.locator("button:has-text('✦')").count()
            t = pg.inner_text("main"); pg.close()
            return before == 1 and after == 1 and "shovels" in t, f"hints on screen before/after walking: {before}/{after}"
        check("J2", "Hunt shows one hint at a time", j2)

        def j4():
            pg = page(1280, 800); to_pick(pg); btn(pg, "Follow this chart").first.click(); pg.wait_for_timeout(700)
            panel = pg.locator("aside").first
            wide = panel.count() > 0 and panel.is_visible() and panel.bounding_box()["width"] >= 300
            # The thumbnail button is labelled exactly "Chart" (hunt.chartOpen).
            thumbs = pg.get_by_role("button", name="Chart", exact=True)
            thumb_visible = thumbs.count() > 0 and thumbs.first.is_visible()
            logs = list(pg.logs); ok = wide and not thumb_visible and not logs; pg.close()
            return ok, "1280×800: chart panel beside the island, thumbnail hidden" + (f"; console {logs[:2]}" if logs else "") + ("" if wide else "; no panel")
        check("J4", "Wide screens show the chart beside the island", j4)
    finally:
        srv.terminate(); srv.wait()

    # The 3D island (UI-3.1, UI-3.6): the three.js chunk loads and a tap on the island walks.
    srv = server()
    try:
        def j7():
            pg = page()
            pg.goto(BASE + "/game.html"); pg.wait_for_timeout(900)
            for n in ["Skip", "Today’s island →"]:
                if btn(pg, n).count(): btn(pg, n).first.click(); pg.wait_for_timeout(700)
            btn(pg, "Follow this chart").first.click(); pg.wait_for_timeout(2500)
            loaded = pg.evaluate("performance.getEntriesByType('resource').some(e => e.name.includes('island3d'))")
            box = pg.locator("canvas").first.bounding_box()
            x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] * 0.45
            pg.mouse.click(x, y); pg.wait_for_timeout(300); pg.mouse.click(x, y); pg.wait_for_timeout(2500)
            walked = "0 steps" not in pg.inner_text("main")
            logs = list(pg.logs); pg.close()
            return loaded and walked and not logs, f"three.js chunk loaded: {loaded}; a tap walked the sailor: {walked}; console {logs[:2]}"
        check("J7", "3D island renders and taps walk", j7)

        # UI-3.5: a browser without WebGL gets the 2D island, silently, and the hunt still works.
        def j9():
            nogl = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--disable-3d-apis"])
            pg = nogl.new_page(viewport={"width": 390, "height": 844}); errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + "/game.html"); pg.wait_for_timeout(900)
            for n in ["Skip", "Today’s island →"]:
                if pg.get_by_role("button", name=n).count(): pg.get_by_role("button", name=n).first.click(); pg.wait_for_timeout(700)
            pg.get_by_role("button", name="Follow this chart").first.click(); pg.wait_for_timeout(1200)
            loaded = pg.evaluate("performance.getEntriesByType('resource').some(e => e.name.includes('island3d'))")
            for _ in range(3): pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(200)
            walked = "0 steps" not in pg.inner_text("main")
            nogl.close()
            return (not loaded) and walked and not errs, f"no WebGL: three.js not loaded {not loaded}; walking works {walked}; console {errs[:2]}"
        check("J9", "Without WebGL the 2D island takes over", j9)
    finally:
        srv.terminate(); srv.wait()
    browser.close()

manual = [
    ("S2.1", "Feed scrolls over the splash with wheel, trackpad and touch (Reddit app, phone + desktop)"),
    ("Q3", "No player charts today (fresh subreddit): 3 captain charts + banner"),
    ("Q4", "Find a chest on the first dig: gold matches depth"),
    ("Q12", "Three reports hide a chart; it appears in Review reported charts"),
    ("Q13", "Open yesterday's post: banner to today; can't bury"),
    ("Q15", "Kill network mid-walk: 'Lost at sea' + retry continues"),
    ("Q18", "Share chart: confirm sheet, comment under the sticky (app account until approval)"),
    ("Q19", "Challenge link from the share sheet opens with that chart first"),
    ("Q20/Q21", "Daily job twice → one post; day rollover during a hunt"),
    ("Q22", "Console clean in Android/iOS Reddit apps, Firefox, Safari"),
    ("§5", "Judge simulation on 7 and 8 Dec (two people, phone + desktop)"),
    ("J5", "Result card: Join the crew opens the subreddit (Reddit only: needs the post's subreddit name)"),
    ("J6", "Every judging day: ≥ 5 tester charts on today's island; Pick shows Trusted and Fresh"),
    ("J8", "3D island on real phones in the Reddit app: smooth walking (≥ 30 fps), clouds clear as you walk, taps land on the tile you meant; a phone without WebGL gets the 2D island"),
]
out = sys.argv[1] if len(sys.argv) > 1 else None
lines = ["| ID | Check | Result | Notes |", "|---|---|---|---|"] + [f"| {a} | {b} | {c} | {d} |" for a, b, c, d in rows]
lines += ["", "**Needs a real device or Reddit (Harsh):**", ""] + [f"- [ ] **{a}** {b}" for a, b in manual]
if out:
    open(out, "w").write("\n".join(lines) + "\n")
print(f"{sum(r[2] == 'PASS' for r in rows)}/{len(rows)} automated checks passed")
sys.exit(0 if all(r[2] == "PASS" for r in rows) else 1)
