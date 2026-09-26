"""
Añade a cada cuadro una franja de 60 px arriba y abajo (1920×1080 →
1920×1200) para que en pantallas 16:10 (la tablet) no queden bandas negras.

La franja es el propio borde del cuadro en espejo, difuminado y oscureciéndose
hacia fuera (como una viñeta). Se probó a pintarla con el modelo de imagen,
pero en los bordes ponía firmas, marcos y colores chillones; esto casa siempre.
El cuadro original queda intacto en el centro: todo lo calibrado sigue igual.

  python tools/extend_rooms.py [nombre ...]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
B = 60
W, H = 1920, 1080
ROOMS = ["vestibulo", "biblioteca", "cocina", "archivo", "invernadero", "galeria", "dormitorio", "observatorio",
         "musica", "desvan", "tuneles", "torre", "baile", "comedor", "jardin", "taller", "estudio", "teatro"]
EXTRA = {
    "cover": (os.path.join(ROOT, "art", "cover-paula-gafe-v2.png"), os.path.join(ROOT, "public", "cover.webp")),
    "fiesta": (os.path.join(ROOT, "art", "salas-nuevas", "fiesta.webp"), os.path.join(ROOT, "public", "world", "fiesta.webp")),
}


def to_169(im: Image.Image) -> Image.Image:
    w, h = im.size
    if (w, h) == (W, H):
        return im
    th = round(w * H / W)
    top = (h - th) // 2
    return im.crop((0, max(0, top), w, max(0, top) + th)).resize((W, H), Image.LANCZOS)


def strip(edge: Image.Image, top: bool) -> Image.Image:
    """El borde del cuadro en espejo, cada vez más borroso y más oscuro hacia fuera."""
    mirrored = edge.transpose(Image.FLIP_TOP_BOTTOM)
    soft = np.asarray(mirrored.filter(ImageFilter.GaussianBlur(10)), dtype=np.float32)
    sharp = np.asarray(mirrored, dtype=np.float32)
    t = np.linspace(0, 1, B, dtype=np.float32)          # 0 = pegado al cuadro, 1 = borde de fuera
    if top:
        t = t[::-1]
    mix = np.clip(t * 1.6, 0, 1)[:, None, None]
    col = sharp * (1 - mix) + soft * mix
    dark = (1 - 0.8 * t ** 0.8)[:, None, None]
    return Image.fromarray(np.clip(col * dark, 0, 255).astype(np.uint8))


def extend(src: str, dst: str) -> None:
    im = to_169(Image.open(src).convert("RGB"))
    out = Image.new("RGB", (W, H + 2 * B))
    out.paste(im, (0, B))
    out.paste(strip(im.crop((0, 0, W, B)), True), (0, 0))
    out.paste(strip(im.crop((0, H - B, W, H)), False), (0, H + B))
    out.save(dst, "WEBP", quality=86, method=6)
    print(os.path.basename(dst), out.size, os.path.getsize(dst) // 1024, "KB", flush=True)


def main() -> None:
    for name in sys.argv[1:] or ROOMS + list(EXTRA):
        if name in EXTRA:
            src, dst = EXTRA[name]
        else:
            dst = os.path.join(ROOT, "public", "world", f"{name}.webp")
            src = dst
            if Image.open(src).size != (W, H):
                print(name, "ya ampliada")
                continue
        extend(src, dst)


if __name__ == "__main__":
    main()
