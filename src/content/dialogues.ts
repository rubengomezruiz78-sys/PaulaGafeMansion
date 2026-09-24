/**
 * Conversaciones ramificadas con memoria. Cada personaje recuerda lo que le
 * ha contado a Paula y lo que ella le ha preguntado, y su trato cambia con la
 * afinidad. Las entradas van de lo más específico a lo más genérico.
 */
import type { DialogueTree } from "../core/dialogue";

const bye = { id: "adios", text: "Hasta luego." };

export const DIALOGUES: Record<string, DialogueTree> = {
  basilio: {
    npc: "basilio",
    entries: [
      { if: { all: [{ has: "sello-aurelia" }, { not: { seen: ["basilio", "sello"] } }] }, node: "sello" },
      { if: { met: "basilio" }, node: "otra-vez" },
      { node: "hola" },
    ],
    nodes: [
      {
        id: "hola",
        lines: [
          "Bienvenida, señorita Paula. Soy Don Basilio, mayordomo de esta casa… y de sus secretos.",
          { by: "paula", text: "¿Cómo sabe mi nombre?" },
          "Un buen mayordomo lo sabe todo. Un mal mayordomo lo inventa. Yo soy un poco de cada.",
        ],
        next: "menu",
      },
      { id: "otra-vez", lines: ["¡Señorita Paula! La casa y yo la echábamos de menos. Sobre todo yo. Creo."], next: "menu" },
      {
        id: "menu",
        lines: ["¿En qué puedo… confundirla hoy?"],
        choices: [
          { id: "quien", text: "¿Quién es usted de verdad?", once: true, goto: "quien", effects: [{ affinity: ["basilio", 3] }] },
          { id: "puertas", text: "¿Qué puerta es la segura?", goto: "puertas" },
          { id: "carta", text: "¿Ha visto una carta mojada?", if: { examined: "carta-mojada" }, once: true, goto: "carta" },
          { id: "mentiras", text: "¿Por qué miente tanto?", if: { chose: ["basilio", "puertas"] }, once: true, goto: "mentiras", effects: [{ affinity: ["basilio", 5] }] },
          { id: "verdad", text: "Dígame una verdad. Solo una.", if: { affinity: ["basilio", ">=", 8] }, once: true, goto: "verdad" },
          bye,
        ],
      },
      {
        id: "quien",
        lines: [
          "Morí en 1913, un martes. Muy mal día para morirse: tocaba plata.",
          "Desde entonces sirvo a la casa. Ella no paga, pero tampoco despide.",
        ],
        next: "menu",
      },
      {
        id: "puertas",
        lines: [
          "La verde, sin duda. Ignore el olor a carbón y ese letrero que pone «servicio». Los letreros exageran.",
          { by: "gafe", text: "Miau. (Gafe mira a Basilio con los ojos entornados. Se está atusando el bigote.)" },
        ],
        next: "menu",
      },
      {
        id: "carta",
        lines: [
          "¿Carta? Aquí nunca hubo cartas. Y desde luego no hay media carta empapada junto a la alfombra. Qué ocurrencia.",
          { by: "paula", text: "Yo no he dicho que estuviera junto a la alfombra…" },
          "…Tampoco yo. Lo ha dicho usted. Qué niña más lista.",
        ],
        effects: [{ set: "basilio-pillado-carta" }],
        next: "menu",
      },
      {
        id: "mentiras",
        lines: [
          "Porque la casa escucha, señorita. Y a quien dice la verdad aquí… la casa se lo quita todo.",
          "Mentir es mi manera de protegerla. Un poco. A veces. Casi nunca.",
        ],
        next: "menu",
      },
      {
        id: "verdad",
        lines: [
          "Está bien. Una, y no se la diga a nadie:",
          "Aurelia escondió algo detrás de su propio retrato. El marco solo se mueve si antes lo miras con atención.",
        ],
        effects: [{ set: "pista-retrato" }],
        next: "menu",
      },
      {
        id: "sello",
        lines: [
          "Ese sello… ¿Dónde lo ha encontrado? No, no me lo diga. Ya lo sé. Detrás de ella.",
          "Con eso la biblioteca la reconocerá como heredera. Doña Elvira no podrá negarse.",
        ],
        effects: [{ affinity: ["basilio", 4] }],
        next: "menu",
      },
    ],
  },

  elvira: {
    npc: "elvira",
    entries: [
      { if: { has: "engranaje-marfil" }, node: "engranaje" },
      { if: { met: "elvira" }, node: "otra-vez" },
      { node: "hola" },
    ],
    nodes: [
      {
        id: "hola",
        lines: [
          "¿Una visita? Silencio, por favor: los libros duermen.",
          "Soy Elvira. Administré esta casa cuando aún fingía ser respetable.",
        ],
        next: "menu",
      },
      { id: "otra-vez", lines: ["Otra vez tú. Habla bajito."], next: "menu" },
      {
        id: "menu",
        lines: ["¿Qué necesitas?"],
        choices: [
          { id: "reloj", text: "¿Qué mide ese reloj enorme?", goto: "reloj" },
          { id: "ines", text: "¿Conociste a Inés?", once: true, goto: "ines", effects: [{ affinity: ["elvira", 4] }] },
          { id: "pista", text: "¿Me das una pista para el reloj?", if: { quest: ["reloj", ">=", 1] }, goto: "pista" },
          { id: "confiar", text: "¿Puedo confiar en ti?", once: true, goto: "confiar" },
          bye,
        ],
      },
      {
        id: "reloj",
        lines: [
          "No mide horas. Cuenta las noches que la familia fingió no oír a Inés.",
          "Si resuelves sus cuentas, te entregará lo que guarda dentro.",
        ],
        effects: [{ stage: ["reloj", 1] }],
        next: "menu",
      },
      {
        id: "ines",
        lines: [
          "Venía aquí a leer a escondidas. Doblaba pájaros de papel con las páginas que no le gustaban.",
          "Yo hacía como que no la veía. Era… agradable, no estar sola.",
        ],
        next: "menu",
      },
      {
        id: "pista",
        lines: ["Empieza por la primera cuenta: siete noches, nueve campanadas cada noche. Suma o multiplica, como prefieras."],
        next: "menu",
      },
      {
        id: "confiar",
        lines: ["No. Pero puedes comprobar mis cuentas, que es bastante mejor que confiar en alguien."],
        effects: [{ affinity: ["elvira", 2] }],
        next: "menu",
      },
      {
        id: "engranaje",
        lines: [
          "Has resuelto el reloj. Hacía cien años que nadie lo conseguía.",
          "Ese engranaje de marfil no es mío: pertenece a la puerta del archivo. Llévalo con cuidado.",
        ],
        effects: [{ affinity: ["elvira", 6] }],
        next: "menu",
      },
    ],
  },
};
