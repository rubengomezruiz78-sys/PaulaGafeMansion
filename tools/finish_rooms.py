"""
Deja las salas nuevas listas para el juego: recorte a 1920×1080 y la misma
luz que las doce originales (igualando el histograma de luminancia con el de
todas ellas juntas, sin tocar el color), y las guarda en public/world/<sala>.webp.

  python tools/finish_rooms.py baile=art/nuevas/baile_s24.png comedor=...
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ORIGINAL = ["archivo", "biblioteca", "cocina", "desvan", "dormitorio", "galeria", "invernadero",
            "musica", "observatorio", "torre", "tuneles", "vestibulo"]


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def reference_cdf() -> np.ndarray:
    hist = np.zeros(256)
    for name in ORIGINAL:
        a = np.asarray(Image.open(os.path.join(ROOT, "public", "world", f"{name}.webp")).convert("RGB")).astype(np.float32)
        hist += np.histogram(luma(a), bins=256, range=(0, 256))[0]
    return np.cumsum(hist) / hist.sum()


def match(img: Image.Image, ref_cdf: np.ndarray, strength: float = 0.9) -> Image.Image:
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    y = luma(a)
    hist = np.histogram(y, bins=256, range=(0, 256))[0]
    cdf = np.cumsum(hist) / hist.sum()
    # Para cada nivel, el nivel de la referencia con el mismo percentil.
    lut = np.interp(cdf, ref_cdf, np.arange(256))
    y2 = np.interp(y, np.arange(256), lut)
    y2 = y * (1 - strength) + y2 * strength
    ratio = (y2 + 0.5) / (y + 0.5)
    out = np.clip(a * ratio[..., None], 0, 255).astype(np.uint8)
    return Image.fromarray(out)


def main() -> None:
    ref = reference_cdf()
    for arg in sys.argv[1:]:
        name, src = arg.split("=", 1)
        im = Image.open(os.path.join(ROOT, src)).convert("RGB")
        w, h = im.size
        if (w, h) != (1920, 1080):
            top = (h - 1080) // 2
            im = im.crop((0, top, 1920, top + 1080)) if w == 1920 else im.resize((1920, 1080), Image.LANCZOS)
        out = match(im, ref)
        dst = os.path.join(ROOT, "public", "world", f"{name}.webp")
        out.save(dst, "WEBP", quality=84, method=6)
        a = np.asarray(out).astype(np.float32)
        print(name, "luma media", round(float(luma(a).mean()), 1), "->", dst, os.path.getsize(dst) // 1024, "KB")


if __name__ == "__main__":
    main()
