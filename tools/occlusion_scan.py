"""
Barre todo el suelo caminable de cada sala y marca dónde quedaría Paula
(1,3 m) tapada por lo que el mapa de profundidad pone delante: azul = se ve,
amarillo = tapada un poco, rojo = más de un 25 %. Rojo detrás de un mueble es
lo correcto; rojo sin nada delante = el polígono de suelo pisa un mueble
(recortar el polígono en content/zones).

  python tools/occlusion_scan.py salida.png
Necesita el volcado de zonas: npx vite-node scripts/dump-zones.ts > work/zones.json
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = sys.argv[1]
zones = json.load(open(os.path.join(ROOT, "work", "zones.json"), encoding="utf-8"))
W, H = 1920, 1080

def margin(z):
    return 0.25 + 0.08 * z  # igual que occlusionMargin (world/depthField.ts)

tiles = []
summary = {}
for name, zone in zones.items():
    dimg = np.asarray(Image.open(os.path.join(ROOT, "public", "world", "depth", f"{name}.png")), dtype=np.float32) / 255
    dh, dw = dimg.shape
    def sceneZ(x, y):
        c = int(np.clip(round(x / W * (dw - 1)), 0, dw - 1))
        r = int(np.clip(round((y + 60) / 1200 * (dh - 1)), 0, dh - 1))
        return 0.4 / max(dimg[r, c], 0.4 / 60)
    p = zone["perspective"]
    hpx, f, cam, k = p["horizon"] * H, p["focal"] * H, 1 / p["k"], p["k"]
    mimg = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mimg)
    md.polygon([(x * W, y * H) for x, y in zone["walk"]["outer"]], fill=255)
    for hh in zone["walk"].get("holes") or []:
        md.polygon([(x * W, y * H) for x, y in hh], fill=0)
    mask = np.asarray(mimg) > 0
    pts = []
    for yy in np.arange(0.5, 1.0, 0.015):
        for xx in np.arange(0.01, 1.0, 0.015):
            q = (xx * W, yy * H)
            if not mask[min(H - 1, int(q[1])), min(W - 1, int(q[0]))]:
                continue
            below = max(q[1] - hpx, 4)
            Z = f * cam / below
            hp = k * below * 1.3
            hid = n = 0
            for t in np.arange(0.05, 1.0001, 0.05):
                for dx in (-0.12, 0, 0.12):
                    n += 1
                    if sceneZ(q[0] + dx * hp, q[1] - t * hp) < Z - margin(Z):
                        hid += 1
            pts.append((q[0], q[1], hid / n))
    bad = [pp for pp in pts if pp[2] > 0.25]
    summary[name] = (len(pts), len(bad))
    im = Image.open(os.path.join(ROOT, "public", "world", f"{name}.webp")).convert("RGB")
    bleed = (im.height - round(im.width * H / W)) // 2
    im = im.crop((0, bleed, im.width, im.height - bleed)).resize((W // 3, H // 3))
    d = ImageDraw.Draw(im)
    d.polygon([(x * W / 3, y * H / 3) for x, y in zone["walk"]["outer"]], outline=(0, 255, 0))
    for x, y, fr in pts:
        col = (0, 160, 255) if fr <= 0.05 else (255, 220, 0) if fr <= 0.25 else (255, 40, 40)
        d.ellipse((x / 3 - 2, y / 3 - 2, x / 3 + 2, y / 3 + 2), fill=col)
    d.text((6, 6), f"{name} {len(bad)}/{len(pts)}", fill=(255, 255, 255))
    tiles.append(im)
cols = 4
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W // 3, rows * H // 3))
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * W // 3, (i // cols) * H // 3))
sheet.save(OUT)
print(json.dumps(summary))
