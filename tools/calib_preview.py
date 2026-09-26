"""Vista previa de calibración: pega los sprites reales en el cuadro con la
misma proyección que el juego, junto a muebles de referencia, para juzgar a
ojo si las proporciones casan. Compara varias calibraciones en paralelo.

Uso: python tools/calib_preview.py <zona> <out.png> "h,k" ["h,k" ...] -- x,y,sprite [x,y,sprite ...]
  (x, y normalizados 0..1 = pies del personaje; focal = 1.0)
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1920, 1080


def render(zone, horizon, k, placements):
    bg = Image.open(os.path.join(ROOT, "public", "world", f"{zone}.webp")).convert("RGBA")
    if bg.height * W != bg.width * H:  # cuadro con franja de 16:10: se quita (lo calibrado es el centro 16:9)
        extra = (bg.height - round(bg.width * H / W)) // 2
        bg = bg.crop((0, extra, bg.width, bg.height - extra))
    bg = bg.resize((W, H), Image.LANCZOS)
    meta = json.load(open(os.path.join(ROOT, "public", "world", "sprites", "sprites.json"), encoding="utf-8"))
    draw = ImageDraw.Draw(bg)
    hpx = horizon * H
    draw.line([0, hpx, W, hpx], fill=(255, 64, 255, 255), width=3)
    for x, y, key in sorted(placements, key=lambda p: p[1]):
        m = meta[key]
        sheet = Image.open(os.path.join(ROOT, "public", "world", "sprites", m["file"])).convert("RGBA")
        frame = sheet.crop((0, 0, m["frameWidth"], m["frameHeight"]))
        fx, fy = x * W, y * H
        ppm = k * max(fy - hpx, 2)
        s = ppm * m["realHeightM"] / m["refHeightPx"]
        img = frame.resize((max(1, round(frame.width * s)), max(1, round(frame.height * s))), Image.LANCZOS)
        ox = round(fx - m["originX"] * img.width)
        oy = round(fy - m["originY"] * img.height)
        # sombra
        sw = 0.5 * ppm
        draw.ellipse([fx - sw / 2, fy - sw * 0.12, fx + sw / 2, fy + sw * 0.12], fill=(0, 0, 0, 110))
        bg.alpha_composite(img, (ox, oy))
    draw.text((20, 20), f"{zone}  horizon={horizon}  k={k}", fill=(255, 255, 255, 255))
    return bg


def main():
    zone, out = sys.argv[1], sys.argv[2]
    sep = sys.argv.index("--")
    calibs = [tuple(float(v) for v in c.split(",")) for c in sys.argv[3:sep]]
    placements = []
    for p in sys.argv[sep + 1:]:
        x, y, key = p.split(",")
        placements.append((float(x), float(y), key))
    panels = [render(zone, h, k, placements) for h, k in calibs]
    sheet = Image.new("RGB", (W, H * len(panels)))
    for i, p in enumerate(panels):
        sheet.paste(p.convert("RGB"), (0, i * H))
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
