/**
 * Charlas entre personajes que Paula puede escuchar si está cerca.
 * Las de historia dejan una pista (flag) que desbloquea preguntas nuevas;
 * las de ambiente se repiten de vez en cuando para que la casa esté viva.
 */
import type { ChatDef } from "../core/chat";

export const CHATS: ChatDef[] = [
  // ------------------------------------------------------------ historia
  {
    id: "porton",
    between: ["tomas", "remedios"],
    lines: [
      ["remedios", "Tomás, ¿otra vez has atrancado el portón de la caldera?"],
      ["tomas", "No lo atranco yo. Se atranca solo si la presión no es la justa."],
      ["remedios", "Pues arréglala. Las galletas no se hornean con miedo."],
      ["tomas", "Hay que repartir los pulsos entre los tubos, como dice la receta chamuscada."],
    ],
    effects: [{ set: "sabe-porton-presion" }],
    note: "Tomás y Remedios: el portón de la caldera se abre con la presión justa; hay que repartir los pulsos entre los tubos.",
  },
  {
    id: "puertas",
    between: ["basilio", "leocadia"],
    lines: [
      ["leocadia", "¿Otra vez le ha dicho a una visita que la puerta verde es la segura?"],
      ["basilio", "Solo a las que me caen bien."],
      ["leocadia", "La biblioteca es la de la izquierda. La que huele a papel."],
    ],
    effects: [{ set: "sabe-puerta-biblioteca" }],
    note: "Leocadia: Don Basilio miente con las puertas. La biblioteca es la de la izquierda, la que huele a papel.",
  },
  {
    id: "cuentas-reloj",
    between: ["elvira", "nicanor"],
    lines: [
      ["nicanor", "Su reloj vuelve a adelantar, Doña Elvira."],
      ["elvira", "Mi reloj no adelanta: cuenta. Siete noches de nueve campanadas."],
      ["nicanor", "Sesenta y tres. Y luego ciento cuarenta y cuatro minutos entre doce marcas."],
      ["elvira", "Doce cada una. Por fin alguien que sabe dividir."],
    ],
    effects: [{ set: "pista-reloj" }],
    note: "Elvira y Nicanor: siete noches de nueve campanadas son 63; 144 minutos entre 12 marcas, 12 cada una.",
  },
  {
    id: "cinta-roja",
    between: ["florentina", "clotilde"],
    lines: [
      ["clotilde", "¿Todavía cosiendo la muñeca de Inés?"],
      ["florentina", "Le falta la cinta roja. La ató arriba, en la torre, lejos de la campana."],
      ["clotilde", "¿Lejos de la campana? Qué niña más lista."],
    ],
    effects: [{ set: "sabe-cinta-roja" }],
    note: "Florentina: Inés ató su cinta roja arriba, en la torre, lejos de la campana.",
  },
  {
    id: "compuertas",
    between: ["tadeo", "anselmo"],
    lines: [
      ["anselmo", "¿Vas a bajar al aljibe con ese farol?"],
      ["tadeo", "Alguien tiene que acordarse del orden: la primera antes que la tercera…"],
      ["anselmo", "…y la segunda, la última. Hasta yo me lo sé."],
    ],
    effects: [{ set: "pista-compuertas" }],
    note: "Tadeo y Anselmo: la compuerta I antes que la III, y la II la última.",
  },
  {
    id: "melodia",
    between: ["baltasar", "crispulo"],
    lines: [
      ["baltasar", "¡Do, mi, sol! ¡Do, mi, sol!"],
      ["crispulo", "Siempre lo mismo. ¿Y después del sol?"],
      ["baltasar", "Después del sol… vuelve a empezar. Como todo en esta casa."],
    ],
    effects: [{ set: "pista-melodia" }],
    note: "Baltasar: do, mi, sol… y después del sol, vuelta a empezar.",
  },
  {
    id: "antidoto",
    between: ["bruma", "serafin"],
    lines: [
      ["bruma", "Serafín, despierta. Hay que preparar el antídoto de luna."],
      ["serafin", "Mmm… ocho macetas… tres flores en cada una…"],
      ["bruma", "Veinticuatro flores. Y setenta y dos gotas entre nueve raíces."],
      ["serafin", "Ocho gotas cada una… zzz."],
    ],
    effects: [{ set: "pista-antidoto" }],
    note: "Bruma y Serafín: 8 macetas con 3 flores son 24; 72 gotas entre 9 raíces, 8 cada una.",
  },
  {
    id: "baul-siete",
    between: ["engracia", "pepito"],
    lines: [
      ["pepito", "¡Engracia! ¡Me he escondido en un baúl y había un papel!"],
      ["engracia", "¿En cuál, criatura?"],
      ["pepito", "En el que tiene un siete pintado. Olía a tinta y a lavanda."],
    ],
    effects: [{ set: "pista-baul" }],
    note: "Pepito: el baúl bueno del desván tiene un siete pintado y huele a tinta.",
  },

  // ------------------------------------------------------ ala de la fiesta
  {
    id: "vals",
    between: ["anacleto", "crispulo"],
    lines: [
      ["anacleto", "Críspulo, ¿te acuerdas del vals de Inés?"],
      ["crispulo", "Empezaba como su caja de música: do, mi, sol."],
      ["anacleto", "¡Eso! Y luego bajaba como la lluvia: sol, mi, do…"],
    ],
    effects: [{ set: "pista-vals" }],
    note: "Anacleto y Críspulo: el vals de Inés empieza como su caja de música (do, mi, sol) y luego baja: sol, mi, do.",
  },
  {
    id: "tarta",
    between: ["clemencia", "remedios"],
    lines: [
      ["remedios", "Clemencia, ¿otra vez con esa tarta de tres pisos?"],
      ["clemencia", "Tres pisos de ocho trozos, Remedios. Para que ninguno de los doce se quede sin su parte."],
      ["remedios", "Pues salen a dos trozos por cabeza. Yo quiero el de la fresa."],
    ],
    effects: [{ set: "pista-tarta" }],
    note: "Clemencia y Remedios: la tarta tiene tres pisos de ocho trozos, y salen dos trozos para cada uno de los doce.",
  },
  {
    id: "llave",
    between: ["casimiro", "bartolo"],
    lines: [
      ["casimiro", "Bartolo, ¿me devolviste la llavecita de cuerda?"],
      ["bartolo", "¡Claro! Bueno… se me quedó en el baúl de los disfraces. Dentro del sombrero de copa."],
      ["casimiro", "¡En el sombrero! Con razón no la encontraba."],
    ],
    effects: [{ set: "pista-llave" }],
    note: "Casimiro y Bartolo: la llave de cuerda está en el baúl de los disfraces del teatrito, dentro del sombrero de copa.",
  },
  {
    id: "retrato",
    between: ["fermin", "clotilde"],
    lines: [
      ["clotilde", "Don Fermín, ¿por qué hay un marco vacío en la galería?"],
      ["fermin", "Era el retrato de Inés. Lo estoy pintando otra vez, pero me faltan colores."],
      ["clotilde", "Rojo y blanco dan el rosa de su lazo. Lo sé porque yo se lo planchaba."],
    ],
    effects: [{ set: "pista-colores" }],
    note: "Fermín y Clotilde: el rosa del lazo de Inés sale de mezclar rojo y blanco.",
  },
  {
    id: "batuta",
    between: ["ramona", "serafin"],
    lines: [
      ["ramona", "Serafín, despierta. Las ranas de la fuente tienen una batuta."],
      ["serafin", "Mmm… ¿una qué? Ah, sí… la del maestro. La perdió dirigiendo a los grillos."],
      ["ramona", "Pues ahora dirige a las ranas. Está en el fondo del agua."],
    ],
    effects: [{ set: "pista-batuta" }],
    note: "Ramona y Serafín: la batuta del maestro Anacleto está en el fondo de la fuente del jardín.",
  },
  {
    id: "compas-baile", between: ["anacleto", "baltasar"], repeatable: true,
    lines: [
      ["baltasar", "¡Maestro! ¿Me deja cantar en la fiesta?"],
      ["anacleto", "Si no desafinas, Baltasar."],
      ["baltasar", "Entonces me deja."],
      ["anacleto", "Eso lo veremos."],
    ],
  },
  {
    id: "dragon", between: ["bartolo", "pepito"], repeatable: true,
    lines: [
      ["pepito", "¿Me dejas esconderme detrás del telón?"],
      ["bartolo", "Solo si no asustas al dragón."],
      ["pepito", "¡Si el dragón es de trapo!"],
      ["bartolo", "Por eso se asusta tanto."],
    ],
  },

  // ------------------------------------------------------ segunda planta
  {
    id: "nana",
    between: ["aurelia", "florentina"],
    lines: [
      ["florentina", "Doña Aurelia, ¿se acuerda de la nana de los pájaros?"],
      ["aurelia", "Un poco. Sol, mi, sol, mi, do… como una mecedora."],
      ["florentina", "Y al final subía: do, re, mi, sol… y volvía a casa."],
    ],
    effects: [{ set: "pista-nana" }],
    note: "Aurelia y Florentina: la nana del joyero empieza «sol, mi, sol, mi, do», como una mecedora.",
  },
  {
    id: "llevadas",
    between: ["rosalia", "nicanor"],
    lines: [
      ["nicanor", "Señorita Rosalía, ¿todavía corrige sumas?"],
      ["rosalia", "Siempre. Primero las unidades; si pasan de nueve, me llevo una a las decenas."],
      ["nicanor", "Y lo que te llevas no se olvida. Como en los relojes."],
    ],
    effects: [{ set: "pista-leccion" }],
    note: "Rosalía y Nicanor: en las sumas, primero las unidades; si pasan de nueve, te llevas una a las decenas.",
  },
  {
    id: "merienda",
    between: ["rosalia", "aurelia"],
    lines: [
      ["rosalia", "Doña Aurelia, el reloj del rellano sigue parado."],
      ["aurelia", "A las cuatro y media. La hora de la merienda de… de alguien."],
      ["rosalia", "De Inés. Siempre llegaba tarde a merendar."],
    ],
    effects: [{ set: "pista-hora" }],
    note: "Rosalía y Aurelia: el reloj del rellano se paró a las cuatro y media, la hora de la merienda de Inés.",
  },

  // ------------------------------------------------------------ ambiente
  {
    id: "bandeja", between: ["basilio", "gumersindo"], repeatable: true,
    lines: [
      ["gumersindo", "Don Basilio, ya casi he recogido la bandeja de 1913."],
      ["basilio", "Magnífico, Gumersindo. Solo te quedan los trocitos de 1914."],
    ],
  },
  {
    id: "galletas", between: ["remedios", "baltasar"], repeatable: true,
    lines: [
      ["baltasar", "¡Remedios! ¿Galletas para el tenor?"],
      ["remedios", "Para el tenor, sí. Para el que desafina, no."],
    ],
  },
  {
    id: "cotilleo", between: ["clotilde", "florentina"], repeatable: true,
    lines: [
      ["clotilde", "¿Has visto? La niña nueva tiene un gato negro."],
      ["florentina", "Se llama Gafe. Me guiñó un ojo."],
      ["clotilde", "Los gatos no guiñan."],
      ["florentina", "Ese sí."],
    ],
  },
  {
    id: "tormenta", between: ["anselmo", "gumersindo"], repeatable: true,
    lines: [
      ["gumersindo", "¿Crees que parará de llover?"],
      ["anselmo", "Cuando la casa quiera. Y la casa es muy cabezota."],
    ],
  },
  {
    id: "compas", between: ["nicanor", "crispulo"], repeatable: true,
    lines: [
      ["crispulo", "Nicanor, ¿me marcas el compás?"],
      ["nicanor", "Tic… tac… tic… trece."],
      ["crispulo", "Los compases no llegan a trece."],
      ["nicanor", "Los de esta casa, sí."],
    ],
  },
  {
    id: "polvo", between: ["leocadia", "clotilde"], repeatable: true,
    lines: [
      ["leocadia", "Clotilde, ese marco tiene polvo."],
      ["clotilde", "Es polvo de 1913. Es histórico."],
    ],
  },
  {
    id: "sin-hablarse", between: ["elvira", "basilio"], repeatable: true,
    lines: [
      ["basilio", "Buenas noches, Doña Elvira."],
      ["elvira", "…"],
      ["basilio", "Veo que seguimos igual que en 1913."],
    ],
  },
];
