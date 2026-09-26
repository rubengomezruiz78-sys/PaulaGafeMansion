"""
Reparto pintado con el mismo estilo que las salas (FLUX.2 klein local).

Cada personaje se genera sobre fondo gris liso para recortarlo después con
BiRefNet (comfy_gen.cutout). Los que ya existían se repintan partiendo de su
imagen (misma cara, ropa y postura); los nuevos se describen desde cero, con
Paula repintada como referencia de «cómo se pinta un personaje» en este juego.

  python tools/gen_characters.py [clave ...]      (SEEDS=1,2 por defecto)
Salida: art/nuevas/pj/<clave>_s<semilla>.png
"""
import os
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import comfy_gen as cg  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ART = os.path.join(ROOT, "art")
OUT = os.path.join(ART, "nuevas", "pj")
ROOM = os.path.join(ART, "nuevas", "ref_musica.png")
COVER = os.path.join(ART, "cover-paula-gafe-v2.png")
PAULA = os.path.join(OUT, "paula_s5.png")

STY = ("in exactly the art style of image 2: dark gothic fantasy digital oil painting, visible painterly brushwork, soft painted edges, "
       "muted slightly desaturated colors, soft even ambient light with a subtle cool rim light. ")
BG = " The background is a plain flat uniform grey color with nothing else: no floor, no shadow, no props, no text."
FULL = "Full body from head to feet, standing, centered, the whole figure fits in the picture."


def repaint(what: str) -> str:
    return (f"Repaint the {what} from image 1 as a hand-painted character illustration " + STY +
            "Keep exactly the same character: same face and features, same age, same hair, same clothes and colors, same pose and body proportions. "
            + FULL + BG)


def new(what: str) -> str:
    return ("A hand-painted character illustration of " + what + ", " + STY.replace("image 2", "image 2 and painted like the girl in image 1") +
            FULL + BG)


def ghost(accessory: str) -> str:
    return ("A cute friendly little ghost made of a flowing white sheet, like the small ghosts in image 1, with two dark oval eyes and a small gentle smile, "
            f"{accessory}. Softly glowing pale blue-white, painted " + STY + "Floating a little above the ground, the bottom of the sheet ends in soft waves. "
            "Full figure, centered." + BG)


def pad_ref(src: str, name: str) -> str:
    """Pone el PNG con transparencia sobre gris liso (así lo entiende mejor el modelo)."""
    dst = os.path.join(OUT, f"ref_{name}.png")
    if not os.path.exists(dst):
        im = Image.open(src).convert("RGBA")
        bg = Image.new("RGBA", (im.width + 200, im.height + 120), (58, 58, 64, 255))
        bg.alpha_composite(im, (100, 60))
        bg.convert("RGB").save(dst)
    return dst


def art(f: str) -> str:
    return os.path.join(ART, f)


TALL = (768, 1472)
WIDE = (896, 1152)

# clave: (prompt, referencias, tamaño)
SPECS = {
    "paula-startled": (repaint("startled girl (hands raised near her face, surprised)"), ["paula-startled"], TALL),
    "gafe-sit": (repaint("black cat sitting (amber eyes)"), ["gafe"], (1024, 1280)),
    "basilio": (repaint("tall thin old butler"), ["basilio"], TALL),
    "elvira": (repaint("pale translucent ghost of a librarian lady").replace("same clothes and colors", "same clothes, and keep her ghostly look: pale blue-white, softly glowing, slightly see-through"), ["elvira"], TALL),
    "tomas": (repaint("pale translucent ghost of an old caretaker").replace("same clothes and colors", "same clothes, and keep his ghostly look: pale blue-white, softly glowing, slightly see-through"), ["tomas"], TALL),
    "ines": (repaint("pale translucent ghost girl").replace("same clothes and colors", "same lace dress and ribbon, and keep her ghostly look: pale blue-white, softly glowing, slightly see-through"), ["ines"], TALL),
    "bruma": (repaint("botanist woman"), ["bruma"], TALL),
    "baltasar": (repaint("cook"), ["baltasar"], TALL),
    "anacleto": (new("an elderly orchestra conductor from 1913: tall and thin, wild white hair, long white mustache, black tailcoat, "
                     "white bow tie, empty hands, friendly expressive face"), ["@paula"], TALL),
    "clemencia": (new("a plump cheerful pastry cook woman from 1913: rosy cheeks, grey hair in a bun, small white cap, "
                      "white apron over a dark blue dress, warm smile"), ["@paula"], TALL),
    "casimiro": (new("an old toymaker from 1913: short and round, small round glasses, white beard, leather apron full of tools, "
                     "rolled-up sleeves, kind smile"), ["@paula"], TALL),
    "fermin": (new("a painter from 1913: middle-aged man with a black beret, curly dark hair, thin mustache, "
                   "a white smock with colorful paint stains, a paintbrush behind his ear"), ["@paula"], TALL),
    "bartolo": (new("a cheerful adult puppeteer from 1913, a grown man about 35 years old with a curly black mustache and sideburns: slim, "
                    "striped shirt, red scarf, patched brown jacket, holding a small marionette on strings in one hand, big smile"), ["@paula"], TALL),
    "ramona": ("A hand-painted illustration of a barn owl standing with wings folded, white heart-shaped face, golden-brown speckled feathers, "
               "big dark gentle eyes, facing the viewer, " + STY + "Full body, centered." + BG, ["@paula"], WIDE),
    # Los doce criados fantasma (antes dibujados por código).
    "ghost-remedios": (ghost("wearing a tall white chef hat and holding a wooden spoon"), ["@cover"], WIDE),
    "ghost-anselmo": (ghost("wearing a black top hat and a dark coachman's scarf, a little serious"), ["@cover"], WIDE),
    "ghost-clotilde": (ghost("wearing a frilly lace maid bonnet and holding a feather duster, chatty smile"), ["@cover"], WIDE),
    "ghost-pepito": (ghost("wearing a small flat cap tilted to one side, mischievous surprised face, smaller than the others"), ["@cover"], WIDE),
    "ghost-florentina": (ghost("wearing small round glasses and a red pincushion on the wrist, shy smile"), ["@cover"], WIDE),
    "ghost-nicanor": (ghost("wearing a monocle and holding a golden pocket watch, stern face"), ["@cover"], WIDE),
    "ghost-leocadia": (ghost("with a big ring of old iron keys hanging at the waist, stern housekeeper face"), ["@cover"], WIDE),
    "ghost-serafin": (ghost("wearing a straw hat, sleepy half-closed eyes, holding a tiny watering can"), ["@cover"], WIDE),
    "ghost-crispulo": (ghost("wearing a red bow tie and holding a violin bow, happy face"), ["@cover"], WIDE),
    "ghost-tadeo": (ghost("holding a small old lantern that glows warm orange, happy face"), ["@cover"], WIDE),
    "ghost-engracia": (ghost("carrying a wicker laundry basket full of folded sheets, sleepy face"), ["@cover"], WIDE),
    "ghost-gumersindo": (ghost("wearing white gloves and holding a silver tray, surprised face with round mouth"), ["@cover"], WIDE),
    # Segunda planta (2.2): fantasmas pálidos como Elvira e Inés.
    "aurelia": (new("a very old great-grandmother ghost, about 90 years old: a wrinkled kind face with a warm smile, silver hair in a bun held by a tortoiseshell comb, "
                    "a black lace shawl over a deep plum-purple Victorian dress, a cameo brooch at the collar, leaning on a silver-topped walking cane; "
                    "her whole figure is pale, softly glowing and slightly see-through, like a friendly ghost"), ["@paula"], TALL),
    "rosalia": (new("a young governess teacher ghost, about 25 years old: freckles, auburn hair in a neat bun, small round glasses, a white blouse with a navy ribbon tie, "
                    "a long navy blue skirt, holding an open book in one arm and a wooden pointer in the other hand, a lively friendly face; "
                    "her whole figure is pale, softly glowing and slightly see-through, like a friendly ghost"), ["@paula"], TALL),
    # Parejas que bailan el vals en el salón de baile.
    "dancers-1": ("Two cute little ghosts made of flowing white sheets, like the small ghosts in image 1, dancing a waltz together, holding hands, "
                  "one wears a small black top hat and the other a tiny flower crown, happy faces, softly glowing pale blue-white, painted " + STY +
                  "Both figures complete, side by side, centered." + BG, ["@cover"], (1152, 1024)),
    "dancers-2": ("Two cute little ghosts made of flowing white sheets, like the small ghosts in image 1, dancing a waltz together, one twirling the other, "
                  "one wears a red bow tie and the other a lace veil, happy faces, softly glowing pale blue-white, painted " + STY +
                  "Both figures complete, side by side, centered." + BG, ["@cover"], (1152, 1024)),
}

WALKS = {
    "paula-walk": ("the girl from image 1 walking to the right", "@paula", (2560, 640),
                   "same black ruffled dress, same two long brown braids and same black boots in every frame"),
    "gafe-walk": ("the black cat from image 1 walking to the right", "gafe", (2560, 512),
                  "same black fur, same amber eyes, same tail in every frame"),
}


def refs_for(names):
    out = []
    for n in names:
        if n == "@paula":
            out.append(PAULA)
        elif n == "elvira-ghost":
            out.append(os.path.join(OUT, "elvira_s3.png"))
        elif n == "@room":
            out.append(ROOM)
        elif n == "@cover":
            out.append(COVER)
        else:
            out.append(pad_ref(art(f"character-{n}-v2.png") if os.path.exists(art(f"character-{n}-v2.png"))
                               else art(f"character-{n}-v1.png") if os.path.exists(art(f"character-{n}-v1.png"))
                               else art(f"character-{n}.png"), n))
    return out


def main() -> None:
    keys = sys.argv[1:] or list(SPECS) + list(WALKS)
    seeds = [int(s) for s in os.environ.get("SEEDS", "1,2").split(",")]
    for key in keys:
        for seed in seeds:
            out = os.path.join(OUT, f"{key}_s{seed}.png")
            if os.path.exists(out):
                continue
            t = time.time()
            if key in WALKS:
                who, ref, (w, h), same = WALKS[key]
                prompt = (f"A character animation sprite sheet: {who}, seen exactly from the side (profile), eight frames of one complete walk cycle "
                          f"in a single row, from left to right in order, evenly spaced, same size and same height in every frame, {same}; "
                          "the legs alternate step by step. Painted " + STY + BG.replace("no props, ", "no frame borders, "))
                refs = refs_for([ref]) + [ROOM]
            else:
                prompt, names, (w, h) = SPECS[key]
                refs = refs_for(names) + [ROOM]
            cg.edit(prompt, refs, out, w, h, seed=seed)
            print(key, seed, round(time.time() - t), "s", flush=True)


if __name__ == "__main__":
    main()
