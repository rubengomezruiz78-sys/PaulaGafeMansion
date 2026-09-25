/**
 * Conversaciones ramificadas con memoria. Cada personaje recuerda lo que le
 * ha contado a Paula y lo que ella le ha preguntado, y su trato cambia con la
 * afinidad. Las entradas van de lo más específico a lo más genérico.
 */
import type { DialogueTree, Line } from "../core/dialogue";
import type { Cond, Effect } from "../core/rules";

const bye = { id: "adios", text: "Hasta luego." };

interface Topic {
  id: string;
  /** Lo que pregunta Paula. */
  text: string;
  lines: Line[];
  if?: Cond;
  once?: boolean;
  effects?: Effect[];
}

/**
 * Conversación típica: presentación la primera vez, otro saludo las
 * siguientes, y un menú de temas que vuelve tras cada respuesta.
 */
function tree(npc: string, intro: Line[], again: Line[], menuLine: string, topics: Topic[]): DialogueTree {
  return {
    npc,
    entries: [{ if: { met: npc }, node: "otra-vez" }, { node: "hola" }],
    nodes: [
      { id: "hola", lines: intro, next: "menu" },
      { id: "otra-vez", lines: again, next: "menu" },
      {
        id: "menu",
        lines: [menuLine],
        choices: [
          ...topics.map((t) => ({ id: t.id, text: t.text, if: t.if, once: t.once, effects: t.effects, goto: t.id })),
          bye,
        ],
      },
      ...topics.map((t) => ({ id: t.id, lines: t.lines, next: "menu" })),
    ],
  };
}

const paula = (text: string): Line => ({ by: "paula", text });

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

  tomas: tree("tomas",
    ["Yo cerré la capilla. Creí que así la protegía.", paula("¿Proteger qué?"), "La voz de Inés. Pero cerré la puerta equivocada."],
    ["Otra vez por la cocina, niña. Cuidado con la caldera."],
    "¿Qué quieres saber?",
    [
      { id: "capilla", text: "¿Qué pasó en la capilla?", once: true, effects: [{ affinity: ["tomas", 3] }],
        lines: ["Trece criados entraron a rezar por Inés. Salieron doce.", "La casa se quedó con la niña. Y yo cerré la puerta… con ella dentro."] },
      { id: "caldera", text: "¿Qué le pasa a la caldera?", effects: [{ stage: ["porton", 1] }],
        lines: ["Respira mal. Hay que devolverle la presión exacta.", "Los pulsos se reparten entre los tubos, y cada salida gira siete veces."] },
      { id: "porton", text: "Oí que el portón solo se abre con la presión justa.", if: { flag: "sabe-porton-presion" }, once: true,
        effects: [{ affinity: ["tomas", 4] }, { set: "tomas-confia" }],
        lines: ["¿Quién te lo ha contado? ¿Remedios? Esa mujer lo oye todo.", "Sí: con la presión justa, la palanca cede y el portón baja al aljibe."] },
      { id: "basilio", text: "¿Basilio le engañó?", once: true,
        lines: ["Me dio una llave de porcelana y me juró que era irrompible.", "Todavía se ríe cuando se acuerda."] },
    ]),

  ines: tree("ines",
    ["Paula… eres tú. Tienes los ojos de Aurelia.", paula("¿Conociste a mi bisabuela?"), "Hizo el pacto para protegerme. Pero la casa se quedó con mis recuerdos."],
    ["Sigues aquí. Gracias por no irte."],
    "¿Qué quieres preguntarme?",
    [
      { id: "recuerdos", text: "¿Dónde están tus recuerdos?", effects: [{ stage: ["recuerdos", 1] }],
        lines: ["Repartidos por la casa: una canica azul, una cinta roja, una fotografía…", "La casa los esconde en cosas corrientes. Tú sabrás verlos."] },
      { id: "campana", text: "¿Por qué no hay que tocar la campana?",
        lines: ["Si suena trece veces, olvidaré lo último que me queda.", "Tu voz, Paula. Ya es lo único que recuerdo."] },
      { id: "trece", text: "¿Eres tú la decimotercera?", once: true, effects: [{ affinity: ["ines", 5] }],
        lines: ["Entré con los doce criados para esconderme de la tormenta.", "Ellos encontraron la salida. Yo no."] },
      { id: "gafe", text: "¿Conoces a Gafe?", once: true,
        lines: ["¡Claro! Venía a mi ventana todas las noches.", { by: "gafe", text: "Miau. (Gafe ronronea. Es la primera vez en toda la noche.)" }] },
    ]),

  bruma: tree("bruma",
    ["Bienvenida al invernadero de luna, niña.", "Aquí las flores solo abren cuando oyen la verdad."],
    ["¿Vuelves a ver mis flores? Hazlo en voz bajita."],
    "¿En qué te ayudo?",
    [
      { id: "flores", text: "¿Qué flores sirven?",
        lines: ["Las pálidas. Ocho macetas, tres flores en cada una.", "La de la derecha imita voces. No imita la verdad."] },
      { id: "antidoto", text: "Oí que preparas un antídoto de luna.", if: { flag: "pista-antidoto" }, once: true,
        effects: [{ stage: ["antidoto", 1] }, { affinity: ["bruma", 4] }],
        lines: ["Para que las flores dejen de repetir voces ajenas.", "Si me ayudas con las proporciones, te daré una lente que ve la tinta de luna."] },
      { id: "ines", text: "¿Conociste a Inés?", once: true,
        lines: ["Venía a dibujar raíces.", "Decía que bajo la casa todas apuntaban a la misma campana."] },
      { id: "viva", text: "¿Usted no es un fantasma?", once: true, effects: [{ affinity: ["bruma", 3] }],
        lines: ["Todavía no, niña. Vengo de día a cuidar las plantas.", "Esta noche la tormenta no me deja salir. Como a ti."] },
    ]),

  baltasar: tree("baltasar",
    ["¡Baltasar, cocinero de esta casa y tenor incomprendido!", "La casa me prohibió cantar, así que escondí un secreto en una melodía."],
    ["¡Mi público favorito ha vuelto!"],
    "¿Qué desea la señorita?",
    [
      { id: "cantar", text: "¡Cante algo!", lines: ["¡Do, mi, sol! ¡Do, mi, sol!", "¿Lo oyes? Ahí está todo. Solo hay que escuchar."] },
      { id: "melodia", text: "¿Qué nota va después del sol?", if: { flag: "pista-melodia" }, once: true, effects: [{ set: "sabe-melodia" }],
        lines: ["¡Después del sol, vuelta a empezar! Do.", "Como las estaciones. Como los sustos. Como todo aquí."] },
      { id: "cocina", text: "¿Por qué dejó la cocina?", once: true,
        lines: ["Remedios cocina mejor.", "Pero no se lo digas, que se le sube a la cabeza."] },
    ]),

  remedios: tree("remedios",
    ["¡Pasa, pasa! Soy Remedios, la cocinera.", "Aunque ya no cocino: los fantasmas no comen. ¡Pero olemos!"],
    ["¡Mi niña! ¿Has comido algo desde la última vez?"],
    "¿Qué te pongo?",
    [
      { id: "caldera", text: "¿Sabe algo de la caldera?",
        lines: ["Que respira mal. Tomás sabe arreglarla, pero es muy cabezota.", "Háblale con cariño. Y pregúntale por la presión."] },
      { id: "galleta", text: "¿Tiene galletas?", once: true, effects: [{ give: "galleta-piedra" }, { affinity: ["remedios", 5] }],
        lines: ["Una. De 1913. Dura como una piedra.", "Para ti. Seguro que alguien la aprecia más que tú."] },
    ]),

  anselmo: tree("anselmo",
    ["Anselmo, cochero de la familia Valcárcel.", "Para servirla… cuando pare de llover."],
    ["Sigue lloviendo, señorita."],
    "¿Qué necesita?",
    [
      { id: "camino", text: "¿Cómo se sale de aquí?",
        lines: ["El camino se abre al amanecer.", "Pero esta casa no amanece mientras la campana siga contando."] },
      { id: "aurelia", text: "¿Conoció a Aurelia?", once: true, effects: [{ affinity: ["anselmo", 3] }],
        lines: ["La llevé al pueblo cien veces. Siempre con su brújula.", "Como la que lleva usted. Idéntica."] },
    ]),

  clotilde: tree("clotilde",
    ["Clotilde, doncella. Y la mejor informada de la casa, modestamente."],
    ["¿Vienes a por más noticias? Tengo un montón."],
    "¿Qué quieres saber?",
    [
      { id: "rumor", text: "¿Qué se cuenta por los pasillos?",
        lines: ["Que Don Basilio miente cuando se atusa el bigote.", "Que Elvira no sonríe desde 1913.", "Y que el retrato de Aurelia se mueve si lo miras con atención."] },
      { id: "ines", text: "¿Qué sabes de Inés?",
        lines: ["Que se escondía en su cuarto a buscar estrellas en el techo.", "Pregúntale a Florentina: le cosía los vestidos."] },
    ]),

  pepito: tree("pepito",
    ["¡Soy Pepito! Cuidaba los caballos.", "Ahora cuido… nada. ¡Juego al escondite!"],
    ["¡Me has encontrado otra vez!"],
    "¿A qué jugamos?",
    [
      { id: "escondite", text: "¿Jugamos al escondite?", once: true, effects: [{ stage: ["escondite", 1] }],
        lines: ["¡Vale! Yo me escondo por la casa.", "Si me encuentras en tres sitios distintos, te doy mi tesoro."] },
      { id: "galleta", text: "Toma, una galleta de Remedios.", if: { has: "galleta-piedra" }, once: true,
        effects: [{ take: "galleta-piedra" }, { set: "pista-baul" }, { affinity: ["pepito", 10] }],
        lines: ["¡Una galleta de 1913! ¡Mi favorita!", "Te cuento un secreto: en el desván hay un baúl con un siete pintado. Huele a tinta."] },
    ]),

  florentina: tree("florentina",
    ["Soy Florentina. Coso… coso cosas.", "Para Inés, sobre todo."],
    ["Hola otra vez… no hagas ruido, que se me escapa la aguja."],
    "¿Sí?",
    [
      { id: "muneca", text: "¿Para quién es la muñeca?", lines: ["Para Inés. Le faltan los ojos de botón.", "Y la cinta roja. La cinta era lo más importante."] },
      { id: "cinta", text: "¿Dónde está la cinta roja?", if: { flag: "sabe-cinta-roja" },
        lines: ["En la torre. Atada lejos de la campana.", "Inés decía que la respuesta no necesita golpes."] },
    ]),

  nicanor: tree("nicanor",
    ["Nicanor, relojero.", "Arreglo relojes que no quieren ser arreglados."],
    ["Tic, tac. Vuelves."],
    "Pregunta rápido: el tiempo corre.",
    [
      { id: "reloj", text: "¿Cómo funciona el reloj de la biblioteca?",
        lines: ["Tres discos. Cada respuesta correcta mueve una aguja.", "Un error no rompe nada: el disco se para y te deja pensar otra vez."] },
      { id: "trece", text: "¿Por qué todo acaba en trece?", once: true,
        lines: ["Porque trece entraron en la capilla.", "Y esta casa nunca olvida una cuenta."] },
    ]),

  leocadia: tree("leocadia",
    ["Leocadia, ama de llaves.", "Tengo una llave para cada puerta de esta casa."],
    ["¿Otra vez tú? Límpiate los pies."],
    "¿Qué puerta te interesa?",
    [
      { id: "torre", text: "¿Tiene la llave de la torre?",
        lines: ["La pasarela de la torre se cierra por dentro. Ni mis llaves pueden con ese cerrojo.", "Hay que llegar por abajo. Por el agua."] },
      { id: "archivo", text: "¿Qué hay en el archivo?",
        lines: ["El registro de los trece.", "Y una puerta que nadie debería abrir… salvo quien sepa romper el pacto."] },
    ]),

  serafin: tree("serafin",
    ["Serafín… jardinero… zzz…", "Perdona. Me quedo dormido entre las macetas."],
    ["¿Eh? Ah, eres tú. Zzz… hola."],
    "¿Mmm?",
    [
      { id: "semillas", text: "¿Qué son las semillas de luna?",
        lines: ["Palpitan cuando dices la verdad.", "Si exageras, se quedan quietas. Como yo… zzz."] },
      { id: "bruma", text: "¿La señora Bruma es un fantasma?", once: true,
        lines: ["No, no. Ella está viva.", "Por eso las plantas la quieren tanto."] },
    ]),

  crispulo: tree("crispulo",
    ["Críspulo, primer violín.", "Sin violín, pero primer."],
    ["¡Mi oyente! ¿Una pieza?"],
    "¿Qué quieres oír?",
    [
      { id: "violin", text: "¿Qué le pasó a su violín?", once: true,
        lines: ["La casa se lo quedó el día de la capilla.", "A veces lo oigo sonar en el desván."] },
      { id: "melodia", text: "¿Cuál es la melodía de la casa?",
        lines: ["Tres notas y vuelta a empezar.", "Pregúntale a Baltasar, que se cree el dueño."] },
    ]),

  tadeo: tree("tadeo",
    ["Tadeo, farolero.", "Donde yo voy, hay luz."],
    ["¡Luz para ti otra vez!"],
    "¿Qué quieres saber?",
    [
      { id: "tuneles", text: "¿Qué hay en los túneles?",
        lines: ["Agua, compuertas y una escalera que sube a la torre.", "El agua refleja otra casa, con todas las ventanas encendidas."] },
      { id: "compuertas", text: "¿En qué orden se abren las compuertas?", if: { flag: "pista-compuertas" },
        lines: ["La primera antes que la tercera. La segunda, después de la tercera.", "Si te equivocas no pasa nada: el agua avisa y se vuelve a empezar."] },
    ]),

  engracia: tree("engracia",
    ["Engracia, lavandera.", "Aquí arriba tiendo sábanas que se escapan solas."],
    ["Ay, hola. Qué sueño."],
    "¿Qué quieres, criatura?",
    [
      { id: "baules", text: "¿Qué hay en los baúles?", lines: ["Ropa, recuerdos, polvo.", "Y uno que huele a tinta. No sé cuál."] },
      { id: "baul", text: "¿El baúl número siete?", if: { flag: "pista-baul" },
        lines: ["¡Ese! Tiene un papel dentro.", "Lo guardó Inés. Creo que es un plano."] },
    ]),

  gumersindo: tree("gumersindo",
    ["Gumersindo, lacayo.", "¡Perdón por adelantado por lo que se me caiga!"],
    ["¡Hola! No he roto nada desde la última vez. Casi."],
    "¿En qué puedo… no tirar nada?",
    [
      { id: "guante", text: "¿Ha perdido un guante?",
        lines: ["¡Sí! Un guante blanco.", "Creo que me lo quitó el barón Pelusa. Es un perro de un retrato. No preguntes."] },
      { id: "basilio", text: "¿Cómo es Don Basilio?", once: true,
        lines: ["Miente mucho, pero nos cuida a todos.", "Creo que tiene miedo de que la casa nos olvide."] },
    ]),
};
