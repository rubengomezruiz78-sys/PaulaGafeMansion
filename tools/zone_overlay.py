"""Dibuja suelo caminable (verde), huecos (rojo), salidas (cian, cerradas en
naranja), objetos (amarillo), puntos de acceso y horizonte sobre cada cuadro.
Uso: npx vite-node scripts/dump-zones.ts > zonas.json
     python tools/zone_overlay.py zonas.json salida.png zona1 zona2 ..."""
import json, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1920, 1080

def px(p): return (p[0] * W, p[1] * H)

def draw_zone(z):
    im = Image.open(os.path.join(ROOT, "public", z["image"])).convert("RGB").resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, "RGBA")
    d.polygon([px(p) for p in z["walk"]["outer"]], fill=(60, 255, 110, 55), outline=(60, 255, 110, 255))
    for hole in z["walk"].get("holes", []):
        d.polygon([px(p) for p in hole], fill=(255, 60, 60, 90), outline=(255, 60, 60, 255))
    for e in z["exits"]:
        col = (255, 150, 40, 255) if e.get("requires") else (40, 220, 255, 255)
        d.polygon([px(p) for p in e["hotspot"]], outline=col, width=4)
        ax, ay = px(e["approach"]); d.ellipse([ax - 9, ay - 9, ax + 9, ay + 9], fill=col)
    for p in z["props"]:
        d.polygon([px(q) for q in p["hotspot"]], outline=(255, 230, 60, 255), width=3)
        ax, ay = px(p["approach"]); d.ellipse([ax - 7, ay - 7, ax + 7, ay + 7], fill=(255, 230, 60, 255))
    sx, sy = px(z["spawn"]); d.rectangle([sx - 10, sy - 10, sx + 10, sy + 10], outline=(255, 255, 255, 255), width=3)
    hy = z["perspective"]["horizon"] * H; d.line([0, hy, W, hy], fill=(255, 60, 255, 255), width=3)
    d.rectangle([0, 0, 420, 40], fill=(0, 0, 0, 200)); d.text((10, 12), z["id"], fill=(255, 255, 255, 255))
    return im

def main():
    zones = json.load(open(sys.argv[1], encoding="utf-8"))
    out, ids = sys.argv[2], sys.argv[3:]
    tw, th = 960, 540
    cols = 2
    rows = (len(ids) + 1) // 2
    sheet = Image.new("RGB", (tw * cols, th * rows))
    for i, zid in enumerate(ids):
        sheet.paste(draw_zone(zones[zid]).resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    sheet.save(out); print(out, sheet.size)

if __name__ == "__main__":
    main()
