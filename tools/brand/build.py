"""The brand kit in /brand: every logo, icon, glyph, banner, GIF, screen and video, in named folders.

    python3 tools/brand/build.py        (needs: pip install fonttools brotli pillow playwright)

Vectors are drawn from the game's own shapes (src/shared/logo.ts, glyphs.ts via tools/brand/data.ts),
the wordmark is outlined from the bundled Fraunces Black so it needs no font, and rasters are
rendered with the same Chrome the QA uses. Existing art (docs/assets, src/client/assets) is copied in
under brand names, so /brand is the one place to grab anything.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from chrome_path import chrome  # noqa: E402
import json, os, shutil, subprocess
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "brand")
NAME = "isle-of-maybe"
C = {
    "paper": "#FFF4DC", "paper-2": "#F3E1B8", "ink": "#2B1D12", "ink-soft": "#6A513A",
    "hibiscus": "#B8233F", "palm": "#1E5B3A", "lagoon": "#0A6468", "lagoon-2": "#08575C",
    "foam": "#FFF7E8", "seafoam": "#C8EEE7", "sun": "#FFCF6B", "mango": "#FFB21E",
    "sea": "#1E9A9C", "shallows": "#4CC3B9", "sand": "#F2D99B", "grass": "#6DBE5A",
    "jungle": "#2E7D3A", "rock": "#8A8178",
}
ROLES = {
    "paper": "Card and chart background", "paper-2": "Pressed states, chart margins",
    "ink": "Text on paper", "ink-soft": "Secondary text on paper", "hibiscus": "The X, warnings, the Old Captain's seal",
    "palm": "True map, success", "lagoon": "App frame", "lagoon-2": "Bars and panels on the frame",
    "foam": "Text on lagoon", "seafoam": "Secondary text on lagoon", "sun": "Gold, links on lagoon",
    "mango": "Primary button", "sea": "Open water", "shallows": "Shallows, the logo's ring",
    "sand": "Beach, the logo's island", "grass": "Meadows", "jungle": "Jungle", "rock": "Cliffs and rocks",
}
BIOMES = {  # mirrors src/client/island/three/world/biome.ts (ground sand, grass, sea shallow, sea deep, accent)
    "tropical": ["#F0D9A0", "#6CBF55", "#5FD6C6", "#0B4F63", "#D42A4A"],
    "volcanic": ["#45413E", "#6B7F45", "#3AA8A0", "#08364C", "#E8471F"],
    "autumn": ["#ECCF9A", "#B29A46", "#6CC3B2", "#0D4560", "#D0602A"],
    "mangrove": ["#B5A676", "#6E8A3C", "#79BB95", "#0E463F", "#276838"],
    "frost": ["#D2CEC6", "#E9EFF3", "#8ACBD8", "#0C3953", "#2C5A45"],
    "coral": ["#FBF1DA", "#78CC58", "#7AEFDF", "#0A5B8C", "#FF7A8A"],
}

data = json.loads(subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "tools/brand/data.ts"],
                                 cwd=ROOT, check=True, capture_output=True, text=True).stdout)
L = data["logo"]


def w(rel, text):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        f.write(text)
    return p


def cp(src, rel):
    s = os.path.join(ROOT, src)
    if not os.path.exists(s):
        print("missing", src)
        return
    d = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    shutil.copyfile(s, d)


# ---------- the mark ----------
def mark(ring, sand, ink, x, dash=True):
    xs = "".join(f'<line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="{x}" stroke-width="4.5" stroke-linecap="round"/>' for a, b, c, d in L["x"])
    ring_el = f'<path d="{L["island"]}" fill="{ring}" stroke="{ring}" stroke-width="7" stroke-linejoin="round"/>' if ring else ""
    return (f'{ring_el}<path d="{L["island"]}" fill="{sand}" stroke="{ink}" stroke-width="2.5" stroke-linejoin="round"/>'
            f'<path d="{L["path"]}" fill="none" stroke="{ink}" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 5"/>{xs}')


def svg(vb_w, vb_h, body, title="Isle of Maybe"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


MARKS = {
    "color": mark(C["shallows"], C["sand"], C["ink"], C["hibiscus"]),
    "ink": mark(None, "none", C["ink"], C["ink"]),
    "paper": mark(None, "none", C["paper"], C["paper"]),
    "white": mark(None, "none", "#FFFFFF", "#FFFFFF"),
}
for k, body in MARKS.items():
    w(f"logo/mark/{NAME}-mark-{k}.svg", svg(64, 64, body))
# App icon: the mark on a lagoon tile with a soft inner sea.
ICON = (f'<rect width="64" height="64" rx="14" fill="{C["lagoon"]}"/>'
        f'<circle cx="32" cy="32" r="27" fill="{C["sea"]}" opacity="0.45"/>'
        f'<g transform="translate(5.5 5.5) scale(0.83)">{MARKS["color"]}</g>')
w(f"icons/{NAME}-app-icon.svg", svg(64, 64, ICON))
w("icons/favicon.svg", svg(64, 64, ICON))

# ---------- the wordmark, outlined from Fraunces Black ----------
font = TTFont(os.path.join(ROOT, "node_modules/@fontsource/fraunces/files/fraunces-latin-900-normal.woff2"))
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
TRACK = -0.02 * upm  # matches .font-title's letter-spacing


def outline(text):
    x = 0.0
    paths = []
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None:
            continue
        pen = SVGPathPen(gs)
        gs[g].draw(pen)
        d = pen.getCommands()
        if d:
            paths.append(f'<path transform="translate({x:.1f} 0)" d="{d}"/>')
        x += gs[g].width + TRACK
    return "".join(paths), x - TRACK


word, word_w = outline("Isle of Maybe")
asc = font["hhea"].ascent
# Flip font units (y up) into SVG (y down); cap-height box from the real glyph bounds.
bp = BoundsPen(gs)
for ch in "IlfMby":
    gs[cmap[ord(ch)]].draw(bp)
_, ymin, _, ymax = bp.bounds
WORD_H = ymax - ymin


def word_svg(fill):
    return f'<g fill="{fill}" transform="translate(0 {ymax:.0f}) scale(1 -1)">{word}</g>'


for k, fill in {"ink": C["ink"], "paper": C["paper"], "white": "#FFFFFF", "lagoon": C["lagoon"]}.items():
    w(f"logo/wordmark/{NAME}-wordmark-{k}.svg", svg(round(word_w), round(WORD_H), word_svg(fill)))

# Lockups: mark beside the wordmark, and stacked.
S = WORD_H * 1.55 / 64  # mark scale so it stands a little taller than the letters


def lockup_h(text_fill, mark_body):
    gap = 64 * S * 0.28
    total_w = 64 * S + gap + word_w
    body = (f'<g transform="scale({S:.4f})">{mark_body}</g>'
            f'<g transform="translate({64 * S + gap:.0f} {(64 * S - WORD_H) / 2:.0f})">{word_svg(text_fill)}</g>')
    return svg(round(total_w), round(64 * S), body)


def lockup_v(text_fill, mark_body):
    ms = S * 1.6
    total_w = max(word_w, 64 * ms)
    body = (f'<g transform="translate({(total_w - 64 * ms) / 2:.0f} 0) scale({ms:.4f})">{mark_body}</g>'
            f'<g transform="translate({(total_w - word_w) / 2:.0f} {64 * ms + WORD_H * 0.35:.0f})">{word_svg(text_fill)}</g>')
    return svg(round(total_w), round(64 * ms + WORD_H * 1.35), body)


w(f"logo/lockup/{NAME}-lockup-horizontal-on-light.svg", lockup_h(C["ink"], MARKS["color"]))
w(f"logo/lockup/{NAME}-lockup-horizontal-on-dark.svg", lockup_h(C["foam"], MARKS["color"]))
w(f"logo/lockup/{NAME}-lockup-stacked-on-light.svg", lockup_v(C["ink"], MARKS["color"]))
w(f"logo/lockup/{NAME}-lockup-stacked-on-dark.svg", lockup_v(C["foam"], MARKS["color"]))
w(f"logo/lockup/{NAME}-lockup-horizontal-ink.svg", lockup_h(C["ink"], MARKS["ink"]))

# ---------- glyphs ----------
NICE = {"twinPalms": "twin-palms", "skullRock": "skull-rock"}
for key, gl in data["glyphs"].items():
    name = NICE.get(key, "".join("-" + c.lower() if c.isupper() else c for c in key))
    paths = []
    for s in gl.get("fills", []):
        d = "M" + " L".join(f"{s[i]} {s[i + 1]}" for i in range(0, len(s) - 1, 2)) + "Z"
        paths.append(f'<path d="{d}" fill="{C["sand"]}" stroke="none"/>')
    for s in gl["strokes"]:
        d = "M" + " L".join(f"{s[i]} {s[i + 1]}" for i in range(0, len(s) - 1, 2))
        col = C["hibiscus"] if key == "x" else C["ink"]
        paths.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
    w(f"glyphs/{name}.svg", svg(24, 24, "".join(paths), title=name.replace("-", " ")))

# ---------- palette ----------
w("palette/palette.json", json.dumps({"tokens": C, "roles": ROLES, "biomes": BIOMES}, indent=2) + "\n")
w("palette/palette.css", ":root {\n" + "".join(f"  --{k}: {v}; /* {ROLES[k]} */\n" for k, v in C.items()) + "}\n")
cells = []
for i, (k, v) in enumerate(C.items()):
    x, y = (i % 6) * 200, (i // 6) * 150
    light = k in ("paper", "paper-2", "foam", "seafoam", "sun", "mango", "sand", "shallows", "grass")
    t = C["ink"] if light else C["foam"]
    cells.append(f'<rect x="{x}" y="{y}" width="200" height="150" fill="{v}"/>'
                 f'<text x="{x + 16}" y="{y + 108}" fill="{t}" font-family="Georgia, serif" font-size="22" font-weight="700">{k}</text>'
                 f'<text x="{x + 16}" y="{y + 134}" fill="{t}" font-family="monospace" font-size="16">{v}</text>')
w("palette/palette.svg", svg(1200, 450, "".join(cells), "Isle of Maybe palette"))
rows = []
for r, (b, cols) in enumerate(BIOMES.items()):
    y = r * 90
    rows.append(f'<text x="16" y="{y + 54}" fill="{C["ink"]}" font-family="Georgia, serif" font-size="24" font-weight="700">{b}</text>')
    for j, v in enumerate(cols):
        rows.append(f'<rect x="{200 + j * 200}" y="{y + 10}" width="190" height="70" rx="10" fill="{v}"/>')
w("palette/biomes.svg", svg(1200, 540, f'<rect width="1200" height="540" fill="{C["paper"]}"/>' + "".join(rows), "Biome palettes"))

# ---------- rasters ----------
fonts_css = "".join(
    f"@font-face{{font-family:'{fam}';font-weight:{wt};src:url('file://{ROOT}/node_modules/@fontsource/{pkg}/files/{pkg}-latin-{wt}-normal.woff2')}}"
    for fam, pkg, wt in [("Fraunces", "fraunces", 700), ("Fraunces", "fraunces", 900),
                          ("Bricolage Grotesque", "bricolage-grotesque", 400), ("Bricolage Grotesque", "bricolage-grotesque", 800)])
RENDERS = []  # (html, width, height, out, transparent)


def svg_png(rel_svg, out_rel, width, bg=None):
    p = os.path.join(OUT, rel_svg)
    s = open(p).read()
    import re
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', s)
    vw, vh = float(m.group(1)), float(m.group(2))
    height = round(width * vh / vw)
    html = (f'<html><body style="margin:0;background:{bg or "transparent"}">'
            f'<img src="file://{p}" style="display:block;width:{width}px;height:{height}px"></body></html>')
    RENDERS.append((html, width, height, out_rel, bg is None))


for k in MARKS:
    for size in (64, 128, 256, 512, 1024):
        svg_png(f"logo/mark/{NAME}-mark-{k}.svg", f"logo/mark/png/{NAME}-mark-{k}-{size}.png", size)
for size in (16, 32, 48, 180, 192, 256, 512, 1024):
    svg_png(f"icons/{NAME}-app-icon.svg", f"icons/png/{NAME}-app-icon-{size}.png", size)
for k in ("ink", "paper", "white", "lagoon"):
    svg_png(f"logo/wordmark/{NAME}-wordmark-{k}.svg", f"logo/wordmark/png/{NAME}-wordmark-{k}-1600.png", 1600)
for v in ("horizontal-on-light", "horizontal-on-dark", "stacked-on-light", "stacked-on-dark", "horizontal-ink"):
    svg_png(f"logo/lockup/{NAME}-lockup-{v}.svg", f"logo/lockup/png/{NAME}-lockup-{v}-1600.png", 1600)
svg_png("palette/palette.svg", "palette/palette.png", 1200)
svg_png("palette/biomes.svg", "palette/biomes.png", 1200)

# Open Graph card for the website and link previews: key art, lockup, one line.
keyart = os.path.join(ROOT, "src/client/assets/keyart.webp")
og = f"""<html><head><style>{fonts_css}
body{{margin:0;width:1200px;height:630px;overflow:hidden;position:relative;background:{C['lagoon']};font-family:'Bricolage Grotesque'}}
.art{{position:absolute;inset:0;background:url('file://{keyart}') center/cover}}
.shade{{position:absolute;inset:0;background:linear-gradient(90deg,{C['lagoon']}F2 0%,{C['lagoon']}CC 38%,transparent 66%)}}
.t{{position:absolute;left:72px;top:170px;width:620px;color:{C['foam']}}}
.t img{{width:600px;display:block}}
.t p{{font-size:40px;line-height:1.2;margin:36px 0 0;color:{C['foam']};font-weight:400}}
</style></head><body><div class="art"></div><div class="shade"></div>
<div class="t"><img src="file://{OUT}/logo/lockup/{NAME}-lockup-horizontal-on-dark.svg">
<p>Follow a stranger's map to buried gold. Then bury yours.</p></div></body></html>"""
RENDERS.append((og, 1200, 630, f"social/{NAME}-og-1200x630.png", False))
# Type specimen.
spec = f"""<html><head><style>{fonts_css}
body{{margin:0;width:1200px;height:520px;background:{C['paper']};color:{C['ink']};padding:64px 72px;box-sizing:border-box}}
.a{{font-family:Fraunces;font-weight:900;font-size:96px;letter-spacing:-0.02em;line-height:1}}
.b{{font-family:Fraunces;font-weight:700;font-size:44px;margin-top:18px}}
.c{{font-family:'Bricolage Grotesque';font-size:26px;line-height:1.45;margin-top:34px;max-width:900px}}
.k{{font-family:'Bricolage Grotesque';font-weight:800;font-size:20px;color:{C['ink-soft']};margin-top:40px}}
</style></head><body><div class="a">Isle of Maybe</div><div class="b">Fraunces Black and Bold, for titles</div>
<div class="c">Bricolage Grotesque for everything you read and tap. Follow a stranger's map to buried gold, then bury yours.</div>
<div class="k">Fraunces · Bricolage Grotesque · both SIL Open Font License, bundled with the app</div></body></html>"""
RENDERS.append((spec, 1200, 520, "type/type-specimen.png", False))

with sync_playwright() as p:
    b = p.chromium.launch(**chrome(), args=["--no-sandbox", "--allow-file-access-from-files"])
    for html, wdt, hgt, out_rel, transparent in RENDERS:
        tmp = "/tmp/iom-brand.html"
        with open(tmp, "w") as f:
            f.write(html)
        pg = b.new_page(viewport={"width": wdt, "height": hgt})
        pg.goto("file://" + tmp)
        pg.wait_for_timeout(250)
        outp = os.path.join(OUT, out_rel)
        os.makedirs(os.path.dirname(outp), exist_ok=True)
        pg.screenshot(path=outp, omit_background=transparent)
        pg.close()
    b.close()
# A classic favicon.ico from the small icons.
ico = [Image.open(os.path.join(OUT, f"icons/png/{NAME}-app-icon-{s}.png")) for s in (16, 32, 48)]
ico[2].save(os.path.join(OUT, "icons/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])

# ---------- the existing art, under brand names ----------
COPIES = {
    "src/client/assets/keyart.webp": f"keyart/{NAME}-keyart.webp",
    "docs/assets/featuring-1920x1080.png": f"keyart/{NAME}-featuring-1920x1080.png",
    "docs/assets/subreddit-banner-1920x384.png": f"banners/{NAME}-subreddit-banner-1920x384.png",
    "docs/assets/subreddit-banner-mobile-1600x480.png": f"banners/{NAME}-subreddit-banner-mobile-1600x480.png",
    "docs/assets/devpost-gallery-1500x1000.png": f"banners/{NAME}-devpost-cover-1500x1000.png",
    "docs/assets/tile-1080x1080.png": f"social/{NAME}-square-1080.png",
    "docs/assets/tile-1120x512.png": f"social/{NAME}-wide-1120x512.png",
    "docs/assets/gallery-0-find.gif": f"gifs/{NAME}-find-the-chest.gif",
    "docs/assets/gallery-0-hunt.gif": f"gifs/{NAME}-hunt.gif",
    "docs/assets/gallery-0-chart.gif": f"gifs/{NAME}-draw-a-chart.gif",
    "docs/assets/gallery-1-loop.png": f"screens/{NAME}-01-the-loop.png",
    "docs/assets/gallery-2-chart.png": f"screens/{NAME}-02-chart-editor.png",
    "docs/assets/gallery-3-tomorrow.png": f"screens/{NAME}-03-tomorrow.png",
    "docs/assets/gallery-4-desktop.png": f"screens/{NAME}-04-desktop.png",
    "docs/assets/gallery-5-fair.png": f"screens/{NAME}-05-fair-play.png",
    "docs/assets/featuring-1500x1000.mp4": f"video/{NAME}-trailer-1500x1000.mp4",
    "docs/assets/biomes.webp": f"biomes/{NAME}-six-biomes.webp",
    "src/client/assets/waves.svg": "patterns/waves.svg",
    "src/client/assets/torn-edge.svg": "patterns/torn-edge.svg",
}
for b in BIOMES:
    COPIES[f"docs/assets/biome-{b}.webp"] = f"biomes/{NAME}-biome-{b}.webp"
for s, d in COPIES.items():
    cp(s, d)
n = sum(len(fs) for _, _, fs in os.walk(OUT))
print("brand/:", n, "files")
