"""Rejilla normalizada (0..1 cada 0,05) sobre una sala para medir coordenadas: python tools/grid_overlay.py sala salida.png"""
import sys
from PIL import Image, ImageDraw, ImageEnhance

name, out = sys.argv[1], sys.argv[2]
im = Image.open(f"public/world/{name}.webp").convert("RGB")
im = ImageEnhance.Brightness(im).enhance(2.2)
d = ImageDraw.Draw(im)
W, H = im.size
for i in range(1, 20):
    x = W * i / 20
    y = H * i / 20
    strong = i % 2 == 0
    col = (255, 220, 0) if strong else (120, 200, 255)
    d.line([(x, 0), (x, H)], fill=col, width=2 if strong else 1)
    d.line([(0, y), (W, y)], fill=col, width=2 if strong else 1)
    if strong:
        d.text((x + 4, 4), f"{i/20:.1f}", fill=col)
        d.text((4, y + 2), f"{i/20:.1f}", fill=col)
im.save(out)
