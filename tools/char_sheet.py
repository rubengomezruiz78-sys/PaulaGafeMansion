"""Hoja para elegir personajes: por clave, [original] + variantes. python tools/char_sheet.py salida.png clave1 clave2 ..."""
import os
import sys
from PIL import Image, ImageDraw

out, *keys = sys.argv[1:]
H = 360
cols = []
for k in keys:
    ims = []
    orig = os.path.join("art", "nuevas", "pj", f"ref_{k.replace('-sit', '').replace('ghost-', '')}.png")
    if os.path.exists(orig):
        ims.append(("orig", Image.open(orig)))
    for s in (1, 2, 3, 4):
        f = os.path.join("art", "nuevas", "pj", f"{k}_s{s}.png")
        if os.path.exists(f):
            ims.append((f"s{s}", Image.open(f)))
    row = []
    for tag, im in ims:
        im = im.convert("RGB")
        im = im.resize((max(1, int(im.width * H / im.height)), H))
        ImageDraw.Draw(im).text((6, 6), f"{k} {tag}", fill=(255, 255, 0))
        row.append(im)
    cols.append(row)
W = max(sum(i.width for i in r) for r in cols)
sheet = Image.new("RGB", (W, H * len(cols)), (15, 15, 15))
for y, r in enumerate(cols):
    x = 0
    for im in r:
        sheet.paste(im, (x, y * H))
        x += im.width
sheet.save(out)
