"""Salas nítidas para la tablet.

Las salas salen de atlas 2x2 de 1672x941 (836x470 cada una) con una franja
separadora (blanca o negra) entre celdas. Este script:
  1. recorta cada celda SIN la franja y la devuelve a 836x470 (el cambio de
     escala es <2 %, despreciable para la calibración, que va en coordenadas 0..1);
  2. la amplía x4 con Real-ESRGAN (ncnn-vulkan, local, usa la GPU);
  3. la reduce con Lanczos a 1920x1080 y la guarda en public/world/<zona>.webp.

Uso: python tools/upscale_scenes.py [zona ...]
Requiere realesrgan-ncnn-vulkan en %LOCALAPPDATA%/Programs/realesrgan (o REALESRGAN_DIR).
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART, OUT = os.path.join(ROOT, "art"), os.path.join(ROOT, "public", "world")
TOOL_DIR = os.environ.get("REALESRGAN_DIR", os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "realesrgan"))
EXE = os.path.join(TOOL_DIR, "realesrgan-ncnn-vulkan.exe")
TARGET = (1920, 1080)
CELL = (836, 470)

PLAN = {
    "mansion-atlas.png": {"TR": "biblioteca", "BL": "cocina", "BR": "archivo"},
    "mansion-atlas-2.png": {"TL": "invernadero", "TR": "galeria", "BL": "dormitorio", "BR": "observatorio"},
    "mansion-atlas-3.png": {"TL": "musica", "TR": "desvan", "BL": "tuneles", "BR": "torre"},
}


def gutter(profile: np.ndarray, center: int, radius: int = 14) -> tuple[int, int]:
    """Franja separadora alrededor del centro: filas/columnas que se salen del
    brillo de sus vecinas (muy claras o muy oscuras). Devuelve [inicio, fin)."""
    lo, hi = center - radius, center + radius
    ref = np.median(np.concatenate([profile[lo - 12:lo], profile[hi:hi + 12]]))
    bad = [i for i in range(lo, hi) if abs(profile[i] - ref) > 18]
    if not bad:
        return center, center
    return min(bad), max(bad) + 1


def clean_cells(atlas: str, cells: dict[str, str]) -> dict[str, Image.Image]:
    im = Image.open(os.path.join(ART, atlas)).convert("RGB")
    a = np.asarray(im.convert("L")).astype(float)
    h, w = a.shape
    r0, r1 = gutter(a.mean(axis=1), h // 2)
    c0, c1 = gutter(a.mean(axis=0), w // 2)
    # Un píxel más de margen: el borde del separador viene suavizado.
    r0, r1, c0, c1 = r0 - 1, r1 + 1, c0 - 1, c1 + 1
    print(f"  {atlas}: separador filas {r0}-{r1}, columnas {c0}-{c1}")
    boxes = {"TL": (0, 0, c0, r0), "TR": (c1, 0, w, r0), "BL": (0, r1, c0, h), "BR": (c1, r1, w, h)}
    return {name: im.crop(boxes[cell]).resize(CELL, Image.LANCZOS) for cell, name in cells.items()}


def upscale(img: Image.Image, work: str, name: str) -> Image.Image:
    src = os.path.join(work, f"{name}.png")
    dst = os.path.join(work, f"{name}_x4.png")
    img.save(src)
    subprocess.run([EXE, "-i", src, "-o", dst, "-n", "realesrgan-x4plus", "-s", "4", "-f", "png"],
                   check=True, cwd=TOOL_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(dst).convert("RGB")


def main(only: list[str]) -> None:
    if not os.path.exists(EXE):
        sys.exit(f"No encuentro Real-ESRGAN en {EXE}")
    os.makedirs(OUT, exist_ok=True)
    sources: dict[str, Image.Image] = {}
    for atlas, cells in PLAN.items():
        sources.update(clean_cells(atlas, cells))
    sources["vestibulo"] = Image.open(os.path.join(ART, "scene-vestibulo-v2.png")).convert("RGB")
    with tempfile.TemporaryDirectory() as work:
        for name, img in sources.items():
            if only and name not in only:
                continue
            big = upscale(img, work, name)
            final = big.resize(TARGET, Image.LANCZOS)
            final.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=88, method=6)
            print(f"  {name}: {img.size} -> {big.size} -> {final.size}")
    print("salas ->", OUT)


if __name__ == "__main__":
    main(sys.argv[1:])
