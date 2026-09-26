"""Hoja de contactos 2×2 de variantes: python tools/contact_sheet.py salida.png a.png b.png c.png d.png"""
import sys
from PIL import Image, ImageDraw

out, *files = sys.argv[1:]
w, h = 960, 544
sheet = Image.new("RGB", (w * 2, h * ((len(files) + 1) // 2)))
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((w, h))
    ImageDraw.Draw(im).text((12, 10), f.split("\\")[-1].split("/")[-1], fill=(255, 255, 0))
    sheet.paste(im, ((i % 2) * w, (i // 2) * h))
sheet.save(out)
