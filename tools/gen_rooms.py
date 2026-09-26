"""
Pinta las seis salas nuevas (ala de la fiesta) con FLUX.2 klein, usando dos
salas existentes como referencia de estilo. Genera varias semillas por sala
en art/nuevas/<sala>_s<semilla>.png para elegir la mejor a ojo.

  python tools/gen_rooms.py [sala ...]
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import comfy_gen as cg  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "art", "nuevas")
REFS = [os.path.join(OUT, "ref_musica.png"), os.path.join(OUT, "ref_vestibulo.png")]

STYLE = ("Painted in exactly the same style as the reference images: rich dark gothic fantasy digital oil painting, painterly brushwork, "
         "dramatic chiaroscuro with deep blue shadows and warm golden pools of candlelight, glossy reflections on the floor, "
         "ornate Victorian details, slightly desaturated, cinematic storybook illustration. No people, no text, no watermark.")
VIEW = "Seen from the eye level of an adult standing near the entrance; a wide empty floor area fills the lower part of the picture so people can walk there. "

ROOMS = {
    "baile": (
        "A new room of the same haunted mansion: a vast grand ballroom. " + VIEW +
        "An enormous empty dance floor of dark polished parquet with a big faded circular inlay. Three giant crystal chandeliers with lit candles "
        "hang from a high vaulted painted ceiling. Tall arched gothic windows with rain and blue moonlight along the left wall, one of them is a glass door to a terrace, "
        "heavy red velvet curtains, a tall gilded mirror on the right wall, a small orchestra platform with a conductor's music stand, a cello and a drum at the back right, "
        "a tall double door at the far end, a few chairs covered with white dust sheets along the walls."
    ),
    "comedor": (
        "A new room of the same haunted mansion: a long formal dining hall. " + VIEW +
        "A very long banquet table with a white lace tablecloth runs from the middle of the room towards the back, set with plates, silver cutlery and crystal glasses, "
        "tall silver candelabras with lit candles, a big three-tier birthday cake under a glass dome in the middle of the table, high-backed carved chairs. "
        "A huge stone fireplace with a small fire on the right wall, a dark wooden sideboard with stacked porcelain on the left wall, "
        "a narrow service door on the left, an arched doorway at the back, tapestries, a tall window with rain."
    ),
    "jardin": (
        "The night garden of the same haunted mansion, outdoors: the entrance to a hedge maze. " + VIEW +
        "A wide gravel courtyard in the foreground, tall trimmed dark green hedges forming the arched entrance of a labyrinth in the middle, "
        "a round stone fountain with a small angel statue and water on the left, wrought-iron garden lanterns glowing warm, fireflies, "
        "a stone bench, rose bushes, ivy, the dark silhouette of the mansion with lit windows and a glass greenhouse at the right edge, "
        "a full moon behind thin clouds, light drizzle, wet stones reflecting the lanterns."
    ),
    "taller": (
        "A new room of the same haunted mansion: a toymaker's workshop under the roof. " + VIEW +
        "A big wooden workbench covered with brass gears, tools and half-built wooden toys, clockwork automatons standing around "
        "(a ballerina on a music box, a tin drummer soldier, a wooden horse), shelves full of porcelain dolls, puppets and music boxes, "
        "a large brass clockwork wheel on the wall, a glowing magnifying lamp, wood shavings on the plank floor, a small round window with moonlight, "
        "a door on the left and an arched doorway at the back right."
    ),
    "estudio": (
        "A new room of the same haunted mansion: a painter's studio under a huge slanted skylight window showing the full moon. " + VIEW +
        "Several wooden easels with unfinished paintings, one big easel in the middle with a half-painted portrait of a smiling girl with a red ribbon, "
        "a table with jars of paint, brushes and a wooden palette full of colors, canvases leaning against the walls, plaster busts, "
        "a draped velvet sofa, a folding screen, paint stains on the wooden floor, a door on the right and a curtained doorway at the back."
    ),
    "teatro": (
        "A new room of the same haunted mansion: a small children's puppet theatre room. " + VIEW +
        "At the back, a wooden puppet stage with a red velvet curtain half open and a painted backdrop of a starry sky, "
        "string marionettes hanging above it (a princess, a knight, a dragon, a black cat), rows of small wooden chairs for a child audience, "
        "garlands of little paper flags, a trunk full of costumes and hats, candle footlights on the front of the stage, "
        "a door on the left wall and a narrow door on the right wall."
    ),
}


def main() -> None:
    names = sys.argv[1:] or list(ROOMS)
    seeds = [int(s) for s in os.environ.get("SEEDS", "31,32,33,34").split(",")]
    for name in names:
        for seed in seeds:
            out = os.path.join(OUT, f"{name}_s{seed}.png")
            if os.path.exists(out):
                continue
            t = time.time()
            cg.edit(ROOMS[name] + " " + STYLE, REFS, out, 1920, 1088, seed=seed)
            print(name, seed, round(time.time() - t), "s", flush=True)


if __name__ == "__main__":
    main()
