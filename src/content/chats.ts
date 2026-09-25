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
