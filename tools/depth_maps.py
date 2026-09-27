"""
Mapas de profundidad de las salas, en metros de verdad, para que los muebles
pintados tapen a los personajes que pasan por detrás (el piano, la mesa, las
jaulas…): lo que más hace que no parezcan recortes pegados encima.

1. Depth Anything V2 (local, ONNX en la CPU) estima la profundidad relativa
   del cuadro (en «disparidad»: más cerca = más).
2. Se calibra con el suelo: en los píxeles del suelo caminable sabemos la
   profundidad exacta por la perspectiva de la sala (Z = f·c / (y − horizonte)),
   así que se ajusta disparidad ≈ a/Z + b por mínimos cuadrados robustos.
3. Se guarda la inversa de la profundidad (0,4/Z, 8 bits) de todo el cuadro con
   su franja: public/world/depth/<sala>.png (960×600, gris). El sombreado de
   los personajes la compara con la profundidad de sus pies.

  python tools/depth_maps.py [sala ...]
Necesita: C:/Users/ruben/ComfyUI-descargas/depth/model.onnx (depth-anything-v2-large)
y el volcado de zonas: npx vite-node scripts/dump-zones.ts > work/zones.json
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL = r"C:\Users\ruben\ComfyUI-descargas\depth\model.onnx"
OUT = os.path.join(ROOT, "public", "world", "depth")
PREVIEW = os.path.join(ROOT, "art", "nuevas", "depth")
W, H = 1920, 1080
OW, OH = 960, 600
Z_NEAR = 0.4

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def session():
    import onnxruntime as ort
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = os.cpu_count() or 8
    return ort.InferenceSession(MODEL, opts, providers=["CPUExecutionProvider"])


def infer(sess, rgb: Image.Image) -> np.ndarray:
    """Disparidad relativa del tamaño de la imagen."""
    w, h = rgb.size
    th = 518
    tw = int(round(w * th / h / 14.0)) * 14
    x = np.asarray(rgb.resize((tw, th), Image.BICUBIC), dtype=np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32)
    name = sess.get_inputs()[0].name
    d = sess.run(None, {name: x})[0]
    d = np.squeeze(d).astype(np.float32)
    return np.asarray(Image.fromarray(d).resize((w, h), Image.BILINEAR), dtype=np.float32)


def floor_mask(zone: dict) -> np.ndarray:
    """Suelo caminable (algo encogido para no pisar muebles), en 1920×1080."""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(x * W, y * H) for x, y in zone["walk"]["outer"]], fill=255)
    for hole in zone["walk"].get("holes", []) or []:
        d.polygon([(x * W, y * H) for x, y in hole], fill=0)
    a = np.asarray(m) > 0
    # Erosión sencilla: fuera 12 px de borde.
    from scipy import ndimage
    return ndimage.binary_erosion(a, iterations=12)


def calibrate(disp: np.ndarray, zone: dict):
    p = zone["perspective"]
    h_px = p["horizon"] * H
    f = p["focal"] * H
    cam = 1.0 / p["k"]
    mask = floor_mask(zone)
    ys, xs = np.nonzero(mask)
    ok = ys > h_px + 4
    ys, xs = ys[ok], xs[ok]
    z = f * cam / (ys - h_px)
    inv = 1.0 / z
    d = disp[ys, xs]
    # disparidad ≈ a·(1/Z) + b, robusto (se quitan los que se desvían mucho).
    keep = np.ones_like(d, dtype=bool)
    for _ in range(4):
        A = np.stack([inv[keep], np.ones(keep.sum())], axis=1)
        (a, b), *_ = np.linalg.lstsq(A, d[keep], rcond=None)
        res = d - (a * inv + b)
        s = np.std(res[keep])
        keep = np.abs(res) < 2.0 * s
    fit_err = float(np.median(np.abs((d[keep] - b) / a - inv[keep]) / inv[keep]))
    return float(a), float(b), fit_err, float(keep.mean())


def main() -> None:
    zones = json.load(open(os.path.join(ROOT, "work", "zones.json"), encoding="utf-8"))
    names = sys.argv[1:] or list(zones)
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PREVIEW, exist_ok=True)
    sess = session()
    report = {}
    for name in names:
        zone = zones[name]
        im = Image.open(os.path.join(ROOT, "public", "world", f"{name}.webp")).convert("RGB")
        full_h = im.height
        bleed = (full_h - round(im.width * H / W)) // 2
        disp_full = infer(sess, im)
        # Calibrar en la parte 16:9 (la de las anotaciones).
        disp = np.asarray(Image.fromarray(disp_full[bleed:full_h - bleed]).resize((W, H), Image.BILINEAR))
        a, b, err, used = calibrate(disp, zone)
        inv = (disp_full - b) / a  # 1/Z
        inv = np.clip(inv, 1.0 / 60.0, 1.0 / Z_NEAR)
        v = np.clip(Z_NEAR * inv, 0, 1)
        img = Image.fromarray((v * 255 + 0.5).astype(np.uint8), "L").resize((OW, OH), Image.BILINEAR)
        img.save(os.path.join(OUT, f"{name}.png"), optimize=True)
        # Vista previa para revisar a ojo: cerca = claro.
        img.resize((480, 300)).save(os.path.join(PREVIEW, f"{name}.png"))
        report[name] = {"a": round(a, 4), "b": round(b, 4), "err": round(err, 3), "suelo_usado": round(used, 2)}
        print(name, report[name], flush=True)
    json.dump(report, open(os.path.join(PREVIEW, "calibracion.json"), "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
