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

const gafeSays = (text: string): Line => ({ by: "gafe", text });
const empieza = { stage: ["fiesta", 1] as [string, number] };

export const DIALOGUES: Record<string, DialogueTree> = {
  // ======================================================== ala de la fiesta
  anacleto: tree(
    "anacleto",
    [
      "¡Por fin alguien con oído! Soy el maestro Anacleto, director de la orquesta de esta casa.",
      "Estábamos ensayando el vals del cumpleaños de Inés cuando… bueno, cuando todo se paró.",
    ],
    ["¡Mi oyente favorita! Bueno, mi única oyente."],
    "¿Qué quieres saber, pequeña?",
    [
      {
        id: "fiesta", text: "¿Qué fiesta?", once: true, effects: [empieza, { affinity: ["anacleto", 3] }],
        lines: [
          "Inés iba a cumplir diez años aquella noche. Todo estaba casi listo: la música, la tarta, los farolillos, la función…",
          "Pero la casa se puso a contar hasta trece y la fiesta se quedó a medio preparar. Si la terminamos, quizá la casa se acuerde de ser feliz.",
        ],
      },
      {
        id: "vals", text: "¿Cómo es el vals?", if: { quest: ["fiesta", ">=", 1] },
        lines: [
          "Empieza como la caja de música de Inés. Luego baja… y luego se me olvida.",
          "Con mi batuta lo recordaría. Pero la he perdido. Creo que me la llevé al jardín a dirigir a las ranas.",
        ],
      },
      {
        id: "batuta", text: "¡He encontrado su batuta!", if: { has: "batuta" }, once: true, effects: [{ affinity: ["anacleto", 4] }],
        lines: ["¡Mi batuta! Está empapada… ¡pero entera! Déjala en el atril de la tarima: yo tarareo y tú tocas."],
      },
      {
        id: "despues", text: "¿Qué más hace falta para la fiesta?", if: { quest: ["fiesta", ">=", 1] },
        lines: [
          "La tarta, pregúntale a Tía Clemencia en el comedor. El regalo, a Casimiro. Las invitaciones, a Fermín. La función, a Bartolo.",
          "Y los farolillos… eso es cosa de las luciérnagas del jardín. Llevas {fiesta} de 6.",
        ],
      },
    ],
  ),
  clemencia: tree(
    "clemencia",
    ["¡Una invitada! Soy Tía Clemencia, la repostera. La tarta de Inés es cosa mía, que no te engañe Remedios."],
    ["¡Paula, cariño! ¿Vienes a probar el merengue? Todavía no se puede."],
    "¿En qué te ayudo, bonita?",
    [
      {
        id: "tarta", text: "¿Para quién es la tarta?", effects: [empieza],
        lines: [
          "Para Inés, que cumplía diez años. Tres pisos, ocho trozos por piso. Y que nadie se quede sin tarta.",
          "Pero la mesa está hecha un desastre: los platos revueltos y la tarta sin partir. ¿Me ayudas? Mira la mesa del banquete.",
        ],
      },
      {
        id: "remedios", text: "¿Usted conoce a Remedios?",
        lines: ["¡Desde niñas! Ella hace el pan y yo los dulces. Ella dice que su bizcocho es mejor. Ella exagera, cariño."],
      },
      {
        id: "lista", text: "¿Ya está lista la mesa?", if: { flag: "resuelto:banquete" },
        lines: ["¡Preciosa! Ahora solo falta encender las velas… y eso será cuando suene la campana."],
      },
    ],
  ),
  casimiro: tree(
    "casimiro",
    ["Casimiro, juguetero, para servirte. Todo lo que ves lo hice con estas manos… cuando eran manos de verdad."],
    ["¡Hola, Paula! No toques el soldado de plomo, que tiene cosquillas."],
    "¿Quieres saber algo de mis juguetes?",
    [
      {
        id: "bailarina", text: "¿Qué es esa bailarina?", effects: [empieza],
        lines: [
          "El regalo de cumpleaños de Inés: una bailarina de cuerda sobre una cajita de música.",
          "Se me mezclaron todas las piezas en el cajón y, encima, he perdido la llavecita de cuerda. Creo que se la presté a Bartolo.",
        ],
      },
      {
        id: "ruedas", text: "¿Cómo funcionan los engranajes?", if: { chose: ["casimiro", "bailarina"] },
        lines: ["Muy fácil: las ruedas que se besan giran al revés. Si una va hacia la derecha, su vecina va hacia la izquierda."],
      },
      {
        id: "llave", text: "Tengo una llave de cuerda.", if: { has: "llave-cuerda" }, once: true, effects: [{ affinity: ["casimiro", 4] }],
        lines: ["¡Mi llavecita! Con esto ya puedo despertar a la bailarina. Ven al banco de trabajo y la montamos juntos."],
      },
    ],
  ),
  fermin: tree(
    "fermin",
    ["Fermín, pintor de la familia Valcárcel. Pinté todos los retratos de la galería… menos el que se borró."],
    ["¡Mi modelo favorita! Quieta un momento… ya. Hola."],
    "¿Qué te trae por mi estudio?",
    [
      {
        id: "invitaciones", text: "¿Qué está pintando?", effects: [empieza],
        lines: [
          "Las invitaciones de la fiesta de Inés: trece, una para cada uno de la casa.",
          "Pero solo me quedan rojo, amarillo, azul y blanco. Los demás colores hay que mezclarlos, y a mí me tiemblan las manos desde 1913.",
        ],
      },
      {
        id: "colores", text: "¿Cómo se hacen los colores?",
        lines: ["Con rojo, amarillo, azul y blanco se pinta el mundo entero. Rojo y amarillo, naranja. Amarillo y azul, verde… ¿y los demás? ¡Pruébalo en el caballete!"],
      },
      {
        id: "retrato", text: "¿Qué retrato se borró?", if: { visited: "galeria" },
        lines: ["El de Inés. La casa lo borró cuando se olvidó de ella. Lo estoy pintando otra vez, de memoria: mira el caballete grande."],
      },
    ],
  ),
  bartolo: tree(
    "bartolo",
    ["¡Bartolo, titiritero, a su servicio! Bueno, al tuyo. Este es el teatrito de Inés, lo más bonito de la casa."],
    ["¡Vuelve el público! ¡Aplausos, aplausos! (Se aplaude a sí mismo.)"],
    "¿Qué quiere saber la señorita espectadora?",
    [
      {
        id: "funcion", text: "¿Qué función es?", effects: [empieza],
        lines: [
          "«La niña que contó hasta trece». La escribí para el cumpleaños de Inés.",
          "Con la tormenta se me desordenaron las escenas y las marionetas. ¿Me ayudas a ordenarlas en el escenario?",
        ],
      },
      {
        id: "llave", text: "¿Tienes la llave de cuerda de Casimiro?", if: { chose: ["casimiro", "bailarina"] }, once: true,
        effects: [{ set: "pista-llave" }],
        lines: [
          "¿La llavecita? Ay… la usé para que el dragón moviera las alas. Se quedó en el baúl de los disfraces, dentro del sombrero de copa.",
          "Búscala tú, que yo me pierdo entre tanta capa.",
        ],
      },
      {
        id: "dragon", text: "¿Muerde el dragón?",
        lines: ["Solo a los que no aplauden. Tú aplaudes, ¿verdad?", gafeSays("Miau. (Gafe mira al dragón de trapo muy fijamente.)")],
      },
    ],
  ),
  ramona: tree(
    "ramona",
    ["Uuh-uuh. Soy Ramona. Vigilo el jardín desde que el jardinero se quedó dormido. Hace mucho.", "Tú eres la niña de la brújula. El viento lo cuenta todo."],
    ["Uuh-uuh. Otra vez tú. Y el gato. Que no se acerque a mis plumas."],
    "¿Qué quieres, niña?",
    [
      {
        id: "laberinto", text: "¿Qué hay en el laberinto?", effects: [empieza],
        lines: [
          "Luciérnagas perdidas. Eran los farolillos de la fiesta de Inés: se metieron entre los setos y no saben salir.",
          "Desde arriba se ve: la luz siempre quiere ir hacia la derecha. Tú guíalas desde la entrada.",
        ],
      },
      {
        id: "batuta", text: "¿Ha visto una batuta?",
        lines: ["Uuh. Las ranas de la fuente la usan para dirigir el coro. Mete la mano en el agua, sin miedo: no muerden."],
      },
      {
        id: "gafe", text: "¿Le dan miedo los gatos?",
        lines: ["¿Miedo? Soy una lechuza. Los gatos me dan… respeto. Mucho respeto.", gafeSays("Miau. (Gafe se relame. Ramona se esponja.)")],
      },
    ],
  ),

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
        lines: ["Repartidos por la casa: una canica azul, una cinta roja, una fotografía, un cilindro con mi voz y una flor de luna.", "La casa los esconde en cosas corrientes. Tú sabrás verlos."] },
      { id: "cinco", text: "¡Tengo tus cinco recuerdos!", if: { counter: ["recuerdos", ">=", 5] }, once: true, effects: [{ affinity: ["ines", 10] }],
        lines: ["Los noto… como cuando te acuerdas de un sueño.", "Llévalos a la torre. La campana tiene que oír la cuenta entera. Un golpe no sirve."] },
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
      { id: "ayudar", text: "¿Puedo ayudarla con las flores?", if: { all: [{ chose: ["bruma", "flores"] }, { not: { quest: ["antidoto", ">=", 1] } }] }, once: true,
        effects: [{ stage: ["antidoto", 1] }],
        lines: ["Pues sí. Preparo un antídoto de luna para que las flores dejen de repetir voces ajenas.", "Si me ayudas con las proporciones, te daré una lente que ve la tinta de luna. Y una flor que era de Inés."] },
      { id: "gracias", text: "¡El antídoto ya está!", if: { flag: "resuelto:antidoto" }, once: true, effects: [{ affinity: ["bruma", 4] }],
        lines: ["Las flores ya solo dicen la verdad. Gracias, niña.", "Esa lente ve lo que otros no ven. Prueba con el telescopio del observatorio."] },
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
      { id: "rumor", text: "¿Qué se cuenta por los pasillos?", effects: [{ set: "pista-retrato" }],
        lines: ["Que Don Basilio miente cuando se atusa el bigote.", "Que Elvira no sonríe desde 1913.", "Y que el retrato de Aurelia se mueve si lo miras con atención."] },
      { id: "ines", text: "¿Qué sabes de Inés?",
        lines: ["Que se escondía en su cuarto a buscar estrellas en el techo.", "Pregúntale a Florentina: le cosía los vestidos."] },
    ]),

  pepito: tree("pepito",
    ["¡Soy Pepito! Cuidaba los caballos.", "Ahora cuido… nada. ¡Juego al escondite!"],
    ["¡Me has encontrado otra vez!"],
    "¿A qué jugamos?",
    [
      { id: "escondite", text: "¿Jugamos al escondite?", once: true, effects: [{ stage: ["escondite", 1] }, { mark: "pepito-visto" }],
        lines: ["¡Vale! Yo me escondo por la casa y tú me buscas.", "Si me encuentras en tres salas distintas, te cuento un secreto de la campana."] },
      { id: "pillado", text: "¡Te pillé, Pepito!",
        if: { all: [{ quest: ["escondite", "==", 1] }, { not: { marked: "pepito-visto" } }, { counter: ["pepito-pillado", "<", 3] }] },
        effects: [{ mark: "pepito-visto" }, { count: "pepito-pillado" }, { affinity: ["pepito", 2] }],
        lines: ["¡Jo! ¡Me has pillado aquí también!", "Llevas {pepito-pillado} de 3."] },
      { id: "tesoro", text: "¡Te he encontrado tres veces!", if: { counter: ["pepito-pillado", ">=", 3] }, once: true,
        effects: [{ complete: "escondite" }, { set: "pista-campana" }, { affinity: ["pepito", 10] }],
        lines: ["¡Tres veces! Eres la mejor buscadora de toda la casa.", "El secreto: la campana de la torre no se golpea. Se le cuenta la verdad, y suena sola."] },
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
        lines: ["La pasarela de la torre se cierra con un cerrojo de estrellas. Ni mis llaves pueden con él.", "Quien sepa leer el cielo desde el observatorio lo abrirá. Si no, se llega por abajo, por el agua."] },
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
      { id: "armadura", text: "Su guante lo tiene la armadura de la galería.", if: { all: [{ chose: ["gumersindo", "guante"] }, { examined: "armadura" }] }, once: true,
        effects: [{ affinity: ["gumersindo", 8] }],
        lines: ["¡La armadura! ¡Claro! Siempre quiso darme la mano.", "Gracias, señorita. Ahora solo se me caerán las cosas con una mano."] },
    ]),
};
