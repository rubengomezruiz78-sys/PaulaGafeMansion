"""
Recorta a los personajes elegidos (fondo gris liso → transparencia con BiRefNet)
y los deja en art/pintados/<clave>.png, listos para tools/build_sprites.py.

  python tools/cut_characters.py clave=art/nuevas/pj/clave_s1.png ...
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
import comfy_gen as cg  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "art", "pintados")


def border_color(src: str) -> np.ndarray:
    """Color del fondo liso: mediana del marco de la imagen original."""
    a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    edge = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    return np.median(edge, axis=0)


def clean(path: str, bg: np.ndarray) -> None:
    """Borde limpio: fuera el velo casi transparente y el halo gris del fondo."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    alpha = a[..., 3]
    alpha[alpha < 14] = 0
    # En el borde (alfa parcial) el color lleva mezcla del gris del fondo: se «desmezcla».
    k = (alpha / 255.0)[..., None]
    edge = (k > 0.05) & (k < 0.95)
    rgb = a[..., :3]
    unmixed = (rgb - bg * (1 - k)) / np.maximum(k, 0.05)
    rgb = np.where(edge, np.clip(unmixed, 0, 255), rgb)
    out = np.dstack([rgb, alpha]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    # Recorta al contenido.
    box = img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if box:
        img = img.crop(box)
    img.save(path)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for arg in sys.argv[1:]:
        key, src = arg.split("=", 1)
        dst = os.path.join(OUT, f"{key}.png")
        cg.cutout(os.path.join(ROOT, src), dst)
        clean(dst, border_color(os.path.join(ROOT, src)))
        im = Image.open(dst)
        print(key, im.size, "->", dst, flush=True)


if __name__ == "__main__":
    main()
