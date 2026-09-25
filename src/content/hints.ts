/**
 * Pistas de Gafe (sin internet): al tocar a Gafe, dice (a su manera) qué
 * podría hacer Paula ahora. Gana la primera cuya condición se cumple, así que
 * van en el orden en que conviene resolver las cosas.
 */
import type { Cond } from "../core/rules";
import { solvedFlag } from "../core/puzzle";

const no = (c: Cond): Cond => ({ not: c });
const solved = (id: string): Cond => ({ flag: solvedFlag(id) });

export const GAFE_HINTS: { if: Cond; text: string }[] = [
  { if: no({ examined: "carta-mojada" }), text: "Miau. (Gafe olfatea un papel mojado junto a la alfombra del vestíbulo.)" },
  { if: no({ met: "basilio" }), text: "Miau. (Gafe mira al mayordomo alto del vestíbulo. Tiene cara de saber cosas… y de mentir.)" },
  { if: no({ flag: "sello-encontrado" }), text: "Miau. (Gafe se sienta delante del retrato de Aurelia y no le quita ojo. ¿Y si lo miras otra vez?)" },
  { if: no({ met: "ines" }), text: "Miau. (Gafe tira hacia la escalera. Arriba, pasada la galería, está el dormitorio de una niña.)" },
  { if: no({ quest: ["recuerdos", ">=", 1] }), text: "Miau. (Gafe maúlla mirando a Inés. Pregúntale por sus recuerdos.)" },
  { if: no(solved("reloj")), text: "Miau. (Gafe salta hacia la biblioteca. La tapa del reloj aritmético tiene forma de sello…)" },
  { if: no({ flag: "pacto-roto" }), text: "Miau. (Gafe tira hacia el arco del sótano. En la capilla del archivo hay un altar con dos huecos.)" },
  { if: no({ has: "canica-azul" }), text: "Miau. (Gafe mira fijamente la caja de música del dormitorio de Inés.)" },
  { if: no({ has: "foto-ines" }), text: "Miau. (Gafe araña el marco vacío de la galería de retratos.)" },
  { if: no({ has: "cilindro-cera" }), text: "Miau. (Gafe mueve la cola al ritmo del gramófono del salón de música.)" },
  { if: no({ quest: ["antidoto", ">=", 1] }), text: "Miau. (Gafe estornuda: huele a flores de luna. La señora Bruma, en el invernadero, necesita ayuda. Pregúntale por las flores.)" },
  { if: no({ has: "flor-luna" }), text: "Miau. (Gafe se sienta junto a las flores de luna del invernadero.)" },
  {
    if: { all: [no({ visited: "torre" }), no({ flag: "compuertas-abiertas" }), no({ flag: "pasarela-abierta" })] },
    text: "Miau. (Gafe duda entre el agua de los túneles y las estrellas del observatorio: a la torre se llega por los dos sitios.)",
  },
  { if: no({ visited: "torre" }), text: "Miau. (¡El camino a la torre está abierto! Gafe mira hacia arriba, muy arriba.)" },
  { if: no({ has: "cinta-roja" }), text: "Miau. (Gafe mira la esfera del reloj de la torre. Algo rojo cuelga de la aguja.)" },
  { if: no({ flag: "final" }), text: "Miau. (Gafe se sienta junto a la campana de las trece. Es el momento.)" },
  { if: { flag: "final" }, text: "Prrr. (Gafe ronronea. Todo ha salido bien.)" },
];
