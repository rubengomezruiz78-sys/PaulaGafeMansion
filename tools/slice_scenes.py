"""Trocea los atlas 2x2 de escenas pintadas en una imagen por zona.
Uso: python tools/slice_scenes.py  ->  public/world/<zona>.webp"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART, OUT = os.path.join(ROOT, "art"), os.path.join(ROOT, "public", "world")
PLAN = {
    "mansion-atlas.png": {"TR": "biblioteca", "BL": "cocina", "BR": "archivo"},
    "mansion-atlas-2.png": {"TL": "invernadero", "TR": "galeria", "BL": "dormitorio", "BR": "observatorio"},
    "mansion-atlas-3.png": {"TL": "musica", "TR": "desvan", "BL": "tuneles", "BR": "torre"},
}

def main():
    os.makedirs(OUT, exist_ok=True)
    for src, cells in PLAN.items():
        im = Image.open(os.path.join(ART, src)).convert("RGB")
        w, h = im.size
        hw, hh = w // 2, h // 2
        boxes = {"TL": (0, 0, hw, hh), "TR": (hw, 0, w, hh), "BL": (0, hh, hw, h), "BR": (hw, hh, w, h)}
        for cell, name in cells.items():
            im.crop(boxes[cell]).save(os.path.join(OUT, name + ".webp"), "WEBP", quality=90, method=6)
    Image.open(os.path.join(ART, "scene-vestibulo-v2.png")).convert("RGB").save(
        os.path.join(OUT, "vestibulo.webp"), "WEBP", quality=90, method=6)
    print("escenas ->", OUT)

if __name__ == "__main__":
    main()
