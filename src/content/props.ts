/**
 * Qué pasa al tocar cada objeto de la casa. Por defecto habla Paula; Gafe
 * mete baza a veces. En cada lista, lo más avanzado de la historia va primero
 * y lo genérico al final (tras mirarlo una vez, el objeto queda «examinado»).
 * `{recuerdos}` y similares se sustituyen por el contador de la partida.
 */
import type { Line } from "../core/dialogue";
import type { PropAction } from "../core/interact";
import { solvedFlag } from "../core/puzzle";

const gafe = (text: string): Line => ({ by: "gafe", text });
const solved = (id: string) => ({ flag: solvedFlag(id) });
const seen = (id: string) => ({ examined: id });

export const PROPS: Record<string, PropAction[]> = {
  // ------------------------------------------------------------ vestíbulo
  "retrato-aurelia": [
    { if: { flag: "sello-encontrado" }, lines: ["La bisabuela Aurelia. Ahora parece que sonríe un poco."] },
    {
      if: { any: [seen("retrato-aurelia"), { flag: "pista-retrato" }] },
      lines: [
        "Empujo el borde de abajo del marco, el único sin polvo…",
        "¡Clic! Detrás hay un hueco… ¡y un sello de lacre con una brújula, como la mía!",
      ],
      effects: [{ give: "sello-aurelia" }, { set: "sello-encontrado" }],
    },
    { lines: ["Es la bisabuela Aurelia. Sostiene una llave pintada…", "El marco tiene polvo por todas partes menos en el borde de abajo. Alguien lo ha movido."] },
  ],
  "carta-mojada": [
    { if: seen("carta-mojada"), lines: ["El suelo sigue mojado donde estaba la carta."] },
    {
      lines: ["Media carta empapada: «…cuando la mansión cuente trece…».", "El sello roto tiene el mismo dibujo que mi brújula. Me la guardo."],
      effects: [{ give: "carta-mojada" }, { stage: ["trece", 1] }],
    },
  ],
  campanilla: [
    { if: seen("campanilla"), lines: ["Tilín. Otra campanilla contesta, más lejos. La casa está despierta."] },
    {
      lines: [
        "Una campanilla de latón en mitad de la alfombra. Está demasiado limpia para llevar años aquí.",
        gafe("Miau. (Gafe le da un toquecito con la pata. Tilín.)"),
        "En algún sitio de la casa, otra campanilla contesta.",
      ],
    },
  ],
  "baul-ines": [
    {
      if: { quest: ["recuerdos", ">=", 1] },
      lines: ["El baúl de Inés. Debería guardar sus cosas, pero la casa las ha repartido.", "Una canica, una cinta, una foto, un cilindro y una flor. Llevo {recuerdos} de 5."],
    },
    { lines: ["Un baúl de viaje con las iniciales I. V.", "La cerradura está forzada… desde dentro."] },
  ],
  paraguero: [
    { lines: ["Tres paraguas secos y un trozo de tiza azul, húmeda. Alguien ha pintado flechitas esta misma noche.", gafe("(Gafe huele la tiza y estornuda.)")] },
  ],

  // ----------------------------------------------------------- biblioteca
  "reloj-aritmetico": [
    { if: solved("reloj"), lines: ["Los tres discos marcan 63, 12 y 12. El reloj por fin descansa."] },
    { if: { flag: "reloj-abierto" }, lines: ["Los discos del reloj esperan mis cuentas."], puzzle: "reloj" },
    {
      use: "sello-aurelia",
      lines: ["Acerco el sello de Aurelia a la tapa… ¡encaja! El reloj me reconoce.", "Tres discos llenos de números empiezan a girar."],
      effects: [{ set: "reloj-abierto" }, { stage: ["reloj", 1] }],
      puzzle: "reloj",
    },
    { lines: ["Este reloj no da la hora: cuenta algo. Tiene tres discos llenos de números.", "La tapa tiene forma de sello de lacre, y no se abre."] },
  ],
  "libro-abierto": [
    { if: seen("libro-abierto"), lines: ["Cuentas escritas del revés. La página importante ya la llevo yo."] },
    {
      lines: ["Un libro de cuentas abierto. Alguien ha subrayado dos veces «7 × 9».", "Arranco la página con mucho cuidado. Elvira no se enfadará… creo."],
      effects: [{ give: "pagina-elvira" }],
    },
  ],

  // ------------------------------------------------------ salón de música
  piano: [
    { if: solved("melodia"), lines: ["Toco do, mi, sol. Ahora el piano ya no suena triste."] },
    { lines: ["Un piano de cola lleno de polvo. Toco tres teclas: do, mi, sol.", "Suena bonito… y un poco triste."] },
  ],
  arpa: [{ lines: ["Un arpa con una cuerda rota. Las demás vibran solas cuando truena."] }],
  gramofono: [
    { if: solved("melodia"), lines: ["El gramófono gira en silencio. Ya me dio lo que guardaba."] },
    {
      lines: ["Un gramófono con un cilindro de cera atascado.", "Tiene una ruedita con notas: do, re, mi, fa, sol, la. Espera una melodía."],
      puzzle: "melodia",
    },
  ],
  partituras: [
    {
      lines: ["Partituras con la misma melodía repetida: do, mi, sol… do, mi, sol…", "En el margen alguien escribió: «y vuelta a empezar»."],
      effects: [{ set: "pista-melodia" }],
    },
  ],

  // ----------------------------------------------------------- invernadero
  "flores-luna": [
    { if: solved("antidoto"), lines: ["Las flores ya no repiten voces. Solo brillan."] },
    { if: { quest: ["antidoto", ">=", 1] }, lines: ["Las flores de luna. La señora Bruma necesita las proporciones exactas."], puzzle: "antidoto" },
    { lines: ["Flores pálidas que brillan un poco. Si me acerco, repiten mi voz: «¿hola?»", "Seguro que la señora Bruma sabe para qué sirven."] },
  ],
  fuente: [{ lines: ["Una fuente con una niña de piedra. Tiene la cara de la niña de los retratos."] }],
  regadera: [{ lines: ["Una regadera llena de agua de lluvia. Pesa muchísimo."] }],
  macetas: [{ lines: ["Ocho macetas en fila, con tres flores de luna en cada una."] }],

  // ---------------------------------------------------------------- cocina
  caldera: [
    { if: solved("caldera"), lines: ["La caldera respira tranquila. El portón de abajo ya se puede abrir."] },
    { lines: ["Manómetros y tubos por todas partes. La aguja tiembla, como si la caldera tuviera fiebre."], puzzle: "caldera" },
  ],
  "mesa-cocina": [{ lines: ["Una receta chamuscada: «Galletas de piedra. No se hornean con miedo»."] }],
  fregadero: [{ lines: ["Platos de 1913 sin fregar. Qué asco… y qué antiguos."] }],

  // --------------------------------------------------------------- archivo
  altar: [
    { if: solved("pacto"), lines: ["El altar está en silencio. El pacto se ha roto."] },
    { if: { flag: "altar-abierto" }, lines: ["Las letras del altar siguen brillando: «di la cuenta entera»."], puzzle: "pacto" },
    {
      use: "engranaje-marfil",
      if: { has: "sello-aurelia" },
      lines: ["Pongo el engranaje y el sello en los dos huecos del altar… ¡encajan!", "Se iluminan unas letras: «Di la cuenta entera y el pacto se romperá»."],
      effects: [{ set: "altar-abierto" }],
      puzzle: "pacto",
    },
    {
      use: "sello-aurelia",
      if: { has: "engranaje-marfil" },
      lines: ["Pongo el sello y el engranaje en los dos huecos del altar… ¡encajan!", "Se iluminan unas letras: «Di la cuenta entera y el pacto se romperá»."],
      effects: [{ set: "altar-abierto" }],
      puzzle: "pacto",
    },
    {
      if: { any: [{ has: "sello-aurelia" }, { has: "engranaje-marfil" }] },
      lines: ["El altar tiene dos huecos: uno redondo con trece dientes y otro con forma de sello. Aún me falta una pieza."],
    },
    { lines: ["Un altar con dos huecos vacíos: uno redondo, con trece dientes, y otro con forma de sello de lacre.", "Una cadena lo une a la puerta del pacto."] },
  ],
  sarcofago: [{ lines: ["Un sarcófago de piedra con doce nombres grabados. Queda sitio para uno más."] }],
  registro: [{ lines: ["Un registro cosido con hilo rojo. Trece nombres. El último está tachado: «Inés»."] }],
  cajonera: [{ lines: ["Quince cajones. Tres están quemados por dentro."] }],

  // --------------------------------------------------------------- túneles
  ...Object.fromEntries(
    ["compuerta-1", "compuerta-2", "compuerta-3"].map((id) => [id, [
      { if: solved("compuertas"), lines: ["El agua ha bajado. Se ve el paso hacia la torre."] },
      { lines: ["Tres compuertas oxidadas con números romanos: I, II y III.", "Si las abro en el orden bueno, el agua bajará."], puzzle: "compuertas" },
    ] satisfies PropAction[]]),
  ),

  // --------------------------------------------------------------- galería
  armadura: [{ lines: ["Una armadura con un guante blanco en la mano. ¡Es el que perdió Gumersindo!"] }],
  retratos: [
    { if: solved("retratos"), lines: ["Los retratos ya están en su sitio: Aurelia, Tomás y Elvira."] },
    { lines: ["Los retratos de la familia están descolocados. Uno está vacío: solo hay un marco con una I."], puzzle: "retratos" },
  ],
  aparador: [{ lines: ["Una lámpara de aceite y un plato con migas de galleta."] }],
  jarron: [{ lines: ["Un jarrón enorme. Dentro hay… ¿un calcetín?"] }],

  // ------------------------------------------------------------ dormitorio
  "caja-musica": [
    { if: solved("caja"), lines: ["La cajita toca sola, muy bajito."] },
    { lines: ["La caja de música de Inés. El cilindro tiene números: 3, 6, 12, 24…"], puzzle: "caja" },
  ],
  caballito: [{ lines: ["Un caballito de balancín. Cuando lo toco, se mece solo tres veces."] }],
  "mapa-estelar": [{ lines: ["Un mapa de estrellas pintado por Inés: doce constelaciones en círculo."] }],
  tren: [{ lines: ["Un tren de juguete que da vueltas sin que nadie le dé cuerda."] }],
  comoda: [{ lines: ["La cómoda de Inés. Huele a lavanda y a lluvia."] }],

  // ---------------------------------------------------------------- desván
  jaula: [{ lines: ["Una jaula vacía con la puerta abierta. El pájaro se fue hace mucho."] }],
  roseton: [{ lines: ["Con cada relámpago, el rosetón dibuja un 7 en el suelo."] }],
  sabanas: [{ lines: ["Sábanas colgadas que se mueven solas. Debajo asoman unos zapatos… ¡Ah, no! Solo son zapatos."] }],
  baules: [
    { if: solved("baules"), lines: ["Los baúles ya no esconden nada que me haga falta."] },
    { lines: ["Montones de baúles numerados. Gafe se muere por colarse entre ellos.", gafe("Miau. (Gafe olfatea como loco.)")], puzzle: "baules" },
  ],

  // ---------------------------------------------------------- observatorio
  telescopio: [
    { if: solved("estrellas"), lines: ["El telescopio apunta a la pasarela. El cerrojo de estrellas está abierto."] },
    {
      use: "lente-luna",
      lines: ["Pongo la lente de luna en el telescopio… ¡ahora sí se ve!", "El cerrojo de la pasarela es una rueda de estrellas."],
      puzzle: "estrellas",
    },
    { lines: ["Un telescopio enorme, pero la lente está rota: no se ve nada.", "Quizá con otro cristal…"] },
  ],
  planetario: [{ lines: ["Un planetario de latón. Nueve planetas giran muy despacio."] }],
  globo: [{ lines: ["Un globo terráqueo antiguo. Faltan países y sobran mares."] }],
  "cuaderno-estrellas": [{ lines: ["El cuaderno de observaciones de Inés: «El cielo se reparte en doce casas iguales»."] }],

  // ----------------------------------------------------------------- torre
  campana: [
    { if: solved("campana"), lines: ["La campana ha sonado trece veces. Ya no da miedo."] },
    { if: { not: { flag: "pacto-roto" } }, lines: ["La campana de las trece. Está sujeta con cadenas.", "Mientras el pacto de la capilla siga en pie, no sonará por Inés."] },
    {
      if: { counter: ["recuerdos", "<", 5] },
      lines: ["La campana de las trece. Inés dijo que no hay que golpearla.", "Le faltan recuerdos. Llevo {recuerdos} de 5."],
    },
    {
      if: { counter: ["fiesta", "<", 6] },
      lines: [
        "Llevo los cinco recuerdos de Inés, pero la campana no tiembla. La casa sigue triste.",
        "Falta la fiesta que Inés nunca tuvo. Llevo {fiesta} de 6 cosas preparadas.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
    },
    { lines: ["Llevo los cinco recuerdos de Inés y la fiesta está lista. La campana tiembla, como si escuchara."], puzzle: "campana" },
  ],
  engranajes: [{ lines: ["El mecanismo del reloj de la torre. Todas las ruedas tienen trece dientes."] }],
  // ------------------------------------------------------ salón de baile
  atril: [
    { if: solved("vals"), lines: ["La partitura del vals descansa en el atril. La orquesta ya se la sabe de memoria."] },
    { if: { flag: "batuta-entregada" }, lines: ["La batuta marca el compás sola. El piano de la tarima me espera."], puzzle: "vals" },
    {
      use: "batuta",
      lines: [
        "Dejo la batuta en el atril… ¡y se pone a marcar el compás ella sola!",
        "Un, dos, tres… un, dos, tres. El maestro Anacleto tararea y el piano de la tarima me espera.",
      ],
      effects: [{ take: "batuta" }, { set: "batuta-entregada" }, { stage: ["fiesta", 1] }],
      puzzle: "vals",
    },
    {
      lines: [
        "Un atril con una partitura en blanco: «Vals para Inés». Las notas se han borrado solas.",
        "Falta la batuta del director. Dicen que sin ella la orquesta no se acuerda de nada.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
    },
  ],
  "espejo-dorado": [
    { if: { counter: ["fiesta", ">=", 6] }, lines: ["En el espejo, el salón está lleno de luces y de gente bailando. Solo falta que suene la campana."] },
    {
      lines: [
        "Un espejo enorme con marco dorado. Por un momento veo el salón lleno de farolillos y de gente bailando…",
        "Parpadeo y vuelve a estar vacío. La casa se acuerda de una fiesta que nunca tuvo.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
    },
  ],
  lamparas: [
    { lines: ["Tres lámparas de cristal con velas encendidas. Tintinean cada vez que alguien baila.", gafe("Miau. (Gafe sigue con los ojos los brillos del techo.)")] },
  ],
  "sillas-enfundadas": [
    { if: seen("sillas-enfundadas"), lines: ["Debajo de una sábana hay huellas pequeñas… de gato. Gafe disimula."] },
    { lines: ["Filas de sillas tapadas con sábanas blancas, esperando invitados desde 1913.", "Mejor que sigan durmiendo hasta la fiesta."] },
  ],

  // ------------------------------------------------------ comedor de gala
  "mesa-banquete": [
    { if: solved("banquete"), lines: ["La mesa está perfecta: la vajilla en su sitio y la tarta partida en trozos iguales."] },
    {
      lines: [
        "La mesa del banquete es un lío: platos amontonados, cucharas por el suelo…",
        "Tía Clemencia necesita ayuda para dejarla perfecta para la fiesta.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
      puzzle: "banquete",
    },
  ],
  "tarta-campana": [
    { if: { has: "tarta-ines" }, lines: ["La tarta de Inés ya está lista para la fiesta. Tía Clemencia la vigila como un dragón."] },
    { lines: ["Una tarta de tres pisos bajo una campana de cristal. Tiene diez velas sin encender.", gafe("Miau. (Gafe pega la nariz al cristal y lo empaña.)")] },
  ],
  "aparador-porcelana": [
    { lines: ["Un aparador lleno de porcelana: soperas, teteras, platitos del té… Todo lleva una I pintada."] },
  ],
  chimenea: [
    { lines: ["El fuego de la chimenea no quema ni se apaga, pero calienta de verdad. Qué gusto.", gafe("Prrr. (Gafe se tumba delante del fuego y cierra los ojos.)")] },
  ],
  tapiz: [
    { lines: ["Un tapiz con una fiesta en un jardín: farolillos, músicos… y una niña con una cinta roja."] },
  ],

  // ------------------------------------------------------ jardín del laberinto
  "entrada-laberinto": [
    { if: solved("laberinto"), lines: ["Las luciérnagas duermen dentro de los farolillos. Desde aquí se ve cómo parpadean."] },
    {
      lines: [
        "La entrada del laberinto. Muy al fondo, entre los setos, parpadean lucecitas perdidas.",
        "¡Son luciérnagas! Si las guío hasta el farolillo, serán los farolillos de la fiesta.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
      puzzle: "laberinto",
    },
  ],
  "fuente-angel": [
    { if: { any: [{ has: "batuta" }, { flag: "batuta-entregada" }] }, lines: ["Las ranas de la fuente siguen cantando, ahora sin director. Desafinan un poco."] },
    {
      if: { any: [seen("fuente-angel"), { flag: "pista-batuta" }, { chose: ["ramona", "batuta"] }] },
      lines: [
        "Meto la mano en el agua, entre las ranas… ¡una batuta de director! La usaban para dirigir el coro.",
        "Me la llevo. Seguro que alguien la echa de menos.",
      ],
      effects: [{ give: "batuta" }],
    },
    {
      lines: [
        "Una fuente con un ángel. Las ranas croan todas a la vez, como si alguien las dirigiera.",
        "Algo brilla en el fondo del agua, pero con tanta rana no lo veo bien.",
      ],
    },
  ],
  "banco-jardin": [
    { lines: ["Un banco de piedra mojado. Alguien ha olvidado una servilleta de encaje con una I bordada."] },
  ],
  rosales: [
    { lines: ["Rosas de color de rosa que huelen a caramelo. Una tiene una gota de lluvia que nunca se cae."] },
  ],

  // ------------------------------------------------------ taller del juguetero
  "banco-trabajo": [
    { if: solved("automata"), lines: ["La cajita de música ya tiene su bailarina. Casimiro la mira y sonríe de oreja a oreja."] },
    { if: { flag: "llave-entregada" }, lines: ["Las piezas de la bailarina siguen revueltas en el cajón. ¡Vamos a montarla!"], puzzle: "automata" },
    {
      use: "llave-cuerda",
      lines: ["Le doy a Casimiro la llave de cuerda. «¡Mi llavecita! Ahora sí: a montar la bailarina»."],
      effects: [{ take: "llave-cuerda" }, { set: "llave-entregada" }, { stage: ["fiesta", 1] }],
      puzzle: "automata",
    },
    {
      lines: [
        "El banco de trabajo de Casimiro: engranajes, muelles y una cajita de música sin bailarina.",
        "Falta la llave de cuerda. Sin ella, aquí no se mueve nada.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
    },
  ],
  "bailarina-automata": [
    { if: solved("automata"), lines: ["La bailarina grande hace una reverencia. ¡Juraría que me ha guiñado un ojo!"] },
    { lines: ["Una bailarina autómata del tamaño de una niña. Está quieta, con los brazos en alto, esperando música."] },
  ],
  munecas: [
    { lines: ["Estantes llenos de muñecas de porcelana. Todas miran hacia la puerta, como si esperaran a alguien.", gafe("Miau… (Gafe no se fía de las muñecas. Nada de nada.)")] },
  ],
  "rueda-engranajes": [
    { lines: ["Una rueda grande de engranajes. Cuando gira hacia un lado, la pequeña que la toca gira hacia el otro."] },
  ],
  "robot-tambor": [
    { lines: ["Un robot pequeñito con un tambor. Le doy un toquecito y hace: ¡pom, pom, pom!"] },
  ],

  // ------------------------------------------------------ estudio del pintor
  caballete: [
    { if: solved("colores"), lines: ["El retrato de Inés ya tiene todos sus colores. Parece que va a salir del cuadro a jugar."] },
    {
      lines: [
        "Un retrato de una niña con una cinta roja, a medio pintar. ¡Es Inés!",
        "Don Fermín quiere pintar las invitaciones de la fiesta, pero le faltan colores.",
      ],
      effects: [{ stage: ["fiesta", 1] }],
      puzzle: "colores",
    },
  ],
  paleta: [
    { lines: ["Una paleta con solo cuatro colores: rojo, amarillo, azul y blanco. Con eso, dice Fermín, se pinta todo."] },
  ],
  lienzos: [
    { lines: ["Cuadros apoyados en la pared: Basilio con su bigote, Elvira sin sonreír… y Gafe. ¿Gafe? Qué raro."] },
  ],
  busto: [
    { lines: ["Un busto de yeso muy serio. Alguien le ha pintado un bigote con carboncillo. Seguro que ha sido Pepito."] },
  ],
  claraboya: [
    { lines: ["Por la claraboya se ve la luna llena. Las gotas resbalan por el cristal como si pintaran."] },
  ],
  sofa: [
    { lines: ["Un sofá de terciopelo granate. Se hunde como una nube. Me quedaría aquí… pero hay una fiesta que preparar."] },
  ],

  // ------------------------------------------------------ teatrito de Inés
  escenario: [
    { if: solved("funcion"), lines: ["El telón se abre y las marionetas saludan. ¡La función está lista para la fiesta!"] },
    {
      lines: ["Un escenario de marionetas con estrellas pintadas. Las escenas de la función están desordenadas.", "Bartolo dice que sin orden no hay cuento."],
      effects: [{ stage: ["fiesta", 1] }],
      puzzle: "funcion",
    },
  ],
  marionetas: [
    { lines: ["Una princesa, un caballero, un dragón y… ¡un gato negro de trapo! Se parece a Gafe.", gafe("Miau. (Gafe mira a su marioneta con cara de pocos amigos.)")] },
  ],
  "baul-disfraces": [
    { if: { any: [{ has: "llave-cuerda" }, { flag: "llave-entregada" }] }, lines: ["Sombreros, capas y narices de payaso. Ya no queda nada escondido."] },
    {
      if: { any: [seen("baul-disfraces"), { flag: "pista-llave" }, { chose: ["bartolo", "llave"] }] },
      lines: ["Busco dentro del sombrero de copa… ¡una llavecita de latón con una I grabada!", "Es la llave de cuerda de Casimiro."],
      effects: [{ give: "llave-cuerda" }],
    },
    { lines: ["Un baúl lleno de disfraces: capas, coronas, un sombrero de copa enorme…", "Algo tintinea dentro del sombrero, pero está hundido bajo tanta tela."] },
  ],
  sillitas: [
    { lines: ["Sillitas del tamaño de niños. En la primera fila hay una con cojín y una I bordada: el sitio de Inés."] },
  ],
  "cofre-mascaras": [
    { lines: ["Un cofre con máscaras sonrientes. Una bosteza cuando la miro. Mejor no tocarlas."] },
  ],
  "puerta-pintada": [
    { lines: ["Es una puerta pintada en la pared, de decorado. Tiene hasta el pomo pintado.", gafe("Miau. (Gafe intenta rascarla. No se abre.)")] },
  ],

  // ------------------------------------------------------ rellano del reloj
  "reloj-pie": [
    { if: { flag: "reloj-en-hora" }, lines: ["Tic, tac. El reloj de pie vuelve a andar. Da gusto oírlo."] },
    {
      lines: [
        "Un reloj de pie más alto que Basilio. Las agujas están paradas a una hora rarísima.",
        "Dentro de la caja, detrás del péndulo, asoma una esquina de papel azul.",
      ],
      puzzle: "hora",
    },
  ],
  "ventana-redonda": [
    { lines: ["Una ventana redonda como un ojo de buey. Desde aquí se ve la torre, con su reloj de trece horas.", gafe("Miau. (Gafe se sube al alféizar y cuenta gotas.)")] },
  ],
  "fotos-rellano": [
    { lines: ["Fotografías antiguas: una familia de 1913 muy seria… y una niña que no puede estarse quieta y sale movida. Es Inés."] },
  ],
  "papel-alfombra": [
    { if: seen("papel-alfombra"), lines: ["Aquí estaba la primera página. La alfombra aún huele a tinta."] },
    {
      lines: [
        "Una hoja arrancada de un diario: «Hoy la señorita Rosalía me ha puesto un diez. Mañana es mi cumpleaños y la bisabuela me ha prometido una sorpresa»…",
        "Está firmada con una I. ¡Es el diario de Inés! Si hay una página, habrá más.",
      ],
      effects: [{ give: "diario-ines" }, { count: "diario" }, { stage: ["diario", 1] }],
    },
  ],

  // ------------------------------------------------------ aula de la institutriz
  pizarra: [
    { if: solved("leccion"), lines: ["La lección está terminada y hay un diez dibujado con tiza. Inés estaría orgullosa."] },
    {
      lines: ["La última lección de Inés, a medio hacer. Alguien ha escrito debajo: «Terminar antes de la fiesta»."],
      puzzle: "leccion",
    },
  ],
  "mesa-maestra": [
    { lines: ["Una campanilla, un tintero y una manzana roja que no se estropea nunca.", gafe("Miau. (Gafe le da un golpecito a la campanilla. ¡Tilín! Todos a clase.)")] },
  ],
  pupitres: [
    { lines: ["Tres pupitres. En el de en medio alguien ha tallado: «I + G = amigos». ¿G de… Gafe?", gafe("Miau. (Gafe disimula mirando al techo.)")] },
  ],
  esqueleto: [
    { lines: ["El esqueleto de la clase. Tiene una etiqueta: «Huesitos, 206 huesos». Lleva una bufanda que alguien le puso para que no pase frío."] },
  ],
  abaco: [
    { lines: ["Un ábaco de bolitas de colores. Cuento las rojas: diez. Las amarillas: diez. ¡Cien en total, si todas las filas tienen diez!"] },
  ],
  "mapa-aula": [
    { lines: ["Un mapa del mundo antiguo. España está marcada con una estrellita y una flecha: «¡Aquí vivo yo!»."] },
  ],
  "ventana-aula": [
    { lines: ["Por el ventanal se ve el jardín del laberinto, allá abajo, con sus farolillos."] },
  ],

  // ------------------------------------------------------ cuarto de costura
  maniqui: [
    { if: solved("vestido"), lines: ["El vestido rosa ya tiene todos sus botones y sus lazos. Es precioso."] },
    {
      lines: ["El vestido de la fiesta de Inés, rosa y con lazos. Le faltan todos los botones.", "Hay un papel azul prendido con un alfiler en el dobladillo… otra página del diario."],
      puzzle: "vestido",
    },
  ],
  "maquina-coser": [
    { lines: ["Una máquina de coser de pedal. Piso el pedal y la aguja hace tac-tac-tac, sola, aunque no hay nadie."] },
  ],
  hilos: [
    { lines: ["Cientos de carretes de hilo, de todos los colores. El rosa está casi gastado: se usó para el vestido."] },
  ],
  "tarro-botones": [
    { lines: ["Un tarro lleno de botones. Hay uno con forma de gato negro.", gafe("Miau. (Gafe mira el botón como si fuera un retrato suyo.)")] },
  ],
  mecedora: [
    { lines: ["La mecedora se mueve un poquito, como si alguien acabara de levantarse. Todavía está calentita."] },
  ],
  "libro-patrones": [
    { lines: ["Un libro de patrones. En la página del vestido rosa pone: «Para Inés, talla nueve años»."] },
  ],

  // ------------------------------------------------------ alcoba de Aurelia
  "retrato-oval": [
    { if: { flag: "aurelia-recuerda" }, lines: ["La Aurelia del retrato sonríe. A su lado, en el marco, ha aparecido una niña pequeñita con una cinta roja."] },
    { lines: ["Aurelia de joven. En el marco hay un hueco vacío al lado, como si faltara alguien en el cuadro."] },
  ],
  tocador: [
    { if: solved("nana"), lines: ["El joyero está abierto y suena la nana, bajito. Huele a lavanda."] },
    { if: { flag: "joyero-probado" }, use: "pajarito-papel", lines: ["Acerco el pajarito de papel al joyero… ¡y se pone a cantar la nana!"], puzzle: "nana" },
    {
      use: "pajarito-papel",
      lines: ["El pajarito de papel se me escapa de la mano, se posa en el joyero y empieza a cantar bajito…"],
      effects: [{ set: "joyero-probado" }],
      puzzle: "nana",
    },
    {
      lines: ["Un tocador con perfumes y un joyero que es una cajita de música. Está cerrado.", "Tiene una ranura con forma de pájaro. Solo se abrirá con su canción."],
      effects: [{ set: "joyero-probado" }],
    },
  ],
  "chimenea-alcoba": [
    { lines: ["Un fuego que no quema y no se apaga. Delante hay una butaca con una manta de cuadros.", gafe("Prrr. (Gafe se enrosca delante del fuego.)")] },
  ],
  "cama-dosel": [
    { lines: ["Una cama enorme con cortinas de terciopelo. Encima de la almohada, un camisón doblado y un libro de cuentos para leer a una niña."] },
  ],
  "armario-alcoba": [
    { lines: ["Un armario tallado con pájaros. Dentro, vestidos de otra época y una caja de sombreros que ronca un poquito."] },
  ],
  "espejo-ovalado": [
    { lines: ["En el espejo me veo a mí… y detrás, por un segundo, a una señora mayor que me guiña un ojo."] },
  ],
  "puerta-vestidor": [
    { lines: ["La puerta del vestidor. Está cerrada, y dentro se oye un reloj de cuco que se ha quedado dormido."] },
  ],

  // ------------------------------------------------------ pajarera de cristal
  "jaula-grande": [
    { if: solved("pajaros"), lines: ["El pajarito de papel ya no está en la jaula: vuela conmigo en la mochila."] },
    {
      lines: ["Una jaula enorme con la puerta abierta. Dentro no hay ningún pájaro… pero algo de papel aletea entre las macetas."],
      puzzle: "pajaros",
    },
  ],
  "fuente-pajaros": [
    { lines: ["Un bebedero de piedra con una vela encendida. El agua tiene plumitas de papel flotando."] },
  ],
  "jaulas-colgadas": [
    { lines: ["Jaulas colgando del techo de cristal. Se mecen solas, como si los pájaros acabaran de salir volando."] },
  ],
  "torre-lejana": [
    { lines: ["Desde aquí se ve la torre del reloj, bajo la lluvia. Su esfera tiene trece horas."] },
  ],

  "esfera-reloj": [
    { if: seen("esfera-reloj"), lines: ["La esfera marca las doce menos un minuto. Siempre."] },
    {
      lines: ["La esfera del reloj, por dentro. Hay algo atado a la aguja pequeña…", "¡Una cinta roja! Lejísimos de la campana, como dijo Florentina."],
      effects: [{ give: "cinta-roja" }, { count: "recuerdos" }],
    },
  ],
};
