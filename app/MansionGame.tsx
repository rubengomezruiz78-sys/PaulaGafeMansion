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
  scene: SceneId;
  inventory: string[];
  solved: PuzzleId[];
  flags: string[];
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
  AndroidVoice?: { startListening: () => void; cancelListening: () => void };
  __onAndroidVoiceResult?: (text: string) => void;
  __onAndroidVoiceError?: (message: string) => void;
};

const SAVE_KEY = "mansion-paula-v3";

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
  invernadero: { name: "Invernadero de luna", chapter: "Capítulo II · El jardín que escucha", position: "0% 0%", atlas: 2, description: "Las flores solo abren cuando oyen la verdad. Gafe ve huellas entre las macetas." },
  galeria: { name: "Galería de los borrados", chapter: "Capítulo II · El jardín que escucha", position: "100% 0%", atlas: 2, description: "Los retratos cambian de sitio cuando Paula aparta la mirada." },
  dormitorio: { name: "Dormitorio de Inés", chapter: "Capítulo III · Los juegos que quedaron", position: "0% 100%", atlas: 2, description: "La habitación lleva trece años esperando que alguien termine una partida." },
  observatorio: { name: "Observatorio Valcárcel", chapter: "Capítulo III · Los juegos que quedaron", position: "100% 100%", atlas: 2, description: "El cielo está despejado, aunque fuera la tormenta no ha cesado." },
  musica: { name: "Salón de música", chapter: "Capítulo IV · La casa canta", position: "0% 0%", atlas: 3, description: "El piano toca una nota cada vez que la casa pronuncia un nombre." },
  desvan: { name: "Desván de las sombras", chapter: "Capítulo IV · La casa canta", position: "100% 0%", atlas: 3, description: "Gafe arquea el lomo. Bajo las sábanas hay menos muebles que siluetas." },
  tuneles: { name: "Túneles del aljibe", chapter: "Capítulo V · La cuenta final", position: "0% 100%", atlas: 3, description: "El agua refleja una mansión distinta, con todas sus ventanas encendidas." },
  torre: { name: "Torre de las trece", chapter: "Capítulo V · La cuenta final", position: "100% 100%", atlas: 3, description: "La campana espera. Nadie debe golpearla; la respuesta correcta bastará." },
};

const roomConnections: Record<SceneId, { left?: SceneId; right?: SceneId }> = {
  vestibulo: { left:"biblioteca", right:"cocina" }, biblioteca: { left:"vestibulo", right:"cocina" }, cocina: { left:"vestibulo", right:"archivo" },
  archivo: { left:"cocina", right:"invernadero" }, invernadero: { left:"archivo", right:"galeria" }, galeria: { left:"invernadero", right:"dormitorio" },
  dormitorio: { left:"galeria", right:"observatorio" }, observatorio: { left:"dormitorio", right:"musica" }, musica: { left:"observatorio", right:"desvan" },
  desvan: { left:"musica", right:"tuneles" }, tuneles: { left:"desvan", right:"torre" }, torre: { left:"tuneles" },
};

const roomBriefs: Record<SceneId, { mission: string; talk: string; clue: string; clueFlag: string; puzzle?: PuzzleId }> = {
  vestibulo: { mission: "Descubre qué puerta dice la verdad", talk: "Habla con Gafe o Basilio", clue: "Guarda dos hallazgos", clueFlag: "sello_encontrado" },
  biblioteca: { mission: "Consigue el engranaje del reloj", talk: "Interroga a Doña Elvira", clue: "Examina las notas del escritorio", clueFlag: "nota_elvira", puzzle: "reloj" },
  cocina: { mission: "Devuelve la presión a la caldera", talk: "Escucha la versión de Tomás", clue: "Encuentra la receta quemada", clueFlag: "receta_carbon", puzzle: "presion" },
  archivo: { mission: "Rompe el pacto de la puerta sellada", talk: "Responde a la voz de Inés", clue: "Lee el registro oculto", clueFlag: "registro_ines", puzzle: "sello" },
  invernadero: { mission: "Prepara el antídoto de luna", talk: "Habla con la señora Bruma", clue: "Recoge semillas de luna", clueFlag: "semillas_luna", puzzle: "flora" },
  galeria: { mission: "Devuelve los retratos a su historia", talk: "Pide a Gafe que detecte el cuadro falso", clue: "Recoge una esquirla de espejo", clueFlag: "esquirla_espejo", puzzle: "retratos" },
  dormitorio: { mission: "Termina el juego que dejó Inés", talk: "Pregunta al eco de Inés", clue: "Encuentra la canica azul", clueFlag: "canica_azul", puzzle: "caja" },
  observatorio: { mission: "Reconstruye el cielo de la mansión", talk: "Consulta a Gafe bajo las estrellas", clue: "Guarda la lente agrietada", clueFlag: "lente_agrietada", puzzle: "estrellas" },
  musica: { mission: "Haz que la casa recuerde la melodía", talk: "Convence a Baltasar para que cante", clue: "Recoge el cilindro de cera", clueFlag: "cilindro_cera", puzzle: "melodia" },
  desvan: { mission: "Encuentra el plano entre los baúles", talk: "Deja que Gafe rastree las sábanas", clue: "Recupera la fotografía de Inés", clueFlag: "foto_ines", puzzle: "baules" },
  tuneles: { mission: "Abre un camino sin inundar el archivo", talk: "Pregunta a Gafe por el olor del agua", clue: "Examina la flecha de tiza", clueFlag: "flecha_tiza", puzzle: "compuertas" },
  torre: { mission: "Libera a Inés sin tocar la campana", talk: "Escucha a Inés una última vez", clue: "Recoge la cinta roja", clueFlag: "cinta_roja", puzzle: "campana" },
};

const sceneObjects: Record<SceneId, SceneObject[]> = {
  vestibulo: [],
  biblioteca: [
    { id:"nota_elvira", label:"Página arrancada", x:31, y:16, width:12, height:13, item:"Página de Elvira", flag:"nota_elvira", look:"Una cuenta escrita al revés: 7 × 9. Debajo, Elvira anotó «el reloj empieza por la noche»." , take:"Paula guarda la página. En el reverso hay una huella de dedo hecha con tinta fresca." },
    { id:"libro_rojo", label:"Libro rojo que bosteza", x:63, y:35, width:12, height:24, item:"Marcapáginas del 13", flag:"libro_rojo", look:"El libro bosteza y dice que la respuesta del reloj es 13. Gafe opina que los libros rojos son unos dramáticos.", take:"El libro se niega a caber en la mochila, pero deja caer un marcapáginas. Puede ser pista… o una broma." },
  ],
  cocina: [
    { id:"receta_carbon", label:"Receta chamuscada", x:72, y:21, width:13, height:15, item:"Receta de carbón", flag:"receta_carbon", look:"La receta mezcla presión y cocina: «96 pulsos, 8 tubos, 7 vueltas». Tomás dejó aquí la fórmula.", take:"Paula guarda la receta; aún huele a canela y humo." },
    { id:"salero_bromista", label:"Salero parlanchín", x:59, y:18, width:9, height:14, item:"Sal negra", flag:"salero_bromista", look:"El salero asegura que la caldera funciona con 400 cucharadas. Luego estornuda. Es una pista falsa bastante salada.", take:"Paula guarda una pizca de sal negra. El salero murmura: «Yo habría cogido la pimienta»." },
  ],
  archivo: [
    { id:"registro_ines", label:"Registro cosido", x:40, y:20, width:14, height:15, item:"Página del registro", flag:"registro_ines", look:"Trece nombres están cosidos con hilo. El de Inés no figura entre quienes salieron.", take:"Paula separa con cuidado la página de Inés y la guarda para devolvérsela." },
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
    { id:"canica_azul", label:"Canica azul", x:31, y:12, width:9, height:12, item:"Canica azul", flag:"canica_azul", look:"Dentro de la canica hay una habitación diminuta donde el mismo juego aún no ha terminado.", take:"La canica rueda cuesta arriba hasta la mano de Paula. Inés la estaba esperando." },
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
    { id:"flecha_tiza", label:"Flecha de tiza", x:68, y:25, width:15, height:18, item:"Trozo de tiza blanca", flag:"flecha_tiza", look:"Una flecha señala la segunda compuerta. Gafe olfatea la marca: la dibujó Don Basilio hace menos de una hora.", take:"Paula borra la flecha falsa y guarda la tiza. Ahora Basilio tendrá que inventar otra trampa." },
  ],
  torre: [
    { id:"cinta_roja", label:"Cinta roja", x:37, y:16, width:11, height:15, item:"Cinta roja de Inés", flag:"cinta_roja", look:"La cinta está atada lejos de la campana, como una advertencia: la respuesta no necesita golpes.", take:"Paula anuda la cinta a su muñeca. La voz de Inés se vuelve más nítida.", requiresTake:true },
    { id:"palanca_dorada", label:"Palanca dorada", x:78, y:31, width:11, height:27, item:"Tornillo dorado", flag:"palanca_dorada", look:"La palanca lleva un letrero: «TIRAR PARA GANAR». Gafe se sienta encima para impedirlo. Demasiado obvio.", take:"La palanca no se mueve, pero Paula desenrosca su placa. Era otra trampa de la casa." },
  ],
};

const puzzleBank: Record<PuzzleId, { title: string; story: string; questions: { prompt: string; answer: number | string; hint?: string }[] }> = {
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
    { prompt: "Aurelia está a la izquierda de Tomás. Elvira está a la derecha de Tomás. ¿Quién ocupa el centro?", answer: "tomás", hint: "No necesitas calcular: imagina tres posiciones." },
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
    { prompt: "Completa el patrón de notas: DO, MI, SOL, DO, MI, SOL… ¿qué nota sigue?", answer: "do", hint: "El patrón se repite igual. ¿Qué nota toca justo después de SOL?" },
    { prompt: "El gramófono gira 18 veces por minuto durante 4 minutos. Después divide las vueltas entre 6 pistas. ¿Cuántas por pista?", answer: 12, hint: "Primero 18 × 4 vueltas en total, y luego divídelas entre 6." },
  ]},
  baules: { title: "Los baúles sin dueño", story: "Gafe puede entrar bajo las sábanas, pero Paula debe indicarle el baúl correcto.", questions: [
    { prompt: "Hay 5 filas de 9 baúles. Gafe ya ha revisado un tercio. ¿Cuántos ha revisado?", answer: 15, hint: "Primero cuenta todos: 5 × 9 baúles. Un tercio es dividir entre 3." },
    { prompt: "El baúl buscado tiene el doble de 14 cerraduras dividido entre 4. ¿Qué número lleva?", answer: 7, hint: "El doble de 14 es 28; luego divide 28 entre 4." },
  ]},
  compuertas: { title: "El camino del agua", story: "Abrir demasiado inundaría el archivo. No hay prisa: cada compuerta puede pensarse con calma.", questions: [
    { prompt: "Tres canales reciben 48 litros cada uno. Se reparten entre 8 desagües. ¿Cuántos litros pasan por cada desagüe?", answer: 18, hint: "Primero suma el agua: 3 × 48 litros. Luego reparte entre 8 desagües." },
    { prompt: "La compuerta I abre antes que la III. La II abre después que la III. ¿Cuál se abre en segundo lugar?", answer: "tres", hint: "Ordena I, III y II." },
    { prompt: "Doce ruedas giran 6 veces y luego deshacen un tercio de las vueltas. ¿Cuántas vueltas permanecen?", answer: 48, hint: "Primero 12 × 6 vueltas. Un tercio (÷ 3) se deshace; resta esa parte del total." },
  ]},
  campana: { title: "La decimotercera campanada", story: "No es una carrera. La casa solo pierde poder cuando Paula explica la cuenta completa.", questions: [
    { prompt: "Trece campanadas durante 9 noches producen 117 ecos. Si cada recuerdo absorbe 3 ecos, ¿cuántos recuerdos quedan atrapados?", answer: 39, hint: "Reparte los 117 ecos en grupos de 3: 117 ÷ 3." },
    { prompt: "Aurelia dejó 7 llaves a cada una de 12 personas. Inés devolvió la mitad. ¿Cuántas llaves quedaron?", answer: 42, hint: "Primero 7 × 12 llaves en total; devolvió la mitad, así que queda la otra mitad." },
    { prompt: "Última pregunta: ¿quién ha acompañado a Paula incluso cuando la casa mentía?", answer: "gafe", hint: "Tiene cuatro patas y ojos de color ámbar." },
  ]},
};

const numberWords: Record<string, number> = {
  tres: 3, siete: 7, ocho: 8, doce: 12, quince: 15, dieciocho: 18, veintiuno: 21, veinticuatro: 24, treinta: 30, treinta_y_nueve: 39, cuarenta: 40, "cuarenta y dos": 42, "cuarenta y cinco": 45, cuarenta_y_ocho: 48, sesenta: 60,
  "sesenta y tres": 63, setenta: 70, "setenta y ocho": 78, ochenta: 80,
  "ochenta y cuatro": 84,
};

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[.,!?]/g, "");
}

function parseSpokenNumber(value: string) {
  const clean = normalizeText(value);
  const digits = clean.match(/-?\d+/);
  if (digits) return Number(digits[0]);
  return numberWords[clean] ?? numberWords[clean.replace(/ /g, "_")] ?? Number.NaN;
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

function isCorrectAnswer(value: string, expected: number | string) {
  if (typeof expected === "number") return parseSpokenNumber(value) === expected;
  const clean = normalizeText(value);
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

function objectiveFor(solved: Set<PuzzleId>, flags: Set<string>) {
  if (solved.has("campana")) return "Volver al vestíbulo con Inés y despedirse de la mansión.";
  if (solved.has("compuertas")) return "Subir a la torre y responder a la campana sin hacerla sonar.";
  if (solved.has("melodia") && solved.has("baules")) return "Usar el plano de Gafe para atravesar los túneles del aljibe.";
  if (solved.has("estrellas")) return "Explorar el salón de música y el desván; sus pistas forman una sola canción.";
  if (solved.has("caja")) return "Llevar el mapa de estrellas al observatorio.";
  if (solved.has("flora") && solved.has("retratos")) return "Entrar en el dormitorio de Inés y reparar su caja de música.";
  if (solved.has("sello")) return "Explorar el invernadero y la galería; Gafe detecta dos pistas de Inés.";
  if (solved.has("reloj") && solved.has("presion")) return "Bajar al archivo y romper el pacto familiar.";
  if (!solved.has("reloj")) return flags.has("sello_encontrado")
    ? "Cruza la puerta izquierda, interroga a Elvira y usa el sello en el reloj."
    : "Explora el vestíbulo, reúne pistas y encuentra el sello oculto de Aurelia.";
  return "Reparar la presión de la cocina y conseguir la llave de servicio.";
}

export function MansionGame() {
  const [started, setStarted] = useState(false);
  const [scene, setScene] = useState<SceneId>("vestibulo");
  const [verb, setVerb] = useState<Verb>("mirar");
  const [inventory, setInventory] = useState<string[]>([]);
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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<string[]>([
    "Soy ECO, una presencia contextual. Puedo analizar lo que ya has visto, pero no resolveré el misterio por ti.",
  ]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [gafeSense, setGafeSense] = useState(false);
  const [scare, setScare] = useState<string | null>(null);
  const [storyStep, setStoryStep] = useState<number | null>(null);
  const [roomTransition, setRoomTransition] = useState<{ label: string; direction: "left" | "right" } | null>(null);
  const [paulaX, setPaulaX] = useState(43);
  const [paulaFacing, setPaulaFacing] = useState<"left" | "right">("right");
  const [gafeX, setGafeX] = useState(34);
  const [gafeFacing, setGafeFacing] = useState<"left" | "right">("right");
  const [walkDuration, setWalkDuration] = useState(620);
  const [walking, setWalking] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; nodes: OscillatorNode[] } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const walkTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number[]>([]);

  const objective = objectiveFor(solved, flags);

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
    const voiceWindow = window as AndroidVoiceWindow;
    if ("serviceWorker" in navigator && !voiceWindow.AndroidVoice) void navigator.serviceWorker.register("/sw.js");
  }, []);

  useEffect(() => {
    if (!started) return;
    const save: SavedGame = { scene, inventory, solved: [...solved], flags: [...flags] };
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
    setFlags((old) => new Set(old).add("prologo_visto").add("intro_vista"));
    setDialogue(openingDialogue);
    setDialogueLine(0);
    setToast("Objetivo: explora el vestíbulo, recoge pistas y descubre qué puerta merece confianza.");
  };

  const replayStory = () => {
    setStarted(true);
    setScene("vestibulo");
    setDialogue(null);
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
    const gain = ctx.createGain();
    gain.gain.value = 0.018;
    gain.connect(ctx.destination);
    const nodes = [43, 64.5].map((frequency) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.11;
    lfoDepth.gain.value = 0.006;
    lfo.connect(lfoDepth);
    lfoDepth.connect(gain.gain);
    lfo.start();
    nodes.push(lfo);
    audioRef.current = { ctx, nodes };
    setAudioOn(true);
  };

  const addItem = useCallback((item: string) => {
    setInventory((old) => old.includes(item) ? old : [...old, item]);
  }, []);

  const speak = (id: keyof typeof npcDialogue) => {
    setDialogue(npcDialogue[id]);
    setDialogueLine(0);
    setFlags((old) => new Set(old).add(`${scene}_talked`).add(id === "basilio" ? "basilio_interrogado" : `${id}_interrogado`));
  };

  const askGafe = () => {
    setFlags((old) => new Set(old).add("gafe_consultado").add(`${scene}_talked`));
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
    if (!audioOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cry = new SpeechSynthesisUtterance("¡Aaah!");
    cry.lang = "es-ES";
    cry.pitch = 1.65;
    cry.rate = 1.35;
    cry.volume = .72;
    window.speechSynthesis.speak(cry);
  };

  const openPuzzle = (id: PuzzleId) => {
    if (solved.has(id)) {
      setToast("El mecanismo ya está resuelto. Solo queda un eco satisfecho.");
      return;
    }
    setPuzzle(id);
    setQuestionIndex(0);
    setMistakes(0);
    setAnswer("");
  };

  const resolveInteraction = (target: string) => {
    const lookOnly = (text: string) => setToast(verb === "mirar" ? text : `No parece útil ${verb === "hablar" ? "hablar con eso" : `intentar ${verb} aquí`}.`);
    const roomObject = sceneObjects[scene].find((candidate) => candidate.id === target);
    if (roomObject) {
      const alreadyCollected = roomObject.item ? inventory.includes(roomObject.item) : false;
      if (!roomObject.requiresTake || verb === "coger") setFlags((old) => new Set(old).add(roomObject.flag));
      if (verb === "coger" && roomObject.item) {
        addItem(roomObject.item);
        setToast(alreadyCollected ? `${roomObject.item} ya está a salvo en la mochila.` : (roomObject.take ?? `Paula guarda ${roomObject.item.toLowerCase()} en la mochila.`));
      } else if (verb === "hablar") {
        setToast(`Paula pregunta a ${roomObject.label.toLowerCase()}. ${roomObject.look}`);
      } else {
        setToast(roomObject.look);
      }
      return;
    }
    if (target === "gafe") return speak("gafe");
    if (target === "basilio") return speak("basilio");
    if (target === "retrato") {
      if (!flags.has("sello_encontrado") && (verb === "coger" || verb === "usar")) {
        setFlags((old) => new Set(old).add("sello_encontrado"));
        addItem("Sello de Aurelia");
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
        setToast("La tinta está corrida, pero se lee: «…la puerta que huele a papel, no la que presume de su color…»");
      } else lookOnly("Media carta empapada. El sello roto coincide con el dibujo de la brújula de Paula.");
      return;
    }
    if (target === "campanilla") {
      if (verb === "coger") {
        addItem("Campanilla muda");
        setFlags((old) => new Set(old).add("campanilla_recogida"));
        setToast("Parece importante, pero no suena. En la base alguien grabó: «Las cosas brillantes también hacen perder el tiempo».");
      } else lookOnly("Una campanilla de latón en mitad de la alfombra. Demasiado limpia para llevar años aquí.");
      return;
    }
    if (target === "baul") {
      if (verb === "coger") {
        addItem("Llave de latón doblada");
        setFlags((old) => new Set(old).add("llave_falsa"));
        setToast("Dentro del baúl solo hay una llave doblada. Don Basilio sonríe demasiado: probablemente es una pista falsa.");
      } else lookOnly("Un baúl de viaje con las iniciales I. V. La cerradura ya estaba forzada desde dentro.");
      return;
    }
    if (target === "paraguero") {
      if (verb === "coger") {
        addItem("Tiza azul");
        setFlags((old) => new Set(old).add("tiza_recogida"));
        setToast("Paula guarda una tiza azul. Gafe cree que servirá para marcar puertas que cambian de sitio.");
      } else lookOnly("Tres paraguas secos y una tiza azul húmeda. Alguien la usó esta misma noche.");
      return;
    }
    if (target === "huellas") return lookOnly("Huellas pequeñas entran desde la puerta principal y terminan bajo el retrato. No son las de Paula.");
    if (target === "escalera") return lookOnly("Los peldaños superiores terminan en una pared. La arquitectura también miente; una corriente de aire baja desde la puerta izquierda.");
    if (target === "elvira") return speak("elvira");
    if (target === "reloj") {
      if (!flags.has("sello_encontrado")) return setToast("El reloj tiene una cavidad con la forma del sello de Aurelia.");
      return openPuzzle("reloj");
    }
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
    if (target === "puerta") {
      if (!solved.has("reloj") || !solved.has("presion")) return setToast("La puerta necesita un engranaje y una llave. Forzarla solo hace que respire más fuerte.");
      return openPuzzle("sello");
    }
    if (target === "mesa") return lookOnly("Un inventario de 1913: trece criados entraron en la capilla; solo doce salieron.");
  };

  const walkTo = (destination: number, onArrival?: () => void) => {
    if (walking) return;
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
    if (dialogue || puzzle || journalOpen || aiOpen || roomTransition || storyStep !== null || scare) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    walkTo(((event.clientX - bounds.left) / bounds.width) * 100);
  };

  const finishPuzzle = (id: PuzzleId) => {
    setSolved((old) => new Set(old).add(id));
    setPuzzle(null);
    setQuestionIndex(0);
    if (id === "reloj") {
      addItem("Engranaje de marfil");
      setToast("El reloj se abre. Dentro espera un engranaje tallado con trece dientes.");
    } else if (id === "presion") {
      addItem("Llave de servicio");
      setToast("La caldera exhala y entrega una llave negra, todavía tibia.");
    } else if (id === "sello") {
      setFlags((old) => new Set(old).add("ines_liberada"));
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
      setFlags((old) => new Set(old).add("ines_liberada"));
      setDialogue({ speaker: "Inés", role: "Libre al fin", portrait: "/character-ines-v2.png", lines: ["La casa quería una cuenta perfecta. Tú le diste una historia distinta.", "Vámonos a casa. Gafe ya ha encontrado la salida… y probablemente también la cena."] });
      setDialogueLine(0);
      setToast("La campana permanece en silencio. Amanece por primera vez en trece años.");
    }
  };

  const submitAnswer = () => {
    if (!puzzle) return;
    const current = puzzleBank[puzzle].questions[questionIndex];
    const correct = isCorrectAnswer(answer, current.answer);
    if (correct) {
      if (questionIndex + 1 >= puzzleBank[puzzle].questions.length) finishPuzzle(puzzle);
      else {
        setQuestionIndex((old) => old + 1);
        setAnswer("");
        setMistakes(0);
        setToast("Correcto. El mecanismo acepta la respuesta y prepara la siguiente prueba.");
      }
    } else {
      setMistakes((old) => old + 1);
      setToast("La casa rechaza el resultado. Respíralo y repásalo paso a paso; si vuelves a fallar, Gafe te dará una pista.");
    }
  };

  const startListening = (onText: (text: string) => void) => {
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
    const lower = query.toLowerCase();
    let response = "La casa interfiere. Pregunta por una persona, un lugar, un objeto o tu objetivo actual.";
    if (/objetivo|hacer|ahora|ayuda|pista/.test(lower)) response = `Tu prioridad es: ${objective} Observa los objetos que contrastan con la luz; suelen ser interactivos.`;
    else if (/elvira|biblioteca|reloj/.test(lower)) response = solved.has("reloj") ? "Elvira ya pagó su parte. El engranaje pertenece a la puerta del archivo." : "El reloj no busca una hora: busca tres resultados. El sello de Aurelia demuestra que tienes derecho a intentarlo.";
    else if (/tom[aá]s|cocina|caldera|v[aá]lvula/.test(lower)) response = solved.has("presion") ? "La presión está equilibrada. Conserva la llave negra." : "Lee la fórmula completa antes de calcular. Multiplicación y división tienen la misma prioridad: avanza de izquierda a derecha.";
    else if (/in[eé]s|puerta|capilla|archivo/.test(lower)) response = solved.has("reloj") && solved.has("presion") ? "Ya posees las dos piezas. Baja al archivo y escucha a Inés antes de tocar el sello." : "La puerta exige dos objetos: uno mide el tiempo y otro domina la presión.";
    else if (/gafe|gato/.test(lower)) response = "Gafe detecta magia escondida y cabe donde Paula no puede. Usa su sentido felino desde la barra superior; sus pistas nunca penalizan la partida.";
    else if (/invernadero|flor|bruma/.test(lower)) response = solved.has("flora") ? "La lente de tinta lunar servirá en lugares donde las estrellas o la escritura parezcan incompletas." : "Bruma mezcla cantidades exactas. Gafe distingue las flores correctas por el olor.";
    else if (/galer[ií]a|retrato/.test(lower)) response = solved.has("retratos") ? "La cinta pertenece a la caja de música de Inés." : "Coloca mentalmente a Aurelia, Tomás y Elvira de izquierda a derecha. Gafe puede representar el centro.";
    else if (/dormitorio|caja|m[uú]sica/.test(lower)) response = "La caja alterna números por una regla estable. Di cada resultado en voz alta si te ayuda a oír el patrón.";
    else if (/observatorio|estrella|cielo/.test(lower)) response = "El mapa de Inés y la lente lunar forman una sola pista. Las divisiones del círculo celeste son exactas.";
    else if (/desv[aá]n|ba[uú]l|t[uú]nel|compuerta|torre|campana/.test(lower)) response = `Estás en la parte final. ${objective} El plano y el sentido felino de Gafe evitan probar caminos al azar.`;
    else if (/sello|aurelia/.test(lower)) response = flags.has("sello_encontrado") ? "El sello ya está en tu inventario. Encaja en mecanismos marcados con trece radios." : "El retrato de Aurelia oculta más de lo que representa. Examínalo de cerca.";
    setAiMessages((old) => [...old.slice(-3), `PAULA · ${query}`, `ECO · ${response}`]);
    setAiInput("");
  };

  const canTravel = (next: SceneId) => {
    const locked =
      (next === "archivo" && (!solved.has("reloj") || !solved.has("presion"))) ||
      ((next === "invernadero" || next === "galeria") && !solved.has("sello")) ||
      (next === "dormitorio" && (!solved.has("flora") || !solved.has("retratos"))) ||
      (next === "observatorio" && !solved.has("caja")) ||
      ((next === "musica" || next === "desvan") && !solved.has("estrellas")) ||
      (next === "tuneles" && (!solved.has("melodia") || !solved.has("baules"))) ||
      (next === "torre" && !solved.has("compuertas"));
    if (locked) setToast("Esa puerta todavía no se abre. Las pistas del objetivo actual explican qué le falta.");
    return !locked;
  };

  const travel = (next: SceneId, direction: "left" | "right" = "right") => {
    if (next === scene || roomTransition || !canTravel(next)) return;
    transitionTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    setRoomTransition({ label: `Cruzando hacia ${scenes[next].name}`, direction });
    const changeTimer = window.setTimeout(() => {
      setScene(next);
      setPaulaX(direction === "right" ? 12 : 84);
      setGafeX(direction === "right" ? 5 : 91);
      setWalking(false);
      setToast(scenes[next].description);
      setGafeSense(false);
      if ((next === "galeria" || next === "desvan") && !flags.has(`susto_${next}`)) {
        setFlags((old) => new Set(old).add(`susto_${next}`));
        const scareStartTimer = window.setTimeout(() => { playScareSting(); playPaulaScream(); }, 260);
        setScare(next === "galeria" ? "Un retrato acaba de parpadear." : "Algo corre bajo las sábanas… demasiado grande para ser Gafe.");
        const scareEndTimer = window.setTimeout(() => setScare(null), 1300);
        transitionTimerRef.current.push(scareStartTimer, scareEndTimer);
      }
    }, 420);
    const finishTimer = window.setTimeout(() => setRoomTransition(null), 980);
    transitionTimerRef.current = [changeTimer, finishTimer];
  };

  const walkThroughDoor = (next: SceneId, destination: number, direction: "left" | "right") => {
    if (roomTransition || !canTravel(next)) return;
    walkTo(destination, () => travel(next, direction));
  };

  const dialogueText = dialogue?.lines[dialogueLine] ?? "";
  const sceneNpcs = sceneNpcsByRoom[scene];
  const previousRoom = roomConnections[scene].left ?? null;
  const nextRoom = roomConnections[scene].right ?? null;
  const vestibuleFinds = inventory.filter((item) => ["Media carta empapada", "Campanilla muda", "Llave de latón doblada", "Tiza azul", "Sello de Aurelia"].includes(item)).length;
  const roomBrief = roomBriefs[scene];
  const roomTalked = flags.has(`${scene}_talked`) || (scene === "vestibulo" && flags.has("gafe_consultado"));
  const roomClueFound = scene === "vestibulo" ? vestibuleFinds >= 2 : flags.has(roomBrief.clueFlag);
  const roomChallengeDone = scene === "vestibulo" ? flags.has("sello_encontrado") : Boolean(roomBrief.puzzle && solved.has(roomBrief.puzzle));

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
          <button className="start-button" onClick={begin}>Entrar en la mansión <span>→</span></button>
          {flags.has("prologo_visto") && <button className="replay-story" onClick={replayStory}>Volver a ver el prólogo</button>}
          <small>Partida guardada automáticamente · Auriculares recomendados</small>
        </section>
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
          <button className={aiOpen ? "active" : ""} onClick={() => setAiOpen((old) => !old)}>✦ <span>ECO IA</span></button>
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
        <button className={`gafe-companion ${walking ? "is-walking" : ""} faces-${gafeFacing}`} style={{ left: `${gafeX}%`, "--walk-duration": `${walkDuration}ms` } as CSSProperties} onClick={askGafe} aria-label="Pedir ayuda a Gafe"><Image className="gafe-idle" src="/character-gafe-v2.png" alt="Gafe, gato negro de ojos ámbar" width={1024} height={1536} sizes="112px" /><i className="gafe-walk" aria-hidden="true" /><span>Gafe</span></button>
        <div className={`paula ${walking ? "is-walking" : ""} ${scare ? "is-startled" : ""} faces-${paulaFacing}`} style={{ left: `${paulaX}%`, "--walk-duration": `${walkDuration}ms` } as CSSProperties} aria-label="Paula"><Image className="paula-idle" src="/character-paula-v3.png" alt="Paula con sus trenzas, vestido negro y brújula" width={906} height={1737} sizes="112px" /><i className="paula-walk" aria-hidden="true" /><Image className="paula-startled" src="/character-paula-startled.png" alt="" aria-hidden="true" width={906} height={1736} sizes="112px" /><span>Paula</span></div>
        {gafeSense && <div className="sense-overlay" aria-hidden="true"><i /><i /><i /></div>}
      </section>

      <section className="command-deck">
        <div className="controls-row">
          <div className="verbs" aria-label="Acciones">
            {(["mirar", "hablar", "usar", "coger"] as Verb[]).map((item) => <button key={item} className={verb === item ? "selected" : ""} onClick={() => setVerb(item)}><i>{item === "mirar" ? "◉" : item === "hablar" ? "🎙" : item === "usar" ? "◇" : "⊕"}</i>{item}</button>)}
          </div>
          <div className="pockets" aria-label="Objetos recogidos">
            <small>MOCHILA DE PAULA</small>
            <div>{inventory.length ? inventory.slice(-5).map((item) => <button key={item} title={item}><i>{item.toLowerCase().includes("carta") ? "✉" : item.toLowerCase().includes("sello") ? "✦" : item.toLowerCase().includes("llave") ? "⌁" : item.toLowerCase().includes("tiza") ? "▰" : item.toLowerCase().includes("campanilla") ? "♢" : "◆"}</i><span>{item}</span></button>) : <p>Los objetos que recojas aparecerán aquí.</p>}</div>
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
            <button className={listening ? "voice-topic listening" : "voice-topic"} onClick={() => startListening((text) => askDialogueQuestion(text))} title="Hacer una pregunta con la voz">{listening ? "Escuchando…" : "🎙 Preguntar con voz"}</button>
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
            <button className={listening ? "mic listening" : "mic"} onClick={() => startListening(setAnswer)} title="Responder con el micrófono">{listening ? "●" : "🎙"}<span>{listening ? "Escuchando…" : "Responder por voz"}</span></button>
          </div>
          {mistakes > 0 && <p className="error-hint">La casa ha rechazado {mistakes} {mistakes === 1 ? "respuesta" : "respuestas"}. Comprueba las operaciones.</p>}
          {mistakes > 1 && puzzleBank[puzzle].questions[questionIndex].hint && <p className="kind-hint">Pista de Gafe: {puzzleBank[puzzle].questions[questionIndex].hint}</p>}
          <button className="submit-answer" onClick={submitAnswer}>Confirmar respuesta <span>→</span></button>
        </section>
      </div>}

      {aiOpen && <aside className="ai-panel">
        <header><div><i>✦</i><span><b>ECO</b><small>INTELIGENCIA CONTEXTUAL LOCAL</small></span></div><button onClick={() => setAiOpen(false)}>×</button></header>
        <div className="ai-state"><span className="pulse" /> Analizando {scenes[scene].name.toLowerCase()}</div>
        <div className="ai-log">{aiMessages.map((message, index) => <p key={`${message}-${index}`} className={message.startsWith("ECO") || index === 0 ? "eco" : "player"}>{message}</p>)}</div>
        <div className="ai-input"><input value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askEco()} placeholder="Pregunta por una pista…" /><button onClick={() => startListening((text) => { setAiInput(text); askEco(text); })} title="Preguntar por voz">🎙</button><button onClick={() => askEco()}>↑</button></div>
        <small>ECO conoce tu progreso y adapta las pistas sin enviar datos fuera del dispositivo.</small>
      </aside>}

      {journalOpen && <div className="modal-scrim" role="dialog" aria-modal="true"><section className="journal">
        <button className="close" onClick={() => setJournalOpen(false)}>×</button><p className="eyebrow">CUADERNO DE PAULA Y GAFE</p><h2>El misterio de la mansión encantada</h2>
        <div className="journal-grid"><div><h3>Hallazgos</h3><ul><li className={flags.has("sello_encontrado") ? "done" : ""}>El retrato de Aurelia oculta un sello.</li><li className={solved.has("reloj") ? "done" : ""}>El reloj de Elvira mide una deuda.</li><li className={solved.has("presion") ? "done" : ""}>Tomás encerró la llave en la caldera.</li><li className={solved.has("sello") ? "done" : ""}>La voz de Inés está atada a la torre.</li><li className={solved.has("flora") && solved.has("retratos") ? "done" : ""}>La lente y la cinta abren el dormitorio.</li><li className={solved.has("estrellas") ? "done" : ""}>El cielo contiene una partitura invisible.</li><li className={solved.has("compuertas") ? "done" : ""}>Los túneles conducen a la campana.</li></ul><h3>Objetos guardados</h3><p>{inventory.length ? inventory.join(" · ") : "Aún no has recogido ningún objeto."}</p></div><div><h3>Personas</h3><p><b>Gafe</b> · gato negro, compañero y detector de magia.</p><p><b>Elvira</b> · bibliotecaria que convirtió las cuentas en cerraduras.</p><p><b>Tomás</b> · guardés que selló la capilla.</p><p><b>Inés</b> · voz desaparecida hace trece años.</p><p><b>Señora Bruma</b> · botánica que oye hablar a las flores.</p><p><b>Baltasar</b> · cocinero fantasma que esconde pistas en melodías.</p></div></div>
        <div className="journal-objective"><small>PRÓXIMO PASO</small>{objective}</div>
      </section></div>}

      {scare && <div className="gentle-scare" role="status"><i>◉</i><b>{scare}</b></div>}
      {solved.has("campana") && <div className="ending-badge"><span>AVENTURA COMPLETADA</span><b>La casa ha perdido la cuenta.</b></div>}
    </main>
  );
}
