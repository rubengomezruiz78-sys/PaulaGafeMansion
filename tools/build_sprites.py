"""Limpieza de sprites + métricas de escala real para el mundo abierto.

- Personajes estáticos: recorte por alfa, reducción a una altura manejable y
  ancla X en los pies (centro de masa de las filas inferiores).
- Hojas de caminar: el recorte a rejilla fija partía botas/colas entre
  fotogramas. Aquí cada figura se extrae como mancha conectada, se alinea por
  la línea de pies y el centro del torso (sin temblor lateral) y se reempaqueta.

Salida: public/world/sprites/*.webp + public/world/sprites/sprites.json
Uso: python tools/build_sprites.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art")
OUT = os.path.join(ROOT, "public", "world", "sprites")
ALPHA_MIN = 40  # ignora el halo casi transparente

# Estatura real (metros) del contenido visible de cada sprite.
STATIC = {
    "paula-idle": ("character-paula-v3.png", 1.30),
    "paula-startled": ("character-paula-startled.png", None),  # misma escala que idle
    "gafe-sit": ("character-gafe-v2.png", 0.32),
    "basilio": ("character-basilio-v1.png", 1.82),
    "elvira": ("character-elvira-v2.png", 1.60),
    "tomas": ("character-tomas-v2.png", 1.70),
    "ines": ("character-ines-v2.png", 1.42),
    "bruma": ("character-bruma-v2.png", 1.58),
    "baltasar": ("character-baltasar-v2.png", 1.74),
}
WALK = {
    "paula-walk": ("character-paula-walk-v2.png", 4, 1.30),
    "gafe-walk": ("character-gafe-walk.png", 4, 0.29),
}
MAX_STATIC_H = 900  # px; de sobra para 1920x1080 y ahorra memoria/APK


def alpha_mask(im):
    return np.asarray(im.getchannel("A")) > ALPHA_MIN


def feet_anchor_x(mask):
    """Centro de masa horizontal de las filas inferiores (los pies)."""
    ys = np.where(mask.any(axis=1))[0]
    bottom = ys.max()
    band = mask[max(0, bottom - max(4, int(0.06 * (bottom - ys.min())))) : bottom + 1]
    cols = np.where(band.any(axis=0))[0]
    return float(cols.mean())


def torso_anchor_x(mask):
    """Centro de masa horizontal de la franja media (estable durante la zancada)."""
    ys = np.where(mask.any(axis=1))[0]
    top, bottom = ys.min(), ys.max()
    h = bottom - top
    band = mask[top + int(0.30 * h) : top + int(0.60 * h)]
    weights = band.sum(axis=0).astype(float)
    return float((weights * np.arange(band.shape[1])).sum() / weights.sum())


def save_webp(im, name):
    path = os.path.join(OUT, name + ".webp")
    im.save(path, "WEBP", quality=92, method=6)
    return os.path.basename(path)


def build_static(key, file, real_h, ref_scale):
    im = Image.open(os.path.join(SRC, file)).convert("RGBA")
    mask = alpha_mask(im)
    ys, xs = np.where(mask)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    content_h = im.height
    scale = min(1.0, MAX_STATIC_H / content_h)
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    mask = alpha_mask(im)
    ax = feet_anchor_x(mask)
    if real_h is None:  # hereda píxeles-por-metro (espacio de origen) del sprite de referencia
        real_h = content_h / ref_scale
    return {
        "file": save_webp(im, key),
        "frames": 1,
        "frameWidth": im.width,
        "frameHeight": im.height,
        "originX": round(ax / im.width, 4),
        "originY": 1.0,
        "refHeightPx": im.height,
        "realHeightM": round(real_h, 3),
    }, content_h / real_h


def seam_split(comp_mask, xa, xb):
    """Costura vertical de coste mínimo (8-conexa) entre las columnas xa..xb.
    Devuelve, por fila, la columna de corte: a su izquierda una figura, a su
    derecha la otra. El coste es la opacidad, así la costura pasa por huecos."""
    h = comp_mask.shape[0]
    cost = comp_mask[:, xa:xb + 1].astype(float) + 1e-3
    acc = cost.copy()
    back = np.zeros_like(acc, dtype=int)
    w = acc.shape[1]
    for y in range(1, h):
        prev = acc[y - 1]
        left = np.r_[np.inf, prev[:-1]]
        right = np.r_[prev[1:], np.inf]
        stack = np.vstack([left, prev, right])
        idx = stack.argmin(axis=0)
        acc[y] += stack[idx, np.arange(w)]
        back[y] = np.arange(w) + idx - 1
    seam = np.zeros(h, dtype=int)
    seam[-1] = int(acc[-1].argmin())
    for y in range(h - 1, 0, -1):
        seam[y - 1] = back[y, seam[y]]
    return seam + xa


def torso_peaks(comp_mask, count):
    ys = np.where(comp_mask.any(axis=1))[0]
    top, bottom = ys.min(), ys.max()
    band = comp_mask[top + int(0.30 * (bottom - top)) : top + int(0.60 * (bottom - top))]
    hist = ndimage.gaussian_filter1d(band.sum(axis=0).astype(float), 12)
    peaks = [x for x in range(1, len(hist) - 1) if hist[x] >= hist[x - 1] and hist[x] > hist[x + 1] and hist[x] > 0.25 * hist.max()]
    peaks.sort(key=lambda x: -hist[x])
    return sorted(peaks[:count])


def build_walk(key, file, frames, real_h):
    im = Image.open(os.path.join(SRC, file)).convert("RGBA")
    mask = alpha_mask(im)
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    big = [i + 1 for i in np.argsort(sizes)[::-1] if sizes[i] > 0.05 * sizes.max()]
    comps = [labels == lab for lab in big]
    # Mientras falten figuras, parte la mancha más ancha por su costura
    while len(comps) < frames:
        widths = [np.ptp(np.where(c.any(axis=0))[0]) for c in comps]
        c = comps.pop(int(np.argmax(widths)))
        pk = torso_peaks(c, 2)
        if len(pk) < 2:
            raise RuntimeError("no se pudieron separar dos figuras fusionadas")
        margin = int(0.18 * (pk[1] - pk[0]))
        seam = seam_split(c, pk[0] + margin, pk[1] - margin)
        cols = np.arange(c.shape[1])[None, :]
        left_mask = c & (cols < seam[:, None])
        comps += [left_mask, c & ~left_mask]
    figures = []
    for m in comps:
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        sub = np.array(im)[y0:y1, x0:x1].copy()
        sub_mask = m[y0:y1, x0:x1]
        sub[~sub_mask] = 0  # elimina restos de figuras vecinas
        figures.append((x0, Image.fromarray(sub, "RGBA"), sub_mask))
    figures.sort(key=lambda f: f[0])

    anchors = [torso_anchor_x(f[2]) for f in figures]
    heights = [f[1].height for f in figures]
    left = max(a for a in anchors)
    right = max(f[1].width - a for f, a in zip(figures, anchors))
    pad = 6
    fw = int(np.ceil(left + right)) + pad * 2
    fh = max(heights) + pad * 2
    sheet = Image.new("RGBA", (fw * len(figures), fh), (0, 0, 0, 0))
    cx = pad + left
    for i, ((_, fig, _), a) in enumerate(zip(figures, anchors)):
        x = int(round(i * fw + cx - a))
        y = fh - pad - fig.height  # pies sobre la misma línea base
        sheet.alpha_composite(fig, (x, y))
    return {
        "file": save_webp(sheet, key),
        "frames": len(figures),
        "frameWidth": fw,
        "frameHeight": fh,
        "originX": round(cx / fw, 4),
        "originY": round((fh - pad) / fh, 4),
        "refHeightPx": max(heights),
        "realHeightM": real_h,
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    ref = None
    for key, (file, real_h) in STATIC.items():
        entry, ppm = build_static(key, file, real_h, ref)
        if key == "paula-idle":
            ref = ppm
        meta[key] = entry
        print(f"{key:16s} {entry['frameWidth']}x{entry['frameHeight']} origin=({entry['originX']},1) {entry['realHeightM']} m")
    for key, (file, frames, real_h) in WALK.items():
        entry = build_walk(key, file, frames, real_h)
        meta[key] = entry
        print(f"{key:16s} {entry['frames']}x {entry['frameWidth']}x{entry['frameHeight']} origin=({entry['originX']},{entry['originY']}) ref={entry['refHeightPx']}px")
    with open(os.path.join(OUT, "sprites.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    # Copia tipada para el código (import estático en src/content/sprites.ts)
    with open(os.path.join(ROOT, "src", "content", "sprites.generated.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
