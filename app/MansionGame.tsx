"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";

type SceneId = "vestibulo" | "biblioteca" | "cocina" | "archivo" | "invernadero" | "galeria" | "dormitorio" | "observatorio" | "musica" | "desvan" | "tuneles" | "torre";
type Verb = "mirar" | "hablar" | "usar" | "coger";
type PuzzleId = "reloj" | "presion" | "sello" | "flora" | "retratos" | "caja" | "estrellas" | "melodia" | "baules" | "compuertas" | "campana";
type DialogueTopic = { label: string; keywords: string[]; response: string[] };
type Dialogue = { speaker: string; role?: string; lines: string[]; portrait?: string; topics?: DialogueTopic[] };
type SceneNpc = { id: keyof typeof npcDialogue; label: string; cls: string; letter: string; image?: string };
type SceneObject = { id: string; label: string; x: number; y: number; width?: number; height?: number; item?: string; flag: string; look: string; take?: string; requiresTake?: boolean };
type SavedGame = {
  version?: number;
  scene: SceneId;
  inventory: string[];
  solved: PuzzleId[];
  flags: string[];
};
type InventoryCombination = {
  items: [string, string];
  result: string;
  flag: string;
  text: string;
};
type PuzzleTool = {
  room: SceneId;
  item: string;
  prior?: PuzzleId[];
  readyText: string;
};

type SpeechRecognitionEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type AndroidVoiceWindow = typeof window & {
  AndroidVoice?: { startListening: () => void; cancelListening: () => void; isAvailable?: () => boolean };
  __onAndroidVoiceResult?: (text: string) => void;
  __onAndroidVoiceError?: (message: string) => void;
  __onAndroidBack?: () => "handled" | "exit";
};

const SAVE_KEY = "mansion-paula-v4";
const DEVICE_KEY = "mansion-paula-device";
type DeviceMode = "tablet" | "phone";

function readDeviceMode(): DeviceMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(DEVICE_KEY);
    return value === "tablet" || value === "phone" ? value : null;
  } catch {
    return null;
  }
}

const interactionPositions: Record<string, number> = {
  retrato: 74, escalera: 45, carta: 84, campanilla: 79, baul: 61, paraguero: 76, huellas: 28,
  puerta_biblioteca: 8, puerta_servicio: 92, basilio: 66, gafe: 69, reloj: 76, mesa: 30, elvira: 53,
  tomas: 69, caldera: 30, puerta: 73, ines: 43, bruma: 70, baltasar: 67,
  flora: 35, retratos: 45, caja: 28, estrellas: 55, melodia: 39,
  baules: 48, compuertas: 44, campana: 61,
};

const storyCards = [
  {
    kicker: "TRES NOCHES ANTES",
    title: "La carta que llegó mojada",
    text: "Un sobre sin sello apareció bajo la puerta de Paula. Dentro solo había media carta de su bisabuela Aurelia, una brújula inmóvil y una frase: «Cuando la mansión cuente trece, Inés perderá su último recuerdo».",
  },
  {
    kicker: "22:47 · CAMINO DE VALCÁRCEL",
    title: "La casa abrió primero",
    text: "La tormenta borró el sendero de vuelta. Antes de que Paula llamara, la puerta principal se abrió sola. Gafe entró con la cola muy alta, como si ya conociera el lugar.",
  },
  {
    kicker: "LO QUE NADIE CONTÓ",
    title: "Trece años de silencio",
    text: "Inés desapareció aquí hace trece años. Desde entonces, la mansión imita voces, cambia los pasillos y esconde recuerdos dentro de objetos corrientes. Esta noche solo queda uno por salvar.",
  },
  {
    kicker: "PRIMER OBJETIVO",
    title: "El vestíbulo de los ausentes",
    text: "Explora sin prisa. Habla con Gafe y con quien encuentres. Recoge lo que parezca útil, pero no confíes en todas las pistas: alguien en este vestíbulo disfruta tomando el pelo a los visitantes.",
  },
];

const scenes: Record<SceneId, { name: string; chapter: string; position: string; atlas?: number; description: string }> = {
  vestibulo: {
    name: "Vestíbulo de los ausentes",
    chapter: "Capítulo I · La casa recuerda",
    position: "0% 0%",
    description: "La lluvia ha cerrado el camino. Dentro, el reloj marca una hora que todavía no ha ocurrido.",
  },
  biblioteca: {
    name: "Biblioteca del marqués",
    chapter: "Capítulo II · Las cuentas de Elvira",
    position: "100% 0%",
    description: "Miles de libros y una deuda escrita en el mecanismo de un reloj que no da la hora.",
  },
  cocina: {
    name: "Cocina de las válvulas",
    chapter: "Capítulo III · El hambre de la caldera",
    position: "0% 100%",
    description: "Las tuberías laten como venas. Algo cuenta, despacio, detrás del muro.",
  },
  archivo: {
    name: "Archivo bajo la capilla",
    chapter: "Capítulo IV · La decimotercera voz",
    position: "100% 100%",
    description: "Aquí termina la escalera y comienza la promesa que la familia de Paula olvidó cumplir.",
  },
  invernadero: { name: "Invernadero de luna", chapter: "Capítulo V · El jardín que escucha", position: "0% 0%", atlas: 2, description: "Las flores solo abren cuando oyen la verdad. Gafe ve huellas entre las macetas." },
  galeria: { name: "Galería de los borrados", chapter: "Capítulo VI · Los rostros que mienten", position: "100% 0%", atlas: 2, description: "Los retratos cambian de sitio cuando Paula aparta la mirada." },
  dormitorio: { name: "Dormitorio de Inés", chapter: "Capítulo VII · Los juegos que quedaron", position: "0% 100%", atlas: 2, description: "La habitación lleva trece años esperando que alguien termine una partida." },
  observatorio: { name: "Observatorio Valcárcel", chapter: "Capítulo VIII · El cielo equivocado", position: "100% 100%", atlas: 2, description: "El cielo está despejado, aunque fuera la tormenta no ha cesado." },
  musica: { name: "Salón de música", chapter: "Capítulo IX · La casa canta", position: "0% 0%", atlas: 3, description: "El piano toca una nota cada vez que la casa pronuncia un nombre." },
  desvan: { name: "Desván de las sombras", chapter: "Capítulo X · Lo que duerme arriba", position: "100% 0%", atlas: 3, description: "Gafe arquea el lomo. Bajo las sábanas hay menos muebles que siluetas." },
  tuneles: { name: "Túneles del aljibe", chapter: "Capítulo XI · El camino del agua", position: "0% 100%", atlas: 3, description: "El agua refleja una mansión distinta, con todas sus ventanas encendidas." },
  torre: { name: "Torre de las trece", chapter: "Capítulo XII · La cuenta final", position: "100% 100%", atlas: 3, description: "La campana espera. Nadie debe golpearla; la respuesta correcta bastará." },
};

const roomConnections: Record<SceneId, { left?: SceneId; right?: SceneId }> = {
  vestibulo: { left:"biblioteca", right:"cocina" }, biblioteca: { left:"vestibulo", right:"cocina" }, cocina: { left:"vestibulo", right:"archivo" },
  archivo: { left:"cocina", right:"invernadero" }, invernadero: { left:"archivo", right:"galeria" }, galeria: { left:"invernadero", right:"dormitorio" },
  dormitorio: { left:"galeria", right:"observatorio" }, observatorio: { left:"dormitorio", right:"musica" }, musica: { left:"observatorio", right:"desvan" },
  desvan: { left:"musica", right:"tuneles" }, tuneles: { left:"desvan", right:"torre" }, torre: { left:"tuneles" },
};

const roomBriefs: Record<SceneId, { mission: string; talk: string; talkFlag: string; clue: string; clueFlag: string; puzzle?: PuzzleId }> = {
  vestibulo: { mission: "Descubre qué puerta dice la verdad", talk: "Habla con Gafe o Basilio", talkFlag: "vestibulo_talked", clue: "Guarda dos hallazgos", clueFlag: "sello_encontrado" },
  biblioteca: { mission: "Consigue el engranaje del reloj", talk: "Interroga a Doña Elvira", talkFlag: "biblioteca_talked", clue: "Recoge la página del escritorio", clueFlag: "nota_elvira", puzzle: "reloj" },
  cocina: { mission: "Devuelve la presión a la caldera", talk: "Escucha la versión de Tomás", talkFlag: "cocina_talked", clue: "Recoge la receta quemada", clueFlag: "receta_carbon", puzzle: "presion" },
  archivo: { mission: "Rompe el pacto de la puerta sellada", talk: "Responde a la voz de Inés", talkFlag: "archivo_talked", clue: "Recoge el registro oculto", clueFlag: "registro_ines", puzzle: "sello" },
  invernadero: { mission: "Prepara el antídoto de luna", talk: "Habla con la señora Bruma", talkFlag: "invernadero_talked", clue: "Recoge semillas de luna", clueFlag: "semillas_luna", puzzle: "flora" },
  galeria: { mission: "Devuelve los retratos a su historia", talk: "Pide a Gafe que detecte el cuadro falso", talkFlag: "galeria_talked", clue: "Recoge una esquirla de espejo", clueFlag: "esquirla_espejo", puzzle: "retratos" },
  dormitorio: { mission: "Termina el juego que dejó Inés", talk: "Pregunta al eco de Inés", talkFlag: "dormitorio_talked", clue: "Recoge la canica azul", clueFlag: "canica_azul", puzzle: "caja" },
  observatorio: { mission: "Reconstruye el cielo de la mansión", talk: "Consulta a Gafe bajo las estrellas", talkFlag: "observatorio_talked", clue: "Guarda la lente agrietada", clueFlag: "lente_agrietada", puzzle: "estrellas" },
  musica: { mission: "Haz que la casa recuerde la melodía", talk: "Convence a Baltasar para que cante", talkFlag: "musica_talked", clue: "Recoge el cilindro de cera", clueFlag: "cilindro_cera", puzzle: "melodia" },
  desvan: { mission: "Encuentra el plano entre los baúles", talk: "Deja que Gafe rastree las sábanas", talkFlag: "desvan_talked", clue: "Recupera la fotografía de Inés", clueFlag: "foto_ines", puzzle: "baules" },
  tuneles: { mission: "Abre un camino sin inundar el archivo", talk: "Pregunta a Gafe por el olor del agua", talkFlag: "tuneles_talked", clue: "Borra la flecha de tiza falsa", clueFlag: "flecha_tiza", puzzle: "compuertas" },
  torre: { mission: "Libera a Inés sin tocar la campana", talk: "Escucha a Inés una última vez", talkFlag: "torre_talked", clue: "Recoge la cinta roja", clueFlag: "cinta_roja", puzzle: "campana" },
};

const sceneObjects: Record<SceneId, SceneObject[]> = {
  vestibulo: [],
  biblioteca: [
    { id:"nota_elvira", label:"Página arrancada", x:31, y:16, width:12, height:13, item:"Página de Elvira", flag:"nota_elvira", look:"Una cuenta escrita al revés: 7 × 9. Debajo, Elvira anotó «el reloj empieza por la noche»." , take:"Paula guarda la página. En el reverso hay una huella de dedo hecha con tinta fresca.", requiresTake:true },
    { id:"libro_rojo", label:"Libro rojo que bosteza", x:63, y:35, width:12, height:24, item:"Marcapáginas del 13", flag:"libro_rojo", look:"El libro bosteza y dice que la respuesta del reloj es 13. Gafe opina que los libros rojos son unos dramáticos.", take:"El libro se niega a caber en la mochila, pero deja caer un marcapáginas. Puede ser pista… o una broma." },
  ],
  cocina: [
    { id:"receta_carbon", label:"Receta chamuscada", x:72, y:21, width:13, height:15, item:"Receta de carbón", flag:"receta_carbon", look:"La receta mezcla presión y cocina: «96 pulsos, 8 tubos, 7 vueltas». Tomás dejó aquí la fórmula.", take:"Paula guarda la receta; aún huele a canela y humo.", requiresTake:true },
    { id:"salero_bromista", label:"Salero parlanchín", x:59, y:18, width:9, height:14, item:"Sal negra", flag:"salero_bromista", look:"El salero asegura que la caldera funciona con 400 cucharadas. Luego estornuda. Es una pista falsa bastante salada.", take:"Paula guarda una pizca de sal negra. El salero murmura: «Yo habría cogido la pimienta»." },
  ],
  archivo: [
    { id:"registro_ines", label:"Registro cosido", x:40, y:20, width:14, height:15, item:"Página del registro", flag:"registro_ines", look:"Trece nombres están cosidos con hilo. El de Inés no figura entre quienes salieron.", take:"Paula separa con cuidado la página de Inés y la guarda para devolvérsela.", requiresTake:true },
    { id:"llave_capilla", label:"Llave de porcelana", x:21, y:28, width:9, height:14, item:"Llave de porcelana", flag:"llave_capilla", look:"Parece una llave perfecta, salvo por un pequeño detalle: es de porcelana y no tiene dientes.", take:"La llave se parte en dos al tocarla. Don Basilio se ríe desde algún lugar: otra pista falsa." },
  ],
  invernadero: [
    { id:"semillas_luna", label:"Semillas de luna", x:34, y:18, width:12, height:16, item:"Semillas de luna", flag:"semillas_luna", look:"Las semillas palpitan cuando Paula dice la verdad y se quedan quietas cuando exagera.", take:"Bruma permite que Paula guarde tres semillas. Gafe intenta contar cuatro.", requiresTake:true },
    { id:"flor_embustera", label:"Flor embustera", x:70, y:25, width:13, height:25, item:"Pétalo burlón", flag:"flor_embustera", look:"La flor imita la voz de Gafe: «La mezcla correcta lleva cien gotas». El verdadero Gafe le enseña los dientes.", take:"La flor entrega un pétalo y finge desmayarse. No parece una fuente fiable." },
  ],
  galeria: [
    { id:"esquirla_espejo", label:"Esquirla de espejo", x:28, y:13, width:10, height:18, item:"Esquirla de espejo", flag:"esquirla_espejo", look:"En el reflejo, los retratos aparecen en un orden distinto al de la pared.", take:"Paula envuelve la esquirla. Solo refleja a Aurelia, Tomás y Elvira.", requiresTake:true },
    { id:"retrato_perro", label:"Retrato del barón Pelusa", x:76, y:42, width:12, height:27, item:"Medalla de Pelusa", flag:"retrato_perro", look:"Un perro con peluca afirma ser el fundador de la familia. Gafe no tolera semejante falta de rigor histórico.", take:"El barón Pelusa entrega su medalla a cambio de que Paula no cuente que en realidad era el perro del jardinero." },
  ],
  dormitorio: [
    { id:"canica_azul", label:"Canica azul", x:31, y:12, width:9, height:12, item:"Canica azul", flag:"canica_azul", look:"Dentro de la canica hay una habitación diminuta donde el mismo juego aún no ha terminado.", take:"La canica rueda cuesta arriba hasta la mano de Paula. Inés la estaba esperando.", requiresTake:true },
    { id:"muneca_susurra", label:"Muñeca que susurra", x:72, y:23, width:12, height:27, item:"Botón de nácar", flag:"muneca_susurra", look:"La muñeca susurra «3, 6, 12, 25». Gafe le arranca un botón: el último número es una mentira.", take:"La muñeca no cabe, pero su botón de nácar sí. Al guardarlo deja de susurrar respuestas falsas." },
  ],
  observatorio: [
    { id:"lente_agrietada", label:"Lente agrietada", x:58, y:17, width:12, height:20, item:"Lente agrietada", flag:"lente_agrietada", look:"La grieta divide el círculo del cielo exactamente en doce partes.", take:"Paula alinea la lente con su brújula. Durante un segundo, ambas señalan la misma estrella.", requiresTake:true },
    { id:"estrella_papel", label:"Estrella de papel", x:22, y:36, width:11, height:18, item:"Estrella de papel", flag:"estrella_papel", look:"Tiene escrito «NORTE» en sus cinco puntas. Solo una apunta realmente al norte.", take:"La estrella se pliega sola y se esconde en el bolsillo. No es un mapa, aunque insiste en serlo." },
  ],
  musica: [
    { id:"cilindro_cera", label:"Cilindro de cera", x:65, y:15, width:11, height:17, item:"Cilindro de cera", flag:"cilindro_cera", look:"Al girarlo despacio se oyen tres notas: DO, MI, SOL.", take:"Baltasar protesta por educación, pero permite que Paula guarde el cilindro.", requiresTake:true },
    { id:"partitura_falsa", label:"Partitura del silencio", x:81, y:33, width:13, height:22, item:"Partitura en blanco", flag:"partitura_falsa", look:"La partitura está en blanco y presume de contener una obra muy difícil. Gafe la define como «mucho papel para ninguna nota».", take:"Paula la guarda. Tal vez el papel en blanco sirva más que su música inexistente." },
  ],
  desvan: [
    { id:"foto_ines", label:"Fotografía de Inés", x:42, y:18, width:12, height:15, item:"Fotografía de Inés", flag:"foto_ines", look:"Inés aparece junto a un baúl marcado con el número 7. Una esquina de la foto está recién mordida.", take:"Paula guarda la fotografía. Gafe asegura que él no muerde fotos; solo las prueba.", requiresTake:true },
    { id:"mapa_falso", label:"Mapa demasiado perfecto", x:75, y:21, width:13, height:18, item:"Mapa equivocado", flag:"mapa_falso", look:"El mapa dibuja una salida directa a una heladería. Incluso Paula reconoce que la mansión no puede ser tan amable.", take:"Paula guarda el mapa falso para recordar que una pista agradable también puede ser mentira." },
  ],
  tuneles: [
    { id:"moneda_pozo", label:"Moneda del aljibe", x:28, y:12, width:10, height:12, item:"Moneda del aljibe", flag:"moneda_pozo", look:"La moneda tiene dos caras iguales: ambas muestran una compuerta cerrada.", take:"El agua intenta recuperar la moneda, pero Paula es más rápida." },
    { id:"flecha_tiza", label:"Flecha de tiza", x:68, y:25, width:15, height:18, item:"Trozo de tiza blanca", flag:"flecha_tiza", look:"Una flecha señala la segunda compuerta. Gafe olfatea la marca: la dibujó Don Basilio hace menos de una hora.", take:"Paula borra la flecha falsa y guarda la tiza. Ahora Basilio tendrá que inventar otra trampa.", requiresTake:true },
  ],
  torre: [
    { id:"cinta_roja", label:"Cinta roja", x:37, y:16, width:11, height:15, item:"Cinta roja de Inés", flag:"cinta_roja", look:"La cinta está atada lejos de la campana, como una advertencia: la respuesta no necesita golpes.", take:"Paula anuda la cinta a su muñeca. La voz de Inés se vuelve más nítida.", requiresTake:true },
    { id:"palanca_dorada", label:"Palanca dorada", x:78, y:31, width:11, height:27, item:"Tornillo dorado", flag:"palanca_dorada", look:"La palanca lleva un letrero: «TIRAR PARA GANAR». Gafe se sienta encima para impedirlo. Demasiado obvio.", take:"La palanca no se mueve, pero Paula desenrosca su placa. Era otra trampa de la casa." },
  ],
};

const puzzleBank: Record<PuzzleId, { title: string; story: string; questions: { prompt: string; answer: number | string; hint?: string; accept?: string[] }[] }> = {
  reloj: {
    title: "El reloj de las horas devoradas",
    story: "Elvira señala tres discos. Cada resultado correcto hace avanzar una aguja; un error despierta al reloj.",
    questions: [
      { prompt: "Siete noches tuvieron nueve campanadas cada una. ¿Cuántas campanadas fueron?", answer: 63, hint: "Son 7 grupos de 9. Multiplica 7 × 9 (o suma 9 siete veces)." },
      { prompt: "Reparte 144 minutos entre las doce marcas del reloj. ¿Cuántos minutos recibe cada marca?", answer: 12, hint: "Es un reparto en partes iguales: 144 ÷ 12." },
      { prompt: "Multiplica 18 por 4 y divide el resultado entre 6.", answer: 12, hint: "Ve por pasos: primero 18 × 4, y ese resultado divídelo entre 6." },
    ],
  },
  presion: {
    title: "La presión de los nombres",
    story: "Tomás dejó la fórmula grabada en cobre. La caldera solo acepta el número exacto.",
    questions: [
      { prompt: "La tubería recibe 96 pulsos, los divide entre 8 conductos y multiplica cada salida por 7. ¿Presión final?", answer: 84, hint: "Ve por orden: primero 96 ÷ 8, y ese número multiplícalo por 7." },
      { prompt: "Quince vueltas mueven 6 dientes cada una. Si el eje reparte la fuerza entre 5 válvulas, ¿qué marca cada válvula?", answer: 18, hint: "Primero 15 × 6 dientes, y ese resultado divídelo entre 5." },
    ],
  },
  sello: {
    title: "El pacto de las trece campanadas",
    story: "El sello exige demostrar que Paula comprende la deuda, no que conoce una contraseña.",
    questions: [
      { prompt: "Doce familias pagaron 13 monedas durante 4 inviernos. La deuda se dividió entre 8 herederos. ¿Cuánto heredó cada uno?", answer: 78, hint: "Empieza por un invierno: 12 × 13 monedas. Multiplícalo por los 4 inviernos y luego divide entre 8." },
      { prompt: "La casa guardó 225 recuerdos en 15 cajones. Quemó 3 cajones completos. ¿Cuántos recuerdos desaparecieron?", answer: 45, hint: "Cada cajón guarda 225 ÷ 15 recuerdos. Multiplica eso por los 3 cajones quemados." },
      { prompt: "Multiplica 14 por 9 y divide entre 7. Esa es la edad que fingía tener la voz tras la puerta.", answer: 18, hint: "Primero 14 × 9, y ese resultado divídelo entre 7." },
    ],
  },
  flora: { title: "El herbario de la luna", story: "La señora Bruma necesita preparar un antídoto para que las flores dejen de repetir voces ajenas.", questions: [
    { prompt: "Hay 8 macetas con 3 flores de luna cada una. ¿Cuántas flores hay?", answer: 24, hint: "8 macetas con 3 flores cada una: multiplica 8 × 3." },
    { prompt: "Reparte 72 gotas entre 9 raíces. ¿Cuántas gotas recibe cada raíz?", answer: 8, hint: "Reparto en partes iguales: 72 ÷ 9." },
    { prompt: "La mezcla usa 6 hojas en cada uno de 7 frascos y descarta la mitad. ¿Cuántas hojas conserva?", answer: 21, hint: "Primero 6 × 7 hojas, y luego quédate con la mitad." },
  ]},
  retratos: { title: "La familia que cambió de sitio", story: "Los cuadros solo aceptan una historia ordenada. Escucha bien las pistas de Gafe.", questions: [
    { prompt: "Aurelia está a la izquierda de Tomás. Elvira está a la derecha de Tomás. ¿Quién ocupa el centro?", answer: "tomás", accept: ["tomas", "tomas valcarcel", "el guardes"], hint: "No necesitas calcular: imagina tres posiciones." },
    { prompt: "Si 6 retratos esconden 4 símbolos cada uno, ¿cuántos símbolos hay en total?", answer: 24, hint: "6 retratos con 4 símbolos cada uno: multiplica 6 × 4." },
  ]},
  caja: { title: "La caja de música de Inés", story: "El cilindro repite patrones. Paula debe descubrir qué número continúa.", questions: [
    { prompt: "La serie duplica cada número: 3, 6, 12, 24… ¿cuál sigue?", answer: 48, hint: "Cada número es el doble del anterior. ¿Cuánto es 24 × 2?" },
    { prompt: "Una melodía tiene 96 notas repartidas en 8 compases. ¿Cuántas notas hay por compás?", answer: 12, hint: "Reparte las 96 notas entre 8 compases: 96 ÷ 8." },
  ]},
  estrellas: { title: "El planetario imposible", story: "El telescopio gira con divisiones exactas. Inés dibujó la ruta en su mapa.", questions: [
    { prompt: "Divide los 360 grados del cielo entre 12 constelaciones iguales.", answer: 30, hint: "Reparto en partes iguales: 360 ÷ 12." },
    { prompt: "Nueve órbitas completan 7 vueltas cada una. ¿Cuántas vueltas suman?", answer: 63, hint: "9 órbitas de 7 vueltas: multiplica 9 × 7." },
    { prompt: "La estrella correcta es la que aparece 4 veces en cada una de 6 páginas. ¿Cuántas apariciones?", answer: 24, hint: "4 apariciones en cada una de 6 páginas: 4 × 6." },
  ]},
  melodia: { title: "La melodía de los nombres", story: "Baltasar tararea tres notas. La cuarta se esconde en una palabra.", questions: [
    { prompt: "Completa el patrón de notas: DO, MI, SOL, DO, MI, SOL… ¿qué nota sigue?", answer: "do", accept: ["un do", "la nota do", "c"], hint: "El patrón se repite igual. ¿Qué nota toca justo después de SOL?" },
    { prompt: "El gramófono gira 18 veces por minuto durante 4 minutos. Después divide las vueltas entre 6 pistas. ¿Cuántas por pista?", answer: 12, hint: "Primero 18 × 4 vueltas en total, y luego divídelas entre 6." },
  ]},
  baules: { title: "Los baúles sin dueño", story: "Gafe puede entrar bajo las sábanas, pero Paula debe indicarle el baúl correcto.", questions: [
    { prompt: "Hay 5 filas de 9 baúles. Gafe ya ha revisado un tercio. ¿Cuántos ha revisado?", answer: 15, hint: "Primero cuenta todos: 5 × 9 baúles. Un tercio es dividir entre 3." },
    { prompt: "El baúl buscado tiene el doble de 14 cerraduras dividido entre 4. ¿Qué número lleva?", answer: 7, hint: "El doble de 14 es 28; luego divide 28 entre 4." },
  ]},
  compuertas: { title: "El camino del agua", story: "Abrir demasiado inundaría el archivo. No hay prisa: cada compuerta puede pensarse con calma.", questions: [
    { prompt: "Tres canales reciben 48 litros cada uno. Se reparten entre 8 desagües. ¿Cuántos litros pasan por cada desagüe?", answer: 18, hint: "Primero suma el agua: 3 × 48 litros. Luego reparte entre 8 desagües." },
    { prompt: "La compuerta I abre antes que la III. La II abre después que la III. ¿Cuál se abre en segundo lugar?", answer: "tres", accept: ["iii", "3", "tercera", "la tercera", "compuerta iii"], hint: "Ordena I, III y II." },
    { prompt: "Doce ruedas giran 6 veces y luego deshacen un tercio de las vueltas. ¿Cuántas vueltas permanecen?", answer: 48, hint: "Primero 12 × 6 vueltas. Un tercio (÷ 3) se deshace; resta esa parte del total." },
  ]},
  campana: { title: "La decimotercera campanada", story: "No es una carrera. La casa solo pierde poder cuando Paula explica la cuenta completa.", questions: [
    { prompt: "Trece campanadas durante 9 noches producen 117 ecos. Si cada recuerdo absorbe 3 ecos, ¿cuántos recuerdos quedan atrapados?", answer: 39, hint: "Reparte los 117 ecos en grupos de 3: 117 ÷ 3." },
    { prompt: "Aurelia dejó 7 llaves a cada una de 12 personas. Inés devolvió la mitad. ¿Cuántas llaves quedaron?", answer: 42, hint: "Primero 7 × 12 llaves en total; devolvió la mitad, así que queda la otra mitad." },
    { prompt: "Última pregunta: ¿quién ha acompañado a Paula incluso cuando la casa mentía?", answer: "gafe", accept: ["el gato", "gato", "mi gato", "el gato negro"], hint: "Tiene cuatro patas y ojos de color ámbar." },
  ]},
};

const inventoryCombinations: InventoryCombination[] = [
  {
    items: ["Engranaje de marfil", "Llave de servicio"],
    result: "Mecanismo del archivo",
    flag: "mecanismo_archivo_montado",
    text: "Paula encaja la llave en el eje del engranaje. Las dos piezas forman el mecanismo que falta en la puerta del archivo.",
  },
  {
    items: ["Mapa del ala norte", "Cinta de Inés"],
    result: "Ruta bordada de Inés",
    flag: "ruta_ines_bordada",
    text: "La cinta encaja sobre el mapa como un camino. Sus estrellas señalan el dormitorio de Inés.",
  },
  {
    items: ["Lente de tinta lunar", "Mapa estelar"],
    result: "Mapa celeste revelado",
    flag: "mapa_celeste_revelado",
    text: "Al mirar el mapa con la lente lunar aparece una constelación que antes no estaba allí.",
  },
  {
    items: ["Partitura invisible", "Diapasón de cobre"],
    result: "Clave de resonancia",
    flag: "clave_resonancia_creada",
    text: "El diapasón hace visible una línea nueva en la partitura: es la frecuencia que abre el aljibe sin romperlo.",
  },
  {
    items: ["Plano de los túneles", "Tiza azul"],
    result: "Plano marcado por Gafe",
    flag: "plano_gafe_marcado",
    text: "Gafe apoya la pata en el plano mientras Paula marca con tiza azul los caminos que no huelen a trampa.",
  },
  {
    items: ["Plano marcado por Gafe", "Clave de resonancia"],
    result: "Ruta segura del aljibe",
    flag: "ruta_aljibe_preparada",
    text: "La frecuencia de la partitura coincide con tres marcas del plano. Paula ya sabe qué compuertas tocar y en qué orden.",
  },
  {
    items: ["Cuerda de la campana", "Cinta roja de Inés"],
    result: "Nudo silencioso",
    flag: "nudo_silencioso_preparado",
    text: "Paula ata la cinta de Inés alrededor de la cuerda. Ahora puede inmovilizar la campana sin hacerla sonar.",
  },
];

const puzzleTools: Record<PuzzleId, PuzzleTool> = {
  reloj: { room:"biblioteca", item:"Sello de Aurelia", readyText:"Selecciona el sello de Aurelia en la mochila y úsalo en el reloj." },
  presion: { room:"cocina", item:"Receta de carbón", readyText:"Selecciona la receta de carbón y úsala junto a la caldera." },
  sello: { room:"archivo", item:"Mecanismo del archivo", prior:["reloj","presion"], readyText:"Combina el engranaje con la llave y usa el mecanismo resultante en la puerta." },
  flora: { room:"invernadero", item:"Semillas de luna", prior:["sello"], readyText:"Selecciona las semillas de luna y úsalas en el herbario." },
  retratos: { room:"galeria", item:"Esquirla de espejo", prior:["sello"], readyText:"Selecciona la esquirla y úsala frente a los retratos." },
  caja: { room:"dormitorio", item:"Ruta bordada de Inés", prior:["flora","retratos"], readyText:"Combina el mapa del ala norte con la cinta de Inés y úsalo en la caja." },
  estrellas: { room:"observatorio", item:"Mapa celeste revelado", prior:["caja"], readyText:"Combina la lente lunar con el mapa estelar y úsalo en el planetario." },
  melodia: { room:"musica", item:"Cilindro de cera", prior:["estrellas"], readyText:"Selecciona el cilindro de cera y úsalo en el piano." },
  baules: { room:"desvan", item:"Fotografía de Inés", prior:["estrellas"], readyText:"Selecciona la fotografía de Inés y úsala para identificar el baúl." },
  compuertas: { room:"tuneles", item:"Ruta segura del aljibe", prior:["melodia","baules"], readyText:"Combina las pistas de música y el plano marcado; después usa la ruta segura en las compuertas." },
  campana: { room:"torre", item:"Nudo silencioso", prior:["compuertas"], readyText:"Combina la cuerda con la cinta roja de Inés y usa el nudo en la campana." },
};

const endingCards = [
  {
    kicker: "EL REGRESO",
    title: "El vestíbulo dejó de contar",
    text: "Cuando Paula, Gafe e Inés cruzan la última puerta, todos los relojes de la mansión se detienen a la vez. No se rompen: por primera vez, descansan.",
  },
  {
    kicker: "UNA VERDAD DE BASILIO",
    title: "El mayordomo se quitó el sombrero",
    text: "Don Basilio les indica la salida y, tras trece años de bromas, dice una verdad completa: «Inés nunca estuvo olvidada. Solo necesitaba que alguien la escuchara hasta el final».",
  },
  {
    kicker: "AMANECER",
    title: "La puerta se abrió hacia casa",
    text: "Fuera ya no llueve. Inés aprieta la mano de Paula y Gafe sale primero, muy digno, fingiendo que no ha tenido miedo ni una sola vez.",
  },
  {
    kicker: "MISTERIO RESUELTO",
    title: "Paula, Gafe y la decimotercera voz",
    text: "La mansión sigue en pie, pero ha perdido el poder de mentir. En el bolsillo de Paula, la brújula de Aurelia vuelve a moverse y señala una nueva aventura.",
  },
];

const numberWords: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, treinta: 30, treinta_y_nueve: 39,
  cuarenta: 40, "cuarenta y dos": 42, "cuarenta y cinco": 45, cuarenta_y_ocho: 48, sesenta: 60,
  "sesenta y tres": 63, setenta: 70, "setenta y ocho": 78, ochenta: 80,
  "ochenta y cuatro": 84,
  // Ordinales y romanos: los enunciados hablan de "compuerta I / II / III",
  // asi que responder "III" o "la tercera" es tan valido como "tres".
  primera: 1, primero: 1, i: 1, segunda: 2, segundo: 2, ii: 2, tercera: 3, tercero: 3, iii: 3,
  cuarta: 4, cuarto: 4, iv: 4, quinta: 5, quinto: 5, v: 5,
};

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[.,!?\u00bf\u00a1:;]/g, "");
}

function parseSpokenNumber(value: string) {
  const clean = normalizeText(value);
  const digits = clean.match(/-?\d+/);
  if (digits) return Number(digits[0]);
  const direct = numberWords[clean] ?? numberWords[clean.replace(/ /g, "_")];
  if (direct !== undefined) return direct;
  // "la tercera compuerta", "el numero siete": busca la primera palabra que sea un numero.
  for (const word of clean.split(/\s+/)) {
    if (numberWords[word] !== undefined) return numberWords[word];
  }
  return Number.NaN;
}

const sceneIds = new Set<SceneId>(Object.keys(scenes) as SceneId[]);
const puzzleIds = new Set<PuzzleId>(Object.keys(puzzleBank) as PuzzleId[]);

function readSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const candidate = JSON.parse(raw) as Partial<SavedGame>;
    return {
      scene: typeof candidate.scene === "string" && sceneIds.has(candidate.scene as SceneId) ? candidate.scene as SceneId : "vestibulo",
      inventory: Array.isArray(candidate.inventory) ? candidate.inventory.filter((item): item is string => typeof item === "string") : [],
      solved: Array.isArray(candidate.solved) ? candidate.solved.filter((id): id is PuzzleId => typeof id === "string" && puzzleIds.has(id as PuzzleId)) : [],
      flags: Array.isArray(candidate.flags) ? candidate.flags.filter((flag): flag is string => typeof flag === "string") : [],
    };
  } catch {
    return null;
  }
}

function isCorrectAnswer(value: string, expected: number | string, accept?: string[]) {
  const clean = normalizeText(value);
  if (accept?.some((alternative) => {
    const option = normalizeText(alternative);
    return clean === option || clean.split(/\s+/).includes(option);
  })) return true;
  if (typeof expected === "number") return parseSpokenNumber(value) === expected;
  const normalizedExpected = normalizeText(expected);
  if (clean === normalizedExpected || clean.split(/\s+/).includes(normalizedExpected)) return true;
  const expectedNumber = parseSpokenNumber(normalizedExpected);
  return Number.isFinite(expectedNumber) && parseSpokenNumber(clean) === expectedNumber;
}

const openingDialogue: Dialogue = {
  speaker: "Gafe",
  role: "Gato negro · rastreador de secretos",
  portrait: "/character-gafe-v2.png",
  lines: [
    "Paula… la puerta se ha cerrado detrás de nosotros. Eso es mala educación incluso para una casa encantada.",
    "Antes de elegir un camino, escucha, pregunta y guarda lo que encuentres. El vestíbulo está lleno de pistas; algunas son mentiras con muy buenos modales.",
    "Aurelia dejó un sello cerca de aquello que más se parece a ella. Y ese mayordomo de la derecha miente cada vez que se atusa el bigote.",
  ],
  topics: [
    { label: "¿Qué buscamos?", keywords: ["buscamos", "objetivo", "hacer", "ines"], response: ["El sello de Aurelia. Sin él, la biblioteca no reconocerá a Paula y el reloj no abrirá su secreto."] },
    { label: "¿Quién es el mayordomo?", keywords: ["mayordomo", "basilio", "señor"], response: ["Don Basilio. Murió sin confesar una sola verdad y se lo tomó como un récord. Pregúntale por las puertas; luego piensa justo lo contrario."] },
    { label: "¿Qué puedo recoger?", keywords: ["recoger", "coger", "objetos", "mochila"], response: ["Todo lo que quepa en la mochila. Una pista falsa también puede servir para descubrir quién te está engañando."] },
  ],
};

const npcDialogue: Record<string, Dialogue> = {
  gafe: {
    speaker: "Gafe",
    role: "Compañero y detector de magia",
    portrait: "/character-gafe-v2.png",
    lines: ["Las casas no están encantadas, Paula. Están resentidas.", "El retrato de Aurelia te mira demasiado. Empieza por ahí."],
    topics: openingDialogue.topics,
  },
  basilio: {
    speaker: "Don Basilio",
    role: "Mayordomo difunto · fiabilidad dudosa",
    portrait: "/character-basilio-v1.png",
    lines: ["Bienvenida, señorita Paula. Soy Don Basilio y jamás he dicho una mentira… desde que usted entró.", "La puerta verde conduce a la biblioteca. O quizá al sótano. A mi edad, las bisagras se confunden."],
    topics: [
      { label: "¿Qué puerta es segura?", keywords: ["puerta", "segura", "biblioteca", "salir"], response: ["La verde, sin duda. Ignore el olor a carbón, las tuberías y ese pequeño letrero que dice «servicio». Los letreros son unos exagerados."] },
      { label: "¿Quién eres?", keywords: ["quien", "eres", "nombre", "basilio"], response: ["Mayordomo mayor, guardián menor y campeón indiscutible de señalar en la dirección equivocada. Lo último era una broma. Probablemente."] },
      { label: "¿Has visto la carta?", keywords: ["carta", "sobre", "aurelia"], response: ["¿Carta? Aquí nunca hubo cartas. Y, desde luego, no hay media carta empapada junto al paragüero. Qué ocurrencia."] },
    ],
  },
  elvira: {
    speaker: "Doña Elvira",
    role: "Bibliotecaria, fallecida en 1913",
    portrait: "/character-elvira-v2.png",
    lines: ["Administré esta casa cuando aún fingía ser respetable.", "Demuestra que sabes multiplicar sus pecados y dividir sus culpas. El reloj te entregará el engranaje."],
    topics: [
      { label:"¿Qué mide el reloj?", keywords:["reloj","mide","hora"], response:["No mide horas. Cuenta las noches que la familia fingió no oír a Inés. Empieza por siete noches y nueve campanadas."] },
      { label:"¿Puedo confiar en ti?", keywords:["confiar","verdad","mentira"], response:["No. Pero puedes comprobar mis cuentas, que es bastante mejor que confiar en alguien."] },
      { label:"¿Qué página falta?", keywords:["pagina","nota","falta","escritorio"], response:["La dejé sobre el escritorio. Si ahora bosteza dentro de un libro rojo, no es culpa mía."] },
    ],
  },
  tomas: {
    speaker: "Tomás Valcárcel",
    role: "Antiguo guardés",
    portrait: "/character-tomas-v2.png",
    lines: ["Yo cerré la capilla. Creí que así la protegería.", "La llave sigue en la caldera, pero antes tendrás que devolverle la presión exacta."],
    topics: [
      { label:"¿Por qué cerraste la capilla?", keywords:["por que","capilla","cerraste"], response:["La voz de la casa imitaba a Inés. Cerré la puerta equivocada y dejé a la verdadera voz dentro."] },
      { label:"¿Cómo funciona la caldera?", keywords:["caldera","presion","funciona","formula"], response:["Los pulsos se reparten entre los conductos y luego cada salida gira siete veces. La receta chamuscada conserva el orden."] },
      { label:"¿Basilio te ayudó?", keywords:["basilio","ayudo","mayordomo"], response:["Me entregó una llave de porcelana y dijo que era irrompible. Todavía se ríe de aquello."] },
    ],
  },
  ines: {
    speaker: "Inés",
    role: "Voz tras la puerta",
    portrait: "/character-ines-v2.png",
    lines: ["Paula, no abras si la campana suena trece veces.", "La cosa que vive aquí ya sabe pronunciar mi nombre."],
    topics: [
      { label:"¿Dónde estás?", keywords:["donde","estas","lugar"], response:["Una parte de mí está tras esta puerta y otra en la torre. Mis recuerdos quedaron repartidos por las habitaciones."] },
      { label:"¿Cómo te reconozco?", keywords:["reconozco","voz","verdadera"], response:["La casa puede copiar mi voz, pero no recuerda la canica azul ni la cinta roja. Pregunta por ellas."] },
      { label:"¿Qué es el pacto?", keywords:["pacto","sello","aurelia"], response:["Una deuda disfrazada de protección. El sello de Aurelia abre la cuenta para que puedas demostrar que está equivocada."] },
    ],
  },
  bruma: {
    speaker: "Señora Bruma",
    role: "Botánica y guardiana del invernadero",
    portrait: "/character-bruma-v2.png",
    lines: ["Las plantas recuerdan cada voz que las regó.", "Ayúdame con las proporciones del antídoto y te daré una lente capaz de ver tinta lunar."],
    topics: [
      { label:"¿Qué flores sirven?", keywords:["flores","sirven","mezcla"], response:["Las pálidas. Ocho macetas, tres flores en cada una. La flor de la derecha imita voces; no imita la verdad."] },
      { label:"¿Conociste a Inés?", keywords:["ines","conociste","niña"], response:["Venía a dibujar las raíces. Decía que bajo la casa todas apuntaban hacia una misma campana."] },
      { label:"¿Por qué habla esa flor?", keywords:["flor","habla","embustera"], response:["La regó Don Basilio con agua del espejo. Desde entonces responde antes de escuchar la pregunta."] },
    ],
  },
  baltasar: {
    speaker: "Baltasar",
    role: "Cocinero fantasma y tenor frustrado",
    portrait: "/character-baltasar-v2.png",
    lines: ["La casa me prohibió cantar, así que escondí la llave en una melodía.", "No hace falta tener buen oído, pequeña. Basta con encontrar el patrón."],
    topics: [
      { label:"Canta la melodía", keywords:["canta","melodia","notas"], response:["DO, MI, SOL… y después vuelve a empezar. Si oyes un FA, ha sido el piano intentando hacerse el interesante."] },
      { label:"¿Dónde está la llave?", keywords:["llave","donde","escondida"], response:["En ninguna parte. Es una metáfora musical. Lo siento; los tenores abusamos mucho de ellas."] },
      { label:"¿Qué guarda el cilindro?", keywords:["cilindro","cera","guarda"], response:["Mi último ensayo y un estornudo perfectamente afinado. Lo importante son las tres primeras notas."] },
    ],
  },
  pelusa: {
    speaker: "Barón Pelusa",
    role: "Fundador honorario · en realidad, el perro del jardinero",
    portrait: "🐾",
    lines: [
      "Ejem. Barón Pelusa, decimocuarto de mi linaje. Sí, llevo peluca. Es protocolo, no vanidad.",
      "Los retratos de esta galería cambian de sitio cuando nadie mira. Yo, en cambio, jamás me muevo: sería indigno de un óleo.",
    ],
    topics: [
      { label:"¿Eres el fundador de verdad?", keywords:["fundador","verdad","perro"], response:["Técnicamente fui el perro del jardinero. Pero un óleo bien pintado abre muchas puertas sociales."] },
      { label:"¿Qué sabes de los retratos?", keywords:["retratos","orden","cambian"], response:["Aurelia, Tomás y Elvira se turnan el centro del pasillo. Gafe conoce el orden correcto; yo solo vigilo con dignidad."] },
      { label:"¿Conoces a Gafe?", keywords:["gafe","gato"], response:["Un gato entrando en una galería de perros ilustres. Escandaloso. Aunque admito que tiene buen ojo para las trampas."] },
    ],
  },
};

/* Objetos con voz propia. La casa esconde recuerdos dentro de objetos corrientes
   (biblia del juego), asi que cada trasto con personalidad es un personaje al que
   se puede HABLAR. Varios mienten con mucha educacion: Gafe siempre los desmiente. */
const objectCharacters: Record<string, Dialogue> = {
  libro_rojo: {
    speaker: "El Libro Rojo",
    role: "Novela dramática · se cree importante",
    portrait: "📕",
    lines: [
      "(bosteza) Llevo ciento trece años esperando a que alguien me lea, y lo primero que hacéis es interrogarme.",
      "La respuesta del reloj es trece. Siempre es trece. Es un número con mucha presencia literaria.",
    ],
    topics: [
      { label:"¿Seguro que es trece?", keywords:["seguro","trece","verdad"], response:["Completamente. Bueno… razonablemente. Digamos que trece queda mejor en una frase que sesenta y tres."] },
      { label:"¿Qué guardas dentro?", keywords:["guardas","dentro","pagina"], response:["Un marcapáginas, tres manchas de té y la página que Doña Elvira jura haber dejado en el escritorio."] },
      { label:"¿Por qué bostezas?", keywords:["bostezas","aburrido","sueño"], response:["Porque nadie pasa de mi capítulo cuarto. Ni siquiera el marqués, y eso que lo escribió él."] },
    ],
  },
  salero_bromista: {
    speaker: "El Salero",
    role: "Condimento con opiniones firmes",
    portrait: "🧂",
    lines: [
      "¡Por fin alguien con manos! La caldera funciona con cuatrocientas cucharadas, apúntalo. (achís)",
      "Perdón. Soy alérgico a la pimienta y a que me contradigan.",
    ],
    topics: [
      { label:"¿Cuatrocientas cucharadas?", keywords:["cuatrocientas","cucharadas","seguro"], response:["Puede que fueran cuarenta. O cuatro. Los números y yo tenemos una relación muy libre."] },
      { label:"¿Conoces a Tomás?", keywords:["tomas","guardes","cocina"], response:["Cocinaba fatal y guardaba secretos peor. Dejó su fórmula escrita en una receta que se le quemó. Muy simbólico."] },
      { label:"¿Qué hay tras el muro?", keywords:["muro","tuberia","cuenta"], response:["Algo que cuenta despacio. Yo no me meto: soy sal, no soy valiente."] },
    ],
  },
  llave_capilla: {
    speaker: "La Llave de Porcelana",
    role: "Llave decorativa · no abre nada",
    portrait: "🗝",
    lines: [
      "Soy la llave más hermosa de esta casa. También soy completamente inútil, pero eso se comenta menos.",
      "Don Basilio me regaló diciendo que era irrompible. Mírame bien: no tengo ni dientes.",
    ],
    topics: [
      { label:"¿Abres la puerta del pacto?", keywords:["abres","puerta","pacto"], response:["No. Esa puerta necesita un mecanismo de verdad, hecho de dos piezas. Yo solo sirvo para hacer bonito y romperme."] },
      { label:"¿Por qué mintió Basilio?", keywords:["basilio","mintio","por que"], response:["No lo llames mentir. Él lo llama «mantener viva la conversación»."] },
    ],
  },
  flor_embustera: {
    speaker: "La Flor Embustera",
    role: "Planta imitadora de voces",
    portrait: "🌸",
    lines: [
      "«Paula, soy Gafe, la mezcla lleva cien gotas.» (voz de gato muy mal imitada)",
      "…Vale, no soy Gafe. Pero reconoce que casi cuela.",
    ],
    topics: [
      { label:"¿Cuántas gotas de verdad?", keywords:["gotas","verdad","cuantas"], response:["Ni idea. Yo repito voces, no recetas. Pregúntale a la señora Bruma, que sí escucha antes de hablar."] },
      { label:"¿Quién te regó?", keywords:["rego","quien","agua"], response:["Don Basilio, con agua del espejo. Desde entonces respondo antes de que me pregunten. Es agotador."] },
      { label:"¿Viste a Inés?", keywords:["ines","niña","viste"], response:["Venía a dibujar raíces. Nunca me creyó nada, y por eso me caía tan bien."] },
    ],
  },
  muneca_susurra: {
    speaker: "La Muñeca",
    role: "Juguete de Inés · susurra números",
    portrait: "🎎",
    lines: [
      "Tres… seis… doce… veinticinco… (susurro)",
      "Inés me enseñó el patrón, pero le cambié el último número para ver si alguien se daba cuenta.",
    ],
    topics: [
      { label:"¿Cuál es el número falso?", keywords:["falso","numero","ultimo"], response:["El veinticinco. Si cada número es el doble del anterior, después de doce no puede venir veinticinco. Gafe ya me lo arrancó de un mordisco."] },
      { label:"¿Cómo era Inés?", keywords:["ines","como","era"], response:["Ordenada con sus juegos y desordenada con sus miedos. Dejó una partida a medias y la casa nunca la dejó terminarla."] },
      { label:"¿Te da miedo la casa?", keywords:["miedo","casa","noche"], response:["Soy una muñeca de trapo en un caserón encantado. Llevo trece años fingiendo que no."] },
    ],
  },
  estrella_papel: {
    speaker: "La Estrella de Papel",
    role: "Mapa doblado · pésimo sentido de la orientación",
    portrait: "⭐",
    lines: [
      "Tengo escrito NORTE en mis cinco puntas. Eso me convierte en cinco veces más fiable, ¿verdad?",
      "…Gafe dice que me convierte en cuatro veces más mentirosa. Qué gato tan literal.",
    ],
    topics: [
      { label:"¿Cuál es el norte real?", keywords:["norte","real","cual"], response:["El que señala la lente agrietada cuando se alinea con la brújula de Paula. Yo solo señalo hacia arriba y espero acertar."] },
      { label:"¿Quién te dobló?", keywords:["doblo","quien","papel"], response:["Inés, en una noche sin estrellas. Dijo que si el cielo mentía, ella se haría uno propio."] },
    ],
  },
  partitura_falsa: {
    speaker: "La Partitura en Blanco",
    role: "Obra maestra sin una sola nota",
    portrait: "🎼",
    lines: [
      "Contengo la pieza más difícil jamás compuesta. Dura cuatro minutos y treinta y tres segundos de silencio absoluto.",
      "Baltasar dice que eso no es componer, que es vaguería con pentagrama.",
    ],
    topics: [
      { label:"¿Y la melodía de verdad?", keywords:["melodia","verdad","notas"], response:["Está en el cilindro de cera. Tres notas que se repiten: el patrón importa más que el oído."] },
      { label:"¿Sirves para algo?", keywords:["sirves","algo","util"], response:["El papel en blanco siempre sirve. Solo hay que encontrar la tinta adecuada… o una lente que la revele."] },
    ],
  },
  mapa_falso: {
    speaker: "El Mapa Perfecto",
    role: "Cartografía optimista",
    portrait: "🗺",
    lines: [
      "¡Buenas noticias! He encontrado la salida. Está a doscientos metros y hay una heladería justo al lado.",
      "No preguntes cómo cabe una heladería dentro de una mansión. Los mapas tenemos licencia artística.",
    ],
    topics: [
      { label:"¿Existe esa heladería?", keywords:["heladeria","existe","salida"], response:["Existir, lo que se dice existir… no. Pero anima mucho mirarla en el papel."] },
      { label:"¿Dónde está el plano bueno?", keywords:["plano","bueno","tuneles"], response:["Dentro de un baúl, custodiado por polvo y por un gato que cabe donde no debería."] },
    ],
  },
  moneda_pozo: {
    speaker: "La Moneda del Aljibe",
    role: "Moneda de dos caras iguales",
    portrait: "🪙",
    lines: [
      "Lánzame al aire y decide con mi resultado. Cara: compuerta cerrada. Cruz: compuerta cerrada.",
      "Llevo cien años dando el mismo consejo y nadie me ha acusado nunca de contradecirme.",
    ],
    topics: [
      { label:"¿Entonces no ayudas?", keywords:["ayudas","sirves","no"], response:["Te ayudo a descartar el azar. En esta casa, adivinar sale caro; contar bien, no."] },
      { label:"¿Quién te tiró aquí?", keywords:["tiro","quien","pozo"], response:["Trece personas pidieron trece deseos. Doce salieron del agua. Yo me quedé a hacer compañía a la que faltaba."] },
    ],
  },
  palanca_dorada: {
    speaker: "La Palanca Dorada",
    role: "Trampa con muy buena presentación",
    portrait: "🔱",
    lines: [
      "«TIRAR PARA GANAR». Lo pone bien grande. ¿A que da gusto leer instrucciones claras?",
      "Gafe se ha sentado encima. Qué gato tan poco deportivo.",
    ],
    topics: [
      { label:"¿Qué pasa si tiro?", keywords:["tiro","pasa","ganar"], response:["Un golpe seco dentro del muro y una campanada que nadie quiere oír. Pero técnicamente habrías «tirado», que era lo prometido."] },
      { label:"¿Cómo se libera a Inés?", keywords:["ines","libera","campana"], response:["Sin golpes. Con una cuenta bien explicada y un nudo hecho con su cinta roja. Lo sé porque llevo años viendo fallar a la casa."] },
    ],
  },
};

const objectTalkTargets: Partial<Record<string, keyof typeof npcDialogue>> = {
  retrato_perro: "pelusa",
};

const sceneNpcsByRoom: Record<SceneId, SceneNpc[]> = {
  vestibulo: [{ id: "basilio", label: "Don Basilio", cls: "npc ghost basilio", letter: "B", image: "/character-basilio-v1.png" }],
  biblioteca: [{ id: "elvira", label: "Doña Elvira", cls: "npc ghost elvira", letter: "E" }],
  cocina: [{ id: "tomas", label: "Tomás", cls: "npc ghost tomas", letter: "T" }],
  archivo: [{ id: "ines", label: "Inés", cls: "npc ghost ines", letter: "I" }],
  invernadero: [{ id: "bruma", label: "Señora Bruma", cls: "npc bruma", letter: "B" }],
  galeria: [{ id: "basilio", label: "Don Basilio", cls: "npc ghost basilio", letter: "B", image: "/character-basilio-v1.png" }],
  dormitorio: [{ id: "ines", label: "Eco de Inés", cls: "npc ghost ines", letter: "I" }],
  observatorio: [{ id: "ines", label: "Eco de Inés", cls: "npc ghost ines", letter: "I" }],
  musica: [{ id: "baltasar", label: "Baltasar", cls: "npc baltasar", letter: "B" }],
  desvan: [{ id: "basilio", label: "Don Basilio", cls: "npc ghost basilio", letter: "B", image: "/character-basilio-v1.png" }],
  tuneles: [{ id: "tomas", label: "Tomás", cls: "npc ghost tomas", letter: "T" }],
  torre: [{ id: "ines", label: "Inés", cls: "npc ghost ines", letter: "I" }],
};

function isRoomLocked(next: SceneId, solved: Set<PuzzleId>) {
  return (
    (next === "archivo" && (!solved.has("reloj") || !solved.has("presion"))) ||
    ((next === "invernadero" || next === "galeria") && !solved.has("sello")) ||
    (next === "dormitorio" && (!solved.has("flora") || !solved.has("retratos"))) ||
    (next === "observatorio" && !solved.has("caja")) ||
    ((next === "musica" || next === "desvan") && !solved.has("estrellas")) ||
    (next === "tuneles" && (!solved.has("melodia") || !solved.has("baules"))) ||
    (next === "torre" && !solved.has("compuertas"))
  );
}

function objectiveFor(solved: Set<PuzzleId>, flags: Set<string>, inventory: string[]) {
  const has = (item: string) => inventory.includes(item);
  if (flags.has("epilogo_visto")) return "El misterio está resuelto. Puedes revisar el cuaderno o comenzar una partida nueva.";
  if (solved.has("campana")) return "Volver al vestíbulo con Inés y despedirse de la mansión.";
  if (solved.has("compuertas")) return has("Nudo silencioso")
    ? "Usar el nudo silencioso en la campana y escuchar a Inés."
    : "Recoger la cinta roja de Inés y combinarla con la cuerda de la campana.";
  if (solved.has("melodia") && solved.has("baules")) {
    if (!has("Clave de resonancia")) return "Combinar la partitura invisible con el diapasón de cobre.";
    if (!has("Plano marcado por Gafe")) return "Combinar el plano de los túneles con la tiza azul del vestíbulo.";
    if (!has("Ruta segura del aljibe")) return "Combinar el plano marcado con la clave de resonancia.";
    return "Usar la ruta segura de Gafe en las compuertas del aljibe.";
  }
  if (solved.has("estrellas")) return "Explorar el salón de música y el desván; sus pistas forman una sola canción.";
  if (solved.has("caja")) return has("Mapa celeste revelado")
    ? "Usar el mapa celeste revelado en el observatorio."
    : "Combinar la lente de tinta lunar con el mapa estelar.";
  if (solved.has("flora") && solved.has("retratos")) return has("Ruta bordada de Inés")
    ? "Usar la ruta bordada en la caja de música del dormitorio."
    : "Combinar el mapa del ala norte con la cinta de Inés.";
  if (solved.has("sello")) return "Explorar el invernadero y la galería; Gafe detecta dos pistas de Inés.";
  if (solved.has("reloj") && solved.has("presion")) return has("Mecanismo del archivo")
    ? "Usar el mecanismo montado en la puerta del archivo y escuchar a Inés."
    : "Combinar el engranaje de marfil con la llave de servicio.";
  if (!solved.has("reloj")) return flags.has("sello_encontrado")
    ? "Cruza la puerta izquierda, interroga a Elvira y usa el sello en el reloj."
    : "Explora el vestíbulo, reúne pistas y encuentra el sello oculto de Aurelia.";
  return "Reparar la presión de la cocina y conseguir la llave de servicio.";
}

export function MansionGame() {
  const [started, setStarted] = useState(false);
  const [device, setDevice] = useState<DeviceMode | null>(readDeviceMode);
  const [scene, setScene] = useState<SceneId>("vestibulo");
  const [verb, setVerb] = useState<Verb>("mirar");
  const [inventory, setInventory] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [solved, setSolved] = useState<Set<PuzzleId>>(new Set());
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [dialogueLine, setDialogueLine] = useState(0);
  const [toast, setToast] = useState("La tormenta ha borrado el camino de vuelta.");
  const [puzzle, setPuzzle] = useState<PuzzleId | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<string[]>([
    "Soy ECO. Puedo analizar lo que ya has visto, pero no resolveré el misterio por ti. Prueba a preguntarme «¿qué hago ahora?», «estoy atascada», «¿qué puedo coger aquí?» o «¿a dónde puedo ir?».",
  ]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [gafeSense, setGafeSense] = useState(false);
  const [scare, setScare] = useState<string | null>(null);
  const [storyStep, setStoryStep] = useState<number | null>(null);
  const [storyReplay, setStoryReplay] = useState(false);
  const [endingStep, setEndingStep] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [roomTransition, setRoomTransition] = useState<{ label: string; direction: "left" | "right" } | null>(null);
  const [paulaX, setPaulaX] = useState(43);
  const [paulaFacing, setPaulaFacing] = useState<"left" | "right">("right");
  const [gafeX, setGafeX] = useState(34);
  const [gafeFacing, setGafeFacing] = useState<"left" | "right">("right");
  const [walkDuration, setWalkDuration] = useState(620);
  const [walking, setWalking] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; nodes: AudioScheduledSourceNode[]; master: GainNode } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const walkTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number[]>([]);

  const objective = objectiveFor(solved, flags, inventory);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const save = readSavedGame();
      if (!save) return;
      setScene(save.scene);
      setInventory(save.inventory);
      setSolved(new Set(save.solved));
      setFlags(new Set(save.flags));
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (device) document.documentElement.dataset.device = device;
    else delete document.documentElement.dataset.device;
  }, [device]);

  const chooseDevice = (value: DeviceMode) => {
    setDevice(value);
    try { localStorage.setItem(DEVICE_KEY, value); } catch { /* El modo por defecto sigue siendo jugable sin almacenamiento. */ }
  };

  useEffect(() => {
    const voiceWindow = window as AndroidVoiceWindow;
    if ("serviceWorker" in navigator && !voiceWindow.AndroidVoice) void navigator.serviceWorker.register("/sw.js");
    if (voiceWindow.AndroidVoice?.isAvailable) {
      setVoiceAvailable(voiceWindow.AndroidVoice.isAvailable());
    } else {
      const speechWindow = window as typeof window & { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
      setVoiceAvailable(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition));
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const save: SavedGame = { version: 4, scene, inventory, solved: [...solved], flags: [...flags] };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // The adventure remains playable when private browsing blocks storage.
    }
  }, [started, scene, inventory, solved, flags]);

  useEffect(() => () => {
    if (walkTimerRef.current !== null) window.clearTimeout(walkTimerRef.current);
    transitionTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    try { recognitionRef.current?.stop(); } catch { /* The recognizer may already be closed. */ }
    const voiceWindow = window as AndroidVoiceWindow;
    voiceWindow.AndroidVoice?.cancelListening();
    delete voiceWindow.__onAndroidVoiceResult;
    delete voiceWindow.__onAndroidVoiceError;
    audioRef.current?.nodes.forEach((node) => node.stop());
    void audioRef.current?.ctx.close();
  }, []);

  const begin = () => {
    setStoryReplay(false);
    setStarted(true);
    if (!flags.has("prologo_visto")) setStoryStep(0);
    else if (!flags.has("intro_vista")) {
      setDialogue(openingDialogue);
      setDialogueLine(0);
      setFlags((old) => new Set(old).add("intro_vista"));
    }
  };

  const advanceStory = () => {
    if (storyStep === null) return;
    if (storyStep + 1 < storyCards.length) {
      setStoryStep((old) => old === null ? 0 : old + 1);
      return;
    }
    setStoryStep(null);
    if (storyReplay) {
      setStoryReplay(false);
      setStarted(false);
      return;
    }
    setFlags((old) => new Set(old).add("prologo_visto").add("intro_vista"));
    setDialogue(openingDialogue);
    setDialogueLine(0);
    setToast("Objetivo: explora el vestíbulo, recoge pistas y descubre qué puerta merece confianza.");
  };

  const replayStory = () => {
    setStoryReplay(true);
    setStarted(true);
    setDialogue(null);
    setStoryStep(0);
  };

  const startNewGame = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* Storage may be unavailable. */ }
    setScene("vestibulo");
    setVerb("mirar");
    setInventory([]);
    setSelectedItem(null);
    setSolved(new Set());
    setFlags(new Set());
    setDialogue(null);
    setDialogueLine(0);
    setToast("La tormenta ha borrado el camino de vuelta.");
    setPuzzle(null);
    setQuestionIndex(0);
    setAnswer("");
    setMistakes(0);
    setAiMessages(["Soy ECO, el asistente de pistas de la mansión. Puedo recordar lo que Paula ya ha descubierto."]);
    setJournalOpen(false);
    setAiOpen(false);
    setGafeSense(false);
    setStoryReplay(false);
    setEndingStep(null);
    setResetConfirm(false);
    setStarted(true);
    setStoryStep(0);
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      audioRef.current.nodes.forEach((node) => node.stop());
      void audioRef.current.ctx.close();
      audioRef.current = null;
      setAudioOn(false);
      return;
    }
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) { setToast("Este dispositivo no permite activar el ambiente sonoro."); return; }
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    master.gain.value = 0.11;
    master.connect(ctx.destination);
    const padGain = ctx.createGain();
    padGain.gain.value = 0.055;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 520;
    padGain.connect(padFilter);
    padFilter.connect(master);
    const nodes: AudioScheduledSourceNode[] = [86, 129, 173].map((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 1 ? "triangle" : "sine";
      osc.frequency.value = frequency;
      osc.detune.value = index * 4 - 4;
      osc.connect(padGain);
      osc.start();
      return osc;
    });
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < noiseData.length; index += 1) {
      const white = Math.random() * 2 - 1;
      brown = (brown + 0.02 * white) / 1.02;
      noiseData[index] = brown * 2.4;
    }
    const wind = ctx.createBufferSource();
    const windFilter = ctx.createBiquadFilter();
    const windGain = ctx.createGain();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    windFilter.type = "bandpass";
    windFilter.frequency.value = 420;
    windFilter.Q.value = .35;
    windGain.gain.value = .055;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();
    nodes.push(wind);
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.09;
    lfoDepth.gain.value = 0.018;
    lfo.connect(lfoDepth);
    lfoDepth.connect(padGain.gain);
    lfo.start();
    nodes.push(lfo);
    audioRef.current = { ctx, nodes, master };
    setAudioOn(true);
    setToast("La mansión despierta. El sonido está pensado para escucharse a volumen moderado.");
  };

  const playFx = (kind: "item" | "door" | "correct" | "wrong" | "combine") => {
    const engine = audioRef.current;
    if (!engine) return;
    const { ctx, master } = engine;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "wrong" ? .11 : .075, now + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === "door" ? .8 : .42));
    gain.connect(master);
    const frequencies: Record<typeof kind, [number, number]> = {
      item: [520, 780],
      combine: [392, 784],
      correct: [440, 660],
      wrong: [122, 82],
      door: [74, 48],
    };
    frequencies[kind].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = kind === "wrong" || kind === "door" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(frequency, now + index * .055);
      if (kind === "door") osc.frequency.exponentialRampToValueAtTime(frequency * .55, now + .72);
      osc.connect(gain);
      osc.start(now + index * .055);
      osc.stop(now + (kind === "door" ? .82 : .46));
    });
  };

  const addItem = useCallback((item: string) => {
    setInventory((old) => old.includes(item) ? old : [...old, item]);
  }, []);

  const selectInventoryItem = (item: string) => {
    if (selectedItem === item) {
      setSelectedItem(null);
      setToast(`${item} vuelve a la mochila.`);
      return;
    }
    if (selectedItem) {
      const combination = inventoryCombinations.find(({ items }) =>
        items.includes(selectedItem) && items.includes(item),
      );
      if (combination) {
        addItem(combination.result);
        setFlags((old) => new Set(old).add(combination.flag));
        setSelectedItem(combination.result);
        setVerb("usar");
        playFx("combine");
        setToast(`${combination.text} «${combination.result}» queda seleccionado.`);
        return;
      }
      setToast(`${selectedItem} y ${item.toLowerCase()} no encajan. Paula guarda el primero y prepara ${item.toLowerCase()}.`);
    } else {
      setToast(`${item} seleccionado. Ahora toca el lugar donde quieras usarlo, o elige otro objeto para combinarlos.`);
    }
    setSelectedItem(item);
    setVerb("usar");
  };

  const speak = (id: keyof typeof npcDialogue) => {
    setDialogue(npcDialogue[id]);
    setDialogueLine(0);
    setFlags((old) => new Set(old)
      .add(`${scene}_talked`)
      .add(`${scene}_${id}_talked`)
      .add(id === "basilio" ? "basilio_interrogado" : `${id}_interrogado`));
  };

  const askGafe = () => {
    setFlags((old) => new Set(old).add("gafe_consultado").add(`${scene}_talked`).add(`${scene}_gafe_talked`));
    setGafeSense((old) => !old);
    const hints: Record<SceneId, string> = {
      vestibulo: "Gafe olfatea el retrato de Aurelia y araña suavemente el marco.", biblioteca: "Gafe sigue con la mirada las tres agujas del reloj.", cocina: "Gafe escucha la tubería marcada con cobre.", archivo: "Gafe se sienta frente a la puerta; faltan dos piezas en su cerradura.",
      invernadero: "Gafe distingue tres aromas: luna, menta y lluvia. Las flores pálidas son las importantes.", galeria: "Gafe se coloca entre los retratos de Aurelia y Elvira: él ya conoce el orden.", dormitorio: "Gafe mete una pata bajo la caja de música y saca una tira con el patrón 3–6–12.", observatorio: "Gafe proyecta su sombra sobre la constelación dibujada por Inés.",
      musica: "Gafe pisa las teclas DO, MI y SOL, y vuelve a empezar.", desvan: "Gafe cabe bajo las sábanas: el baúl número 7 huele a tinta y lavanda.", tuneles: "Gafe evita la segunda compuerta y espera junto a la tercera.", torre: "Gafe no mira la campana; mira a Paula. La última respuesta no es un número.",
    };
    setToast(hints[scene]);
  };

  const askDialogueQuestion = (spoken: string, topic?: DialogueTopic) => {
    if (!dialogue?.topics?.length) return;
    const clean = normalizeText(spoken);
    const match = topic ?? dialogue.topics.find((candidate) => candidate.keywords.some((keyword) => clean.includes(normalizeText(keyword))));
    const response = match?.response ?? ["La casa se traga la pregunta. Prueba con una de las opciones o habla un poco más despacio."];
    setDialogue({ ...dialogue, lines: response });
    setDialogueLine(0);
    if (dialogue.speaker === "Don Basilio") setFlags((old) => new Set(old).add("basilio_interrogado"));
  };

  const playScareSting = () => {
    const ctx = audioRef.current?.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const stingGain = ctx.createGain();
    stingGain.gain.setValueAtTime(0.0001, now);
    stingGain.gain.exponentialRampToValueAtTime(0.075, now + 0.035);
    stingGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    stingGain.connect(ctx.destination);
    [98, 147].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.38, now + 0.9);
      osc.connect(stingGain);
      osc.start(now);
      osc.stop(now + 1.2);
    });
  };

  const playPaulaScream = () => {
    const engine = audioRef.current;
    if (!audioOn || !engine) return;
    const { ctx } = engine;
    const now = ctx.currentTime;
    const cryGain = ctx.createGain();
    const cryFilter = ctx.createBiquadFilter();
    cryFilter.type = "bandpass";
    cryFilter.frequency.value = 1250;
    cryFilter.Q.value = 2.2;
    cryGain.gain.setValueAtTime(.0001, now);
    cryGain.gain.exponentialRampToValueAtTime(.18, now + .025);
    cryGain.gain.exponentialRampToValueAtTime(.07, now + .24);
    cryGain.gain.exponentialRampToValueAtTime(.0001, now + .72);
    cryFilter.connect(cryGain);
    cryGain.connect(ctx.destination);
    [620, 930].forEach((frequency, index) => {
      const voice = ctx.createOscillator();
      voice.type = index === 0 ? "sawtooth" : "triangle";
      voice.frequency.setValueAtTime(frequency, now);
      voice.frequency.exponentialRampToValueAtTime(frequency * 1.38, now + .19);
      voice.frequency.exponentialRampToValueAtTime(frequency * .72, now + .68);
      voice.connect(cryFilter);
      voice.start(now);
      voice.stop(now + .74);
    });
  };

  const openPuzzle = (id: PuzzleId) => {
    if (solved.has(id)) {
      setToast("El mecanismo ya está resuelto. Solo queda un eco satisfecho.");
      return;
    }
    const tool = puzzleTools[id];
    const roomBrief = roomBriefs[tool.room];
    const missingPrior = tool.prior?.find((prior) => !solved.has(prior));
    if (missingPrior) {
      setToast(`Antes hace falta resolver «${puzzleBank[missingPrior].title}». La mansión no permite saltarse esa parte de la historia.`);
      playFx("wrong");
      return;
    }
    if (!flags.has(roomBrief.talkFlag)) {
      setToast(`Primero: ${roomBrief.talk.toLowerCase()}. Puede conocer la condición que el mecanismo intenta ocultar.`);
      return;
    }
    if (!flags.has(roomBrief.clueFlag)) {
      setToast(`Todavía falta una pista física: ${roomBrief.clue.toLowerCase()}. Usa COGER para guardarla.`);
      return;
    }
    if (!inventory.includes(tool.item)) {
      setToast(tool.readyText);
      return;
    }
    if (verb !== "usar" || !selectedItem) {
      setToast(tool.readyText);
      return;
    }
    if (selectedItem !== tool.item) {
      const falseClueResponses: Record<string, string> = {
        "Campanilla muda": "La campanilla suelta un sonido diminuto. Todas las sombras de la habitación giran hacia Paula. Era exactamente la reacción que esperaba la casa.",
        "Llave de latón doblada": "La llave se dobla un poco más y Don Basilio aplaude desde la pared. Pista falsa confirmada.",
        "Marcapáginas del 13": "El mecanismo escupe el marcapáginas. El número 13 era demasiado evidente para ser una respuesta.",
        "Sal negra": "El mecanismo estornuda una nube oscura. Gafe mira a Paula como si esto hubiera sido idea de otra persona.",
        "Llave de porcelana": "La llave de porcelana se parte con un tintineo. Tomás tenía razón: Basilio volvió a mentir.",
        "Pétalo burlón": "El pétalo imita la voz de Inés y da una respuesta imposible. La flor embustera sigue intentando ayudar a la casa.",
        "Medalla de Pelusa": "El barón Pelusa ladra desde el retrato. La medalla solo abre el armario de las galletas.",
        "Botón de nácar": "El botón susurra un número equivocado y luego finge estar dormido.",
        "Estrella de papel": "La estrella gira cinco veces y termina señalando el suelo. Insiste en que eso también es el norte.",
        "Partitura en blanco": "El papel interpreta un silencio muy largo. Baltasar lo califica de «atrevido, pero inútil».",
        "Mapa equivocado": "El mapa conduce otra vez a una heladería inexistente. Gafe se siente personalmente ofendido.",
        "Moneda del aljibe": "La moneda cae de canto: sus dos caras siguen indicando una compuerta cerrada.",
        "Tornillo dorado": "El tornillo activa un golpe seco dentro del muro. La casa había preparado otra trampa demasiado brillante.",
      };
      const response = falseClueResponses[selectedItem] ?? `${selectedItem} no encaja aquí. La pista correcta tiene relación directa con esta habitación.`;
      const falseFlag = `pista_falsa_usada_${normalizeText(selectedItem).replace(/\s+/g, "_")}`;
      const firstAttempt = !flags.has(falseFlag);
      setFlags((old) => new Set(old).add(falseFlag));
      setToast(response);
      playFx("wrong");
      if (firstAttempt && selectedItem !== "Mapa equivocado") {
        setScare("La casa reacciona a la pista falsa.");
        const falseScareTimer = window.setTimeout(() => setScare(null), 900);
        transitionTimerRef.current.push(falseScareTimer);
      }
      return;
    }
    setSelectedItem(null);
    setPuzzle(id);
    setQuestionIndex(0);
    setMistakes(0);
    setAnswer("");
    playFx("combine");
  };

  const resolveInteraction = (target: string) => {
    const lookOnly = (text: string) => setToast(verb === "mirar" ? text : `No parece útil ${verb === "hablar" ? "hablar con eso" : `intentar ${verb} aquí`}.`);
    const roomObject = sceneObjects[scene].find((candidate) => candidate.id === target);
    if (roomObject) {
      const alreadyCollected = roomObject.item ? inventory.includes(roomObject.item) : false;
      if (verb === "coger" && roomObject.item) {
        setFlags((old) => new Set(old).add(roomObject.flag));
        addItem(roomObject.item);
        if (!alreadyCollected) playFx("item");
        setToast(alreadyCollected ? `${roomObject.item} ya está a salvo en la mochila.` : (roomObject.take ?? `Paula guarda ${roomObject.item.toLowerCase()} en la mochila.`));
      } else if (verb === "usar" && selectedItem) {
        setToast(`${selectedItem} no tiene una función clara sobre ${roomObject.label.toLowerCase()}. Prueba a observarlo o combinar el objeto con otra cosa de la mochila.`);
      } else if (verb === "hablar") {
        const npcId = objectTalkTargets[roomObject.id];
        if (npcId) return speak(npcId);
        const objectVoice = objectCharacters[roomObject.id];
        if (objectVoice) {
          setDialogue(objectVoice);
          setDialogueLine(0);
          // No marca `${scene}_talked`: el objetivo "habla con X" debe seguir
          // pidiendo al personaje real, que es quien da la pista que abre el puzzle.
          setFlags((old) => new Set(old).add(`objeto_hablado_${roomObject.id}`));
          return;
        }
        setToast(`Paula pregunta a ${roomObject.label.toLowerCase()}. ${roomObject.look}`);
      } else {
        setToast(roomObject.look);
      }
      return;
    }
    if (target === "gafe") return speak("gafe");
    if (target === "basilio") return speak("basilio");
    if (target === "retrato") {
      if (!flags.has("sello_encontrado") && verb === "coger") {
        const previousFinds = inventory.filter((item) => ["Media carta empapada", "Campanilla muda", "Llave de latón doblada", "Tiza azul"].includes(item)).length;
        if (!flags.has("retrato_examinado")) {
          setToast("Antes de mover un retrato tan antiguo conviene MIRAR el marco. Gafe no quiere que Paula active otra trampa.");
          return;
        }
        if (previousFinds < 2) {
          setToast("El marco tiene dos cierres ocultos. Las pistas del vestíbulo explican cómo soltarlos: guarda al menos dos hallazgos y vuelve.");
          return;
        }
        setFlags((old) => new Set(old).add("sello_encontrado"));
        addItem("Sello de Aurelia");
        playFx("item");
        setToast("Paula separa el marco de la pared. Detrás: el sello de Aurelia y una fecha raspada, 13·11·1913.");
      } else if (verb === "hablar") {
        setToast("El retrato susurra: «La puerta verde es segura». Gafe eriza los bigotes; la voz no era la de Aurelia.");
      } else {
        setFlags((old) => new Set(old).add("retrato_examinado"));
        lookOnly("Aurelia sostiene una llave pintada. El marco tiene polvo por todas partes menos en el borde inferior: alguien lo ha movido.");
      }
      return;
    }
    if (target === "carta") {
      if (verb === "coger") {
        addItem("Media carta empapada");
        setFlags((old) => new Set(old).add("carta_recogida"));
        playFx("item");
        setToast("La tinta está corrida, pero se lee: «…la puerta que huele a papel, no la que presume de su color…»");
      } else lookOnly("Media carta empapada. El sello roto coincide con el dibujo de la brújula de Paula.");
      return;
    }
    if (target === "campanilla") {
      if (verb === "coger") {
        addItem("Campanilla muda");
        setFlags((old) => new Set(old).add("campanilla_recogida"));
        playFx("item");
        setToast("Parece importante, pero no suena. En la base alguien grabó: «Las cosas brillantes también hacen perder el tiempo».");
      } else lookOnly("Una campanilla de latón en mitad de la alfombra. Demasiado limpia para llevar años aquí.");
      return;
    }
    if (target === "baul") {
      if (verb === "coger") {
        addItem("Llave de latón doblada");
        setFlags((old) => new Set(old).add("llave_falsa"));
        playFx("item");
        setToast("Dentro del baúl solo hay una llave doblada. Don Basilio sonríe demasiado: probablemente es una pista falsa.");
      } else lookOnly("Un baúl de viaje con las iniciales I. V. La cerradura ya estaba forzada desde dentro.");
      return;
    }
    if (target === "paraguero") {
      if (verb === "coger") {
        addItem("Tiza azul");
        setFlags((old) => new Set(old).add("tiza_recogida"));
        playFx("item");
        setToast("Paula guarda una tiza azul. Gafe cree que servirá para marcar puertas que cambian de sitio.");
      } else lookOnly("Tres paraguas secos y una tiza azul húmeda. Alguien la usó esta misma noche.");
      return;
    }
    if (target === "huellas") return lookOnly("Huellas pequeñas entran desde la puerta principal y terminan bajo el retrato. No son las de Paula.");
    if (target === "escalera") return lookOnly("Los peldaños superiores terminan en una pared. La arquitectura también miente; una corriente de aire baja desde la puerta izquierda.");
    if (target === "elvira") return speak("elvira");
    if (target === "reloj") return openPuzzle("reloj");
    if (target === "tomas") return speak("tomas");
    if (target === "caldera") return openPuzzle("presion");
    if (target === "ines") return speak("ines");
    if (target === "bruma") return speak("bruma");
    if (target === "baltasar") return speak("baltasar");
    if (target === "flora") return openPuzzle("flora");
    if (target === "retratos") return openPuzzle("retratos");
    if (target === "caja") return openPuzzle("caja");
    if (target === "estrellas") return openPuzzle("estrellas");
    if (target === "melodia") return openPuzzle("melodia");
    if (target === "baules") return openPuzzle("baules");
    if (target === "compuertas") return openPuzzle("compuertas");
    if (target === "campana") return openPuzzle("campana");
    if (target === "puerta") return openPuzzle("sello");
    if (target === "mesa") return lookOnly("Un inventario de 1913: trece criados entraron en la capilla; solo doce salieron.");
  };

  const walkTo = (destination: number, onArrival?: () => void) => {
    // Un toque nuevo mientras Paula camina REDIRIGE el paseo; antes se descartaba
    // en silencio y el juego parecia no responder al segundo toque.
    const next = Math.max(7, Math.min(86, destination));
    const direction = next < paulaX ? "left" : "right";
    const duration = Math.max(320, Math.min(1800, Math.abs(next - paulaX) * 32));
    setPaulaFacing(direction);
    setGafeFacing(direction);
    setWalkDuration(duration);
    setPaulaX(next);
    setGafeX(Math.max(7, Math.min(86, next + (direction === "right" ? -9 : 9))));
    setWalking(true);
    if (walkTimerRef.current !== null) window.clearTimeout(walkTimerRef.current);
    walkTimerRef.current = window.setTimeout(() => {
      setWalking(false);
      walkTimerRef.current = null;
      onArrival?.();
    }, duration + 120);
  };

  const interact = (target: string) => {
    const roomObject = sceneObjects[scene].find((candidate) => candidate.id === target);
    walkTo(roomObject?.x ?? interactionPositions[target] ?? paulaX, () => resolveInteraction(target));
  };

  const handleScenePointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (dialogue || puzzle || journalOpen || aiOpen || roomTransition || storyStep !== null || endingStep !== null || scare) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    walkTo(((event.clientX - bounds.left) / bounds.width) * 100);
  };

  const finishPuzzle = (id: PuzzleId) => {
    setSolved((old) => new Set(old).add(id));
    setPuzzle(null);
    setQuestionIndex(0);
    playFx("correct");
    if (id === "reloj") {
      addItem("Engranaje de marfil");
      setToast("El reloj se abre. Dentro espera un engranaje tallado con trece dientes.");
    } else if (id === "presion") {
      addItem("Llave de servicio");
      setToast("La caldera exhala y entrega una llave negra, todavía tibia.");
    } else if (id === "sello") {
      setFlags((old) => new Set(old).add("voz_ines_liberada"));
      addItem("Mapa del ala norte");
      setDialogue({ speaker: "Inés", role: "La decimotercera heredera", portrait: "/character-ines-v2.png", lines: ["Has abierto mi voz, pero yo sigo atada a la torre.", "Busca mi caja de música. Gafe conoce el camino al invernadero."] });
      setDialogueLine(0);
      setToast("El ala norte despierta. Dos pasillos nuevos aparecen en el mapa.");
    } else if (id === "flora") { addItem("Lente de tinta lunar"); setToast("La señora Bruma entrega a Paula una lente envuelta en hojas secas."); }
    else if (id === "retratos") { addItem("Cinta de Inés"); setToast("Detrás del retrato central aparece una cinta con pequeñas estrellas cosidas."); }
    else if (id === "caja") { addItem("Mapa estelar"); setToast("La caja de música proyecta un mapa de estrellas sobre el techo."); }
    else if (id === "estrellas") { addItem("Partitura invisible"); setToast("La lente revela una partitura escrita entre las constelaciones."); }
    else if (id === "melodia") { addItem("Diapasón de cobre"); setToast("El piano responde con una nota grave. Una puerta se abre sobre el techo."); }
    else if (id === "baules") { addItem("Plano de los túneles"); setToast("Gafe sale del baúl con un plano entre los dientes y mucho polvo en los bigotes."); }
    else if (id === "compuertas") { addItem("Cuerda de la campana"); setToast("El agua baja y deja libre la escalera de la torre."); }
    else if (id === "campana") {
      setFlags((old) => new Set(old).add("ines_rescatada"));
      setDialogue({ speaker: "Inés", role: "Libre al fin", portrait: "/character-ines-v2.png", lines: ["La casa quería una cuenta perfecta. Tú le diste una historia distinta.", "Vámonos a casa. Gafe ya ha encontrado la salida… y probablemente también la cena."] });
      setDialogueLine(0);
      setToast("La campana permanece en silencio. Inés acompaña ahora a Paula y Gafe: regresad juntos al vestíbulo.");
    }
  };

  const submitAnswer = () => {
    if (!puzzle) return;
    const current = puzzleBank[puzzle].questions[questionIndex];
    const correct = isCorrectAnswer(answer, current.answer, current.accept);
    if (correct) {
      if (questionIndex + 1 >= puzzleBank[puzzle].questions.length) finishPuzzle(puzzle);
      else {
        setQuestionIndex((old) => old + 1);
        setAnswer("");
        setMistakes(0);
        playFx("correct");
        setToast("Correcto. El mecanismo acepta la respuesta y prepara la siguiente prueba.");
      }
    } else {
      setMistakes((old) => old + 1);
      playFx("wrong");
      setToast("La casa rechaza el resultado. Respíralo y repásalo paso a paso; si vuelves a fallar, Gafe te dará una pista.");
    }
  };

  const startListening = (onText: (text: string) => void) => {
    if (!voiceAvailable) {
      setToast("La voz no está disponible en este dispositivo. Escribe la respuesta con el teclado.");
      return;
    }
    const voiceWindow = window as AndroidVoiceWindow;
    if (voiceWindow.AndroidVoice) {
      voiceWindow.AndroidVoice.cancelListening();
      voiceWindow.__onAndroidVoiceResult = (text) => {
        setListening(false);
        onText(text);
      };
      voiceWindow.__onAndroidVoiceError = (message) => {
        setListening(false);
        setToast(message);
      };
      setListening(true);
      voiceWindow.AndroidVoice.startListening();
      return;
    }
    const speechWindow = window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToast("Este navegador no ofrece reconocimiento de voz. Puedes escribir la respuesta.");
      return;
    }
    try { recognitionRef.current?.stop(); } catch { /* The previous session may already be closed. */ }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => onText(event.results[0][0].transcript);
    recognition.onerror = () => {
      setListening(false);
      setToast("No he podido entenderte. Acércate al micrófono o escribe la respuesta.");
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setListening(false);
    };
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setToast("El micrófono está ocupado. Espera un momento y vuelve a intentarlo.");
    }
  };

  const askEco = (spoken?: string) => {
    const query = (spoken ?? aiInput).trim();
    if (!query) return;
    const lower = normalizeText(query);
    const brief = roomBriefs[scene];
    const currentPuzzle = brief.puzzle;
    const availableCombination = inventoryCombinations.find(({ items, result }) =>
      items.every((item) => inventory.includes(item)) && !inventory.includes(result),
    );
    let response = `Ahora mismo: ${objective}`;

    // El siguiente paso concreto de ESTA sala, en orden de progresion.
    const nextStepHere = () => {
      if (scene === "vestibulo") {
        if (!flags.has("gafe_consultado") && !flags.has("basilio_interrogado")) return "Habla con Gafe (boton de la pata) o con Don Basilio. Uno dice la verdad y el otro se divierte.";
        if (!flags.has("retrato_examinado")) return "MIRA el retrato de Aurelia antes de tocarlo. El marco esconde el truco.";
        if (vestibuleFinds < 2) return `Necesitas dos hallazgos del vestibulo y llevas ${vestibuleFinds}. Usa COGER en la carta, la campanilla, el baul o el paraguero.`;
        if (!flags.has("sello_encontrado")) return "Ya puedes usar COGER en el retrato de Aurelia: detras esta su sello.";
        return "Tienes el sello. Cruza la puerta de la izquierda hacia la biblioteca.";
      }
      if (!currentPuzzle) return objective;
      if (solved.has(currentPuzzle)) return `Esta sala ya esta resuelta. ${objective}`;
      if (!flags.has(brief.talkFlag)) return `Primero: ${brief.talk}. Aqui las conversaciones dan informacion real, no relleno.`;
      if (!flags.has(brief.clueFlag)) return `Ahora: ${brief.clue}. Cambia al verbo COGER y toca el objeto.`;
      if (!inventory.includes(puzzleTools[currentPuzzle].item)) return puzzleTools[currentPuzzle].readyText;
      return `Selecciona «${puzzleTools[currentPuzzle].item}» en la mochila y usalo en el mecanismo de la sala.`;
    };

    // Que objetos quedan por coger aqui (sin desvelar para que sirven).
    const pendingHere = sceneObjects[scene]
      .filter((object) => object.item && !inventory.includes(object.item))
      .map((object) => object.label);

    if (/a donde|adonde|donde (voy|ir|puedo ir)|puerta|salir|salida|otra (sala|habitacion)/.test(lower)) {
      const openDoors = ([roomConnections[scene].left, roomConnections[scene].right]
        .filter(Boolean) as SceneId[])
        .filter((room) => !isRoomLocked(room, solved));
      response = openDoors.length
        ? `Desde aqui puedes ir a: ${openDoors.map((room) => scenes[room].name).join(" y ")}.`
        : "Las salidas de esta sala siguen cerradas. Resuelve primero el mecanismo de esta habitacion.";
    } else if (/coger|recoger|guardar|que hay aqui|que queda/.test(lower)) {
      response = pendingHere.length
        ? `En ${scenes[scene].name.toLowerCase()} aun puedes recoger: ${pendingHere.join(", ")}. Recuerda cambiar al verbo COGER.`
        : "En esta sala ya has recogido todo lo que se puede guardar. El siguiente paso esta en el mecanismo o en otra habitacion.";
    } else if (/atasca|atascad|bloquea|no puedo|no se que|perdid|ayudame|siguiente paso|que hago/.test(lower)) {
      response = nextStepHere();
    } else if (/combinar|mezclar|mochila|inventario|objeto/.test(lower)) {
      response = availableCombination
        ? `En la mochila hay dos piezas relacionadas: ${availableCombination.items[0]} y ${availableCombination.items[1]}. Selecciona una y después la otra.`
        : selectedItem
          ? `${selectedItem} está preparado. Toca otro objeto para combinarlo o un mecanismo para usarlo.`
          : "Selecciona un objeto de la mochila. Puedes tocar otro para combinarlos o usarlo sobre un mecanismo de la escena.";
    } else if (/objetivo|hacer|ahora|ayuda|pista/.test(lower)) {
      response = nextStepHere();
    } else if (/elvira|biblioteca|reloj/.test(lower)) {
      response = solved.has("reloj") ? "El engranaje de Elvira encaja con una pieza obtenida en la cocina." : "Habla con Elvira, recoge la página y usa el sello de Aurelia en el reloj.";
    } else if (/tom[aá]s|cocina|caldera|v[aá]lvula/.test(lower)) {
      response = solved.has("presion") ? "La llave de servicio forma un mecanismo con el engranaje de marfil." : "Escucha a Tomás, recoge la receta chamuscada y úsala en la caldera.";
    } else if (/in[eé]s|puerta|capilla|archivo/.test(lower)) {
      response = solved.has("sello") ? "La voz de Inés está libre, pero su recuerdo continúa en la torre." : "Combina el engranaje y la llave, escucha a Inés, recoge el registro y usa el mecanismo en la puerta.";
    } else if (/gafe|gato/.test(lower)) {
      response = "Gafe puede detectar la pista principal de cada habitación. Sus indicaciones cambian según el lugar y nunca consumen objetos.";
    } else if (/falsa|mentira|basilio|trampa/.test(lower)) {
      response = "Las pistas falsas ya no son decorativas: pruébalas en un mecanismo si quieres descubrir su reacción, pero la casa puede responder con un susto.";
    } else if (/sello|aurelia/.test(lower)) {
      response = flags.has("sello_encontrado") ? "El sello está en la mochila. Selecciónalo y úsalo en el reloj tras hablar con Elvira y recoger su página." : "Mira primero el retrato de Aurelia y reúne dos hallazgos del vestíbulo antes de mover el marco.";
    }
    setAiMessages((old) => [...old.slice(-7), `PAULA · ${query}`, `ECO · ${response}`]);
    setAiInput("");
  };

  const canTravel = (next: SceneId) => {
    const locked = isRoomLocked(next, solved);
    if (locked) setToast("Esa puerta todavía no se abre. Las pistas del objetivo actual explican qué le falta.");
    return !locked;
  };

  const travel = (next: SceneId, direction: "left" | "right" = "right") => {
    if (next === scene || roomTransition || !canTravel(next)) return;
    transitionTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    playFx("door");
    setRoomTransition({ label: `Cruzando hacia ${scenes[next].name}`, direction });
    const changeTimer = window.setTimeout(() => {
      setScene(next);
      setPaulaX(direction === "right" ? 12 : 84);
      setGafeX(direction === "right" ? 5 : 91);
      setWalking(false);
      setToast(scenes[next].description);
      setGafeSense(false);
      const scareMessages: Partial<Record<SceneId, string>> = {
        cocina: "Una válvula gira sola y golpea la tubería tres veces.",
        galeria: "Un retrato acaba de parpadear.",
        archivo: "La voz de Paula susurra desde el otro lado de la puerta.",
        observatorio: "Todas las estrellas se apagan… menos una.",
        desvan: "Algo corre bajo las sábanas… demasiado grande para ser Gafe.",
        tuneles: "El reflejo de Paula tarda un segundo de más en imitarla.",
      };
      const scareMessage = scareMessages[next];
      if (scareMessage && !flags.has(`susto_${next}`)) {
        setFlags((old) => new Set(old).add(`susto_${next}`));
        const scareStartTimer = window.setTimeout(() => { playScareSting(); playPaulaScream(); }, 260);
        setScare(scareMessage);
        const scareEndTimer = window.setTimeout(() => setScare(null), 1300);
        transitionTimerRef.current.push(scareStartTimer, scareEndTimer);
      }
      if (next === "vestibulo" && solved.has("campana") && !flags.has("epilogo_visto")) {
        setDialogue(null);
        setEndingStep(0);
        setToast("Los tres han vuelto al vestíbulo. La puerta principal empieza a abrirse.");
      }
    }, 420);
    const finishTimer = window.setTimeout(() => setRoomTransition(null), 980);
    transitionTimerRef.current = [changeTimer, finishTimer];
  };

  const walkThroughDoor = (next: SceneId, destination: number, direction: "left" | "right") => {
    if (roomTransition || !canTravel(next)) return;
    walkTo(destination, () => travel(next, direction));
  };

  const advanceEnding = () => {
    if (endingStep === null) return;
    if (endingStep + 1 < endingCards.length) {
      setEndingStep((old) => old === null ? 0 : old + 1);
      return;
    }
    const completedFlags = new Set(flags).add("epilogo_visto").add("aventura_completada");
    setFlags(completedFlags);
    setEndingStep(null);
    setDialogue(null);
    setScene("vestibulo");
    setToast("Aventura completada. La partida queda guardada y siempre podrás volver a visitar la mansión.");
    try {
      const save: SavedGame = { version: 4, scene:"vestibulo", inventory, solved:[...solved], flags:[...completedFlags] };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch { /* The final scene remains playable without storage. */ }
    setStarted(false);
  };

  useEffect(() => {
    const voiceWindow = window as AndroidVoiceWindow;
    voiceWindow.__onAndroidBack = () => {
      if (!started && !resetConfirm) return "exit";
      if (resetConfirm) setResetConfirm(false);
      else if (endingStep !== null) setEndingStep(null);
      else if (storyStep !== null) {
        setStoryStep(null);
        if (storyReplay) {
          setStoryReplay(false);
          setStarted(false);
        }
      }
      else if (dialogue) setDialogue(null);
      else if (puzzle) setPuzzle(null);
      else if (journalOpen) setJournalOpen(false);
      else if (aiOpen) setAiOpen(false);
      else if (selectedItem) setSelectedItem(null);
      else if (scene !== "vestibulo") {
        const previous = roomConnections[scene].left;
        if (previous) {
          setScene(previous);
          setPaulaX(82);
          setGafeX(90);
          setToast(`Paula y Gafe regresan a ${scenes[previous].name}.`);
        }
      } else setStarted(false);
      return "handled";
    };
    return () => { delete voiceWindow.__onAndroidBack; };
  }, [aiOpen, dialogue, endingStep, journalOpen, puzzle, resetConfirm, scene, selectedItem, started, storyReplay, storyStep]);

  const dialogueText = dialogue?.lines[dialogueLine] ?? "";
  const sceneNpcs = sceneNpcsByRoom[scene];
  const previousRoom = roomConnections[scene].left ?? null;
  const nextRoom = roomConnections[scene].right ?? null;
  const vestibuleFinds = inventory.filter((item) => ["Media carta empapada", "Campanilla muda", "Llave de latón doblada", "Tiza azul", "Sello de Aurelia"].includes(item)).length;
  const roomBrief = roomBriefs[scene];
  const roomTalked = scene === "vestibulo"
    ? flags.has("gafe_consultado") || flags.has("basilio_interrogado")
    : flags.has(roomBrief.talkFlag);
  const roomClueFound = scene === "vestibulo" ? vestibuleFinds >= 2 : flags.has(roomBrief.clueFlag);
  const roomChallengeDone = scene === "vestibulo" ? flags.has("sello_encontrado") : Boolean(roomBrief.puzzle && solved.has(roomBrief.puzzle));

  if (device === null) {
    return (
      <main className="title-screen device-chooser">
        <div className="title-backdrop"><Image className="title-backdrop-image" src="/cover-paula-gafe-v2.png" alt="" fill sizes="100vw" priority /></div>
        <section className="title-card">
          <p className="eyebrow">Antes de empezar</p>
          <h2 className="device-title">¿Dónde vas a jugar?</h2>
          <p>Elegimos los controles para que se vean cómodos. Podrás cambiarlo cuando quieras. El juego siempre se juega en horizontal.</p>
          <div className="device-options">
            <button onClick={() => chooseDevice("tablet")} aria-label="Jugar en tablet">
              <i aria-hidden="true">▭</i><b>Tablet</b><small>Pantalla grande</small>
            </button>
            <button onClick={() => chooseDevice("phone")} aria-label="Jugar en móvil">
              <i aria-hidden="true">▯</i><b>Móvil</b><small>Botones grandes · apaisado</small>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="title-screen">
        <div className="title-backdrop"><Image className="title-backdrop-image" src="/cover-paula-gafe-v2.png" alt="" fill sizes="100vw" priority /></div>
        <section className="title-card">
          <p className="eyebrow">Una aventura gráfica de terror</p>
          <h1><span className="title-names">Paula &amp; Gafe</span><small>y el misterio de la</small><em>Mansión encantada</em></h1>
          <div className="title-rule"><i /><b>13</b><i /></div>
          <h2>El pacto de las trece campanadas</h2>
          <p>Explora. Interroga a los muertos. Resuelve lo que la casa no puede olvidar.</p>
          <button className="start-button" onClick={begin}>{flags.has("epilogo_visto") ? "Volver a la mansión" : flags.has("prologo_visto") ? "Continuar la aventura" : "Entrar en la mansión"} <span>→</span></button>
          {flags.has("prologo_visto") && <button className="replay-story" onClick={replayStory}>Volver a ver el prólogo</button>}
          {(inventory.length > 0 || solved.size > 0 || flags.has("prologo_visto")) && <button className="new-game-button" onClick={() => setResetConfirm(true)}>Nueva partida desde el principio</button>}
          <small>Partida guardada automáticamente · Auriculares recomendados</small>
          <button className="device-switch" onClick={() => chooseDevice(device === "phone" ? "tablet" : "phone")}>Modo actual: {device === "phone" ? "Móvil" : "Tablet"} · tocar para cambiar a {device === "phone" ? "Tablet" : "Móvil"}</button>
        </section>
        {resetConfirm && <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <section className="reset-card">
            <p className="eyebrow">NUEVA PARTIDA</p>
            <h2 id="reset-title">¿Abrir otra vez la carta de Aurelia?</h2>
            <p>La aventura guardada se sustituirá por una nueva. La portada y todos los recursos del juego permanecerán intactos.</p>
            <div><button onClick={() => setResetConfirm(false)}>Conservar partida</button><button className="danger" onClick={startNewGame}>Empezar de nuevo</button></div>
          </section>
        </div>}
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand"><b>PAULA &amp; GAFE</b><span>MANSIÓN ENCANTADA</span></div>
        <div className="location"><small>{scenes[scene].chapter}</small><strong>{scenes[scene].name}</strong></div>
        <div className="header-actions">
          <button onClick={toggleAudio} aria-pressed={audioOn} title="Activar ambiente sonoro">{audioOn ? "◖))" : "◖)"} <span>Sonido</span></button>
          <button className={gafeSense ? "active" : ""} onClick={askGafe} title="Activar el sentido felino de Gafe">🐾 <span>Gafe</span></button>
          <button onClick={() => setJournalOpen(true)}>▤ <span>Cuaderno</span></button>
          <button className={aiOpen ? "active" : ""} onClick={() => setAiOpen((old) => !old)}>✦ <span>ECO · Pistas</span></button>
          <button className="device-toggle" onClick={() => chooseDevice(device === "phone" ? "tablet" : "phone")} title="Cambiar entre tablet y móvil">{device === "phone" ? "📱" : "▭"} <span>{device === "phone" ? "Móvil" : "Tablet"}</span></button>
        </div>
      </header>

      <section className={`scene scene-${scene} ${roomTransition ? "is-transitioning" : ""}`} aria-label={scenes[scene].name} onPointerDown={handleScenePointer}>
        <div className={`scene-art atlas-${scenes[scene].atlas ?? 1}`} style={scene === "vestibulo" ? undefined : { backgroundPosition: scenes[scene].position }} />
        <div className="scene-vignette" />
        <div className="scene-integrate" aria-hidden="true" />
        <div className="dust" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="ambient-life" aria-hidden="true">
          <i className="flame flame-one" /><i className="flame flame-two" /><i className="flame flame-three" />
          <i className="rain-glass" /><i className="lightning" />
          <i className="background-bird bird-one" /><i className="background-bird bird-two" />
          <i className="wandering-shadow" />
          <i className="firefly firefly-one" /><i className="firefly firefly-two" /><i className="firefly firefly-three" />
          <i className="haunted-chandelier"><b /><b /><b /></i>
          <i className="haunted-drawer"><b /></i>
          <i className="haunted-frame" />
          <i className="haunted-curtain" />
          <i className="ceiling-drip drip-one" /><i className="ceiling-drip drip-two" />
          <i className="puddle-ripple ripple-one" /><i className="puddle-ripple ripple-two" />
          <i className="haunted-paper paper-one" /><i className="haunted-paper paper-two" />
          <i className="lamp-glow" />
          <i className="slow-gear gear-one" /><i className="slow-gear gear-two" />
          <div className="night-stars"><i /><i /><i /><i /><i /><i /></div>
        </div>
        <div className="scene-caption"><small>UBICACIÓN</small><h2>{scenes[scene].name}</h2><p>{scenes[scene].description}</p></div>

        <aside className="mission-card" aria-label={`Objetivos de ${scenes[scene].name}`}>
          <small>{scene === "vestibulo" ? "PRIMERA INVESTIGACIÓN" : "OBJETIVO DE LA ESTANCIA"}</small>
          <strong>{roomBrief.mission}</strong>
          <ul>
            <li className={roomTalked ? "done" : ""}>{roomBrief.talk}</li>
            <li className={roomClueFound ? "done" : ""}>{roomBrief.clue}</li>
            <li className={roomChallengeDone ? "done" : ""}>{scene === "vestibulo" ? "Encuentra el sello de Aurelia" : "Resuelve el mecanismo principal"}</li>
          </ul>
        </aside>

        {scene === "vestibulo" && <>
          <button className="hotspot portrait" onClick={() => interact("retrato")}><span>Retrato de Aurelia</span></button>
          <button className="hotspot stairs" onClick={() => interact("escalera")}><span>Escalera rota</span></button>
          <button className="hotspot torn-letter" onClick={() => interact("carta")}><span>Media carta mojada</span></button>
          <button className="hotspot brass-bell" onClick={() => interact("campanilla")}><span>Campanilla brillante</span></button>
          <button className="hotspot travel-trunk" onClick={() => interact("baul")}><span>Baúl de Inés</span></button>
          <button className="hotspot umbrella-stand" onClick={() => interact("paraguero")}><span>Paragüero</span></button>
          <button className="hotspot footprints" onClick={() => interact("huellas")}><span>Huellas pequeñas</span></button>
          <button className="door-exit library-door" onClick={() => walkThroughDoor("biblioteca", 7, "left")}><i>←</i><span>Entrar en la biblioteca</span></button>
          <button className="door-exit service-door" onClick={() => walkThroughDoor("cocina", 93, "right")}><span>Cruzar la puerta de servicio</span><i>→</i></button>
        </>}
        {scene === "biblioteca" && <>
          <button className="hotspot clock" onClick={() => interact("reloj")}><span>Reloj aritmético</span></button>
          <button className="hotspot table" onClick={() => interact("mesa")}><span>Libro de cuentas</span></button>
        </>}
        {scene === "cocina" && <button className="hotspot boiler" onClick={() => interact("caldera")}><span>Caldera de presión</span></button>}
        {scene === "archivo" && <>
          <button className="hotspot seal-door" onClick={() => interact("puerta")}><span>Puerta del pacto</span></button>
          <button className="hotspot archive-table" onClick={() => interact("mesa")}><span>Registro de 1913</span></button>
        </>}
        {scene === "invernadero" && <button className="hotspot challenge flora" onClick={() => interact("flora")}><span>Herbario de luna</span></button>}
        {scene === "galeria" && <button className="hotspot challenge gallery-puzzle" onClick={() => interact("retratos")}><span>Retratos móviles</span></button>}
        {scene === "dormitorio" && <button className="hotspot challenge music-box" onClick={() => interact("caja")}><span>Caja de música</span></button>}
        {scene === "observatorio" && <button className="hotspot challenge telescope" onClick={() => interact("estrellas")}><span>Planetario de latón</span></button>}
        {scene === "musica" && <button className="hotspot challenge piano" onClick={() => interact("melodia")}><span>Piano de Baltasar</span></button>}
        {scene === "desvan" && <button className="hotspot challenge trunks" onClick={() => interact("baules")}><span>Baúles numerados</span></button>}
        {scene === "tuneles" && <button className="hotspot challenge sluices" onClick={() => interact("compuertas")}><span>Compuertas del aljibe</span></button>}
        {scene === "torre" && <button className="hotspot challenge bell" onClick={() => interact("campana")}><span>Campana de las trece</span></button>}

        {sceneObjects[scene].map((object) => <button key={object.id} className="hotspot room-object" style={{ left:`${object.x}%`, bottom:`${object.y}%`, width:`${object.width ?? 11}%`, height:`${object.height ?? 16}%` }} onClick={() => interact(object.id)}><span>{object.label}</span></button>)}

        {scene !== "vestibulo" && previousRoom && <button className="door-exit route-exit exit-left" onClick={() => walkThroughDoor(previousRoom, 6, "left")}><i>←</i><span>{scenes[previousRoom].name}</span></button>}
        {scene !== "vestibulo" && nextRoom && <button className="door-exit route-exit exit-right" onClick={() => walkThroughDoor(nextRoom, 92, "right")}><span>{scenes[nextRoom].name}</span><i>→</i></button>}

        {sceneNpcs.map((npc) => <button key={npc.id} className={npc.cls} onClick={() => interact(npc.id)} aria-label={`Hablar con ${npc.label}`}><b><Image src={npc.image ?? `/character-${npc.id}-v2.png`} alt="" fill sizes="126px" /></b><span>{npc.label}</span></button>)}
        <div className={`gafe-companion ${walking ? "is-walking" : ""} faces-${gafeFacing}`} style={{ left: `${gafeX}%`, "--walk-duration": `${walkDuration}ms` } as CSSProperties} aria-hidden="true"><Image className="gafe-idle" src="/character-gafe-v2.png" alt="" width={1024} height={1536} sizes="112px" /><i className="gafe-walk" aria-hidden="true" /><span>Gafe</span></div>
        <div className={`paula ${walking ? "is-walking" : ""} ${scare ? "is-startled" : ""} faces-${paulaFacing}`} style={{ left: `${paulaX}%`, "--walk-duration": `${walkDuration}ms` } as CSSProperties} aria-label="Paula"><Image className="paula-idle" src="/character-paula-v3.png" alt="Paula con sus trenzas, vestido negro y brújula" width={906} height={1737} sizes="112px" /><i className="paula-walk" aria-hidden="true" /><Image className="paula-startled" src="/character-paula-startled.png" alt="" aria-hidden="true" width={906} height={1736} sizes="112px" /><span>Paula</span></div>
        {solved.has("campana") && scene !== "vestibulo" && scene !== "torre" && <div className={`ines-companion ${walking ? "is-walking" : ""}`} style={{ left:`${Math.max(9, Math.min(89, paulaX + (paulaFacing === "right" ? 13 : -13)))}%`, "--walk-duration":`${walkDuration}ms` } as CSSProperties} aria-label="Inés acompaña a Paula"><Image src="/character-ines-v2.png" alt="Inés, libre de la torre" fill sizes="90px" /><span>Inés</span></div>}
        {gafeSense && <div className="sense-overlay" aria-hidden="true"><i /><i /><i /></div>}
      </section>

      <section className="command-deck">
        <div className="controls-row">
          <div className="verbs" aria-label="Acciones">
            {(["mirar", "hablar", "usar", "coger"] as Verb[]).map((item) => <button key={item} className={verb === item ? "selected" : ""} onClick={() => setVerb(item)}><i>{item === "mirar" ? "◉" : item === "hablar" ? "🎙" : item === "usar" ? "◇" : "⊕"}</i>{item}</button>)}
          </div>
          <div className="pockets" aria-label="Objetos recogidos">
            <small>MOCHILA DE PAULA {selectedItem ? `· PREPARADO: ${selectedItem}` : "· TOCA DOS OBJETOS PARA COMBINARLOS"}</small>
            <div>{inventory.length ? inventory.map((item) => <button key={item} className={selectedItem === item ? "selected-item" : ""} title={`Seleccionar ${item}`} aria-pressed={selectedItem === item} onClick={() => selectInventoryItem(item)}><i>{item.toLowerCase().includes("carta") ? "✉" : item.toLowerCase().includes("sello") ? "✦" : item.toLowerCase().includes("llave") ? "⌁" : item.toLowerCase().includes("tiza") ? "▰" : item.toLowerCase().includes("campanilla") ? "♢" : "◆"}</i><span>{item}</span></button>) : <p>Los objetos que recojas aparecerán aquí.</p>}</div>
          </div>
        </div>
        <div className="status-line"><span>OBJETIVO ACTUAL</span><p>{objective}</p><b>{[...solved].length}/11 pruebas</b></div>
      </section>

      {storyStep !== null && <div className="story-scrim" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <section className="story-card">
          <div className="story-number">{String(storyStep + 1).padStart(2, "0")}</div>
          <p className="eyebrow">{storyCards[storyStep].kicker}</p>
          <h2 id="story-title">{storyCards[storyStep].title}</h2>
          <p>{storyCards[storyStep].text}</p>
          <div className="story-progress">{storyCards.map((_, index) => <i key={index} className={index <= storyStep ? "active" : ""} />)}</div>
          <button onClick={advanceStory}>{storyStep + 1 < storyCards.length ? "Seguir la historia" : "Empezar a explorar"}<span>→</span></button>
        </section>
      </div>}

      {roomTransition && <div className={`room-transition ${roomTransition.direction}`} aria-live="polite"><i /><div><small>PAULA Y GAFE</small><strong>{roomTransition.label}</strong></div><i /></div>}

      {toast && <button className="toast" onClick={() => setToast("")}>{toast}<span>×</span></button>}

      {dialogue && <section className={`dialogue ${dialogue.topics?.length ? "has-topics" : ""}`} aria-live="polite">
        <div className="portrait-medallion">{dialogue.portrait?.startsWith("/") ? <Image src={dialogue.portrait} alt="" fill sizes="72px" /> : dialogue.portrait}</div>
        <div><p className="speaker">{dialogue.speaker} <span>{dialogue.role}</span></p><p className="dialogue-text">“{dialogueText}”</p>
          {dialogueLine + 1 >= dialogue.lines.length && dialogue.topics?.length ? <div className="dialogue-topics" aria-label="Preguntas disponibles">
            {dialogue.topics.map((topic) => <button key={topic.label} onClick={() => askDialogueQuestion(topic.label, topic)}>{topic.label}</button>)}
            <button className={`voice-topic ${listening ? "listening" : ""} ${voiceAvailable ? "" : "unavailable"}`} onClick={() => startListening((text) => askDialogueQuestion(text))} title={voiceAvailable ? "Hacer una pregunta con la voz" : "Voz no disponible en este dispositivo: usa el teclado"}>{listening ? "Escuchando…" : voiceAvailable ? "🎙 Preguntar con voz" : "⌨ Usa el teclado"}</button>
          </div> : null}
        </div>
        <button onClick={() => { if (dialogueLine + 1 < dialogue.lines.length) setDialogueLine((old) => old + 1); else setDialogue(null); }}>{dialogueLine + 1 < dialogue.lines.length ? "Continuar  ›" : "Terminar  ×"}</button>
      </section>}

      {puzzle && <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="puzzle-title">
        <section className="puzzle-card">
          <button className="close" onClick={() => setPuzzle(null)} aria-label="Cerrar">×</button>
          <p className="eyebrow">PRUEBA {questionIndex + 1} DE {puzzleBank[puzzle].questions.length}</p>
          <h2 id="puzzle-title">{puzzleBank[puzzle].title}</h2>
          <p className="puzzle-story">{puzzleBank[puzzle].story}</p>
          <div className="formula"><span>{puzzleBank[puzzle].questions[questionIndex].prompt}</span><b>?</b></div>
          <label htmlFor="answer">Tu respuesta</label>
          <div className="answer-row">
            <input id="answer" inputMode={typeof puzzleBank[puzzle].questions[questionIndex].answer === "number" ? "numeric" : "text"} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitAnswer()} placeholder="Escribe o di la respuesta…" />
            <button className={`mic ${listening ? "listening" : ""} ${voiceAvailable ? "" : "unavailable"}`} onClick={() => startListening(setAnswer)} title={voiceAvailable ? "Responder con el micrófono" : "Voz no disponible en este dispositivo: usa el teclado"}>{listening ? "●" : voiceAvailable ? "🎙" : "⌨"}<span>{listening ? "Escuchando…" : voiceAvailable ? "Responder por voz" : "Voz no disponible"}</span></button>
          </div>
          {mistakes > 0 && <p className="error-hint">La casa ha rechazado {mistakes} {mistakes === 1 ? "respuesta" : "respuestas"}. Comprueba las operaciones.</p>}
          {mistakes > 1 && puzzleBank[puzzle].questions[questionIndex].hint && <p className="kind-hint">Pista de Gafe: {puzzleBank[puzzle].questions[questionIndex].hint}</p>}
          <button className="submit-answer" onClick={submitAnswer}>Confirmar respuesta <span>→</span></button>
        </section>
      </div>}

      {aiOpen && <aside className="ai-panel">
        <header><div><i>✦</i><span><b>ECO</b><small>ASISTENTE CONTEXTUAL LOCAL</small></span></div><button onClick={() => setAiOpen(false)}>×</button></header>
        <div className="ai-state"><span className="pulse" /> Analizando {scenes[scene].name.toLowerCase()}</div>
        <div className="ai-log">{aiMessages.map((message, index) => <p key={`${message}-${index}`} className={message.startsWith("ECO") || index === 0 ? "eco" : "player"}>{message}</p>)}</div>
        <div className="ai-input"><input value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askEco()} placeholder="Pregunta por una pista…" /><button className={voiceAvailable ? "" : "unavailable"} onClick={() => startListening((text) => { setAiInput(text); askEco(text); })} title={voiceAvailable ? "Preguntar por voz" : "Voz no disponible en este dispositivo: usa el teclado"}>{voiceAvailable ? "🎙" : "⌨"}</button><button onClick={() => askEco()}>↑</button></div>
        <small>ECO recuerda el progreso y adapta las pistas sin enviar la voz ni los datos de Paula fuera del dispositivo.</small>
      </aside>}

      {journalOpen && <div className="modal-scrim" role="dialog" aria-modal="true"><section className="journal">
        <button className="close" onClick={() => setJournalOpen(false)}>×</button><p className="eyebrow">CUADERNO DE PAULA Y GAFE</p><h2>El misterio de la mansión encantada</h2>
        <div className="journal-grid"><div><h3>Hallazgos</h3><ul><li className={flags.has("sello_encontrado") ? "done" : ""}>El retrato de Aurelia oculta un sello.</li><li className={solved.has("reloj") ? "done" : ""}>El reloj de Elvira mide una deuda.</li><li className={solved.has("presion") ? "done" : ""}>Tomás encerró la llave en la caldera.</li><li className={solved.has("sello") ? "done" : ""}>La voz de Inés está atada a la torre.</li><li className={solved.has("flora") && solved.has("retratos") ? "done" : ""}>La lente y la cinta abren el dormitorio.</li><li className={solved.has("estrellas") ? "done" : ""}>El cielo contiene una partitura invisible.</li><li className={solved.has("compuertas") ? "done" : ""}>Los túneles conducen a la campana.</li></ul><h3>Objetos guardados</h3><p>{inventory.length ? inventory.join(" · ") : "Aún no has recogido ningún objeto."}</p></div><div><h3>Personas</h3><p><b>Gafe</b> · gato negro, compañero y detector de magia.</p><p><b>Elvira</b> · bibliotecaria que convirtió las cuentas en cerraduras.</p><p><b>Tomás</b> · guardés que selló la capilla.</p><p><b>Inés</b> · voz desaparecida hace trece años.</p><p><b>Señora Bruma</b> · botánica que oye hablar a las flores.</p><p><b>Baltasar</b> · cocinero fantasma que esconde pistas en melodías.</p><p><b>Barón Pelusa</b> · retrato de un perro que se cree fundador de la familia.</p><h3>Objetos que hablan</h3><p>Usa HABLAR con los trastos de cada sala: el libro rojo, el salero, la flor embustera, la muñeca, la estrella de papel, el mapa perfecto, la moneda, la palanca dorada… Casi todos exageran; Gafe siempre los desmiente.</p></div></div>
        <div className="journal-objective"><small>PRÓXIMO PASO</small>{objective}</div>
      </section></div>}

      {scare && <div className="gentle-scare" role="status"><i>◉</i><b>{scare}</b></div>}
      {endingStep !== null && <div className="story-scrim ending-scrim" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <section className="story-card ending-card">
          <div className="story-number">{String(endingStep + 1).padStart(2, "0")}</div>
          <p className="eyebrow">{endingCards[endingStep].kicker}</p>
          <h2 id="ending-title">{endingCards[endingStep].title}</h2>
          <p>{endingCards[endingStep].text}</p>
          <div className="story-progress">{endingCards.map((_, index) => <i key={index} className={index <= endingStep ? "active" : ""} />)}</div>
          <button onClick={advanceEnding}>{endingStep + 1 < endingCards.length ? "Seguir el epílogo" : "Cerrar el libro"}<span>→</span></button>
        </section>
      </div>}
      {flags.has("epilogo_visto") && <div className="ending-badge"><span>AVENTURA COMPLETADA</span><b>Paula, Gafe e Inés están a salvo.</b></div>}
    </main>
  );
}
