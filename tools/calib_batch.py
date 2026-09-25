"""Verificación en lote de calibraciones: una miniatura por zona con Paula y un
adulto colocados junto a muebles de referencia. Uso interno (ver MUNDO_ABIERTO)."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from calib_preview import render  # noqa: E402

def main():
    out = sys.argv[1]
    spec = eval(open(sys.argv[2], encoding="utf-8").read())  # lista de (zona, h, k, [(x,y,sprite)])
    tw, th = 960, 540
    cols = 2
    rows = (len(spec) + cols - 1) // cols
    sheet = Image.new("RGB", (tw * cols, th * rows))
    for i, (zone, h, k, placements) in enumerate(spec):
        img = render(zone, h, k, placements).convert("RGB").resize((tw, th), Image.LANCZOS)
        d = ImageDraw.Draw(img)
        d.rectangle([0, 0, 330, 26], fill=(0, 0, 0))
        d.text((6, 6), f"{zone}  h={h} k={k}", fill=(255, 255, 0))
        sheet.paste(img, ((i % cols) * tw, (i // cols) * th))
    sheet.save(out)
    print(out, sheet.size)

if __name__ == "__main__":
    main()
