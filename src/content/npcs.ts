/**
 * Reparto: quién es cada personaje, cómo se mueve, dónde vive, qué rutina
 * sigue por la mansión, cómo es (IA) y qué dice de pasada. Las conversaciones
 * completas están en dialogues.ts y las charlas entre ellos en chats.ts.
 *
 * La leyenda: «trece criados entraron en la capilla; solo doce salieron».
 * Los doce son los fantasmas de la casa. La decimotercera es Inés.
 */
import type { Personality } from "../core/npcBrain";
import type { Routine } from "../core/worldSim";
import type { SpriteKey } from "./sprites";

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  /** Sprite de fichero (todo el reparto está pintado: tools/gen_characters.py). */
  sprite: SpriteKey;
  /** "ghost" es un fantasma (brilla un poco, titila con los relámpagos); "person", un ser vivo. */
  kind: "ghost" | "person";
  /** Elevación sobre el suelo (m): los fantasmas flotan; Ramona vuela. 0 = pisa el suelo. */
  floatM: number;
  alpha: number;
  tint?: number;
  /** Brillo propio (si no, lo decide el tipo: los fantasmas brillan un poco). */
  glow?: number;
  personality: Personality;
  routine: Routine;
  /** Saludo la primera vez que ve a Paula. */
  greet: string[];
  /** Comentarios que suelta si Paula anda cerca. */
  ambient: string[];
}

const st = (zone: string, weight: number, stay: [number, number]) => ({ zone, weight, stay });
/** Criado fantasma: una sabanita pintada que flota y brilla un poco. */
const servant = (id: string) => ({ sprite: `ghost-${id}`, kind: "ghost" as const, floatM: 0.26, alpha: 0.86, glow: 0.55 });

export const NPCS: NpcDef[] = [
  // ============================================================ principales
  {
    id: "basilio", name: "Don Basilio", role: "Mayordomo difunto", sprite: "basilio", kind: "ghost",
    floatM: 0.07, alpha: 0.92, tint: 0xc9d4e6,
    personality: { restlessness: 0.55, chattiness: 0.8, noticeRadiusM: 2.6, attendRadiusM: 3.4 },
    routine: { home: "vestibulo", stations: [st("vestibulo", 5, [120, 300]), st("galeria", 1, [60, 120]), st("cocina", 1, [60, 120]), st("archivo", 1, [50, 100])] },
    greet: ["¡Señorita Paula! La casa llevaba trece años esperándola."],
    ambient: [
      "Yo jamás miento… desde que usted entró.",
      "La puerta verde es segura. O era la otra. Las bisagras se confunden.",
      "¿Ha visto usted mi bigote? Me lo atuso cuando pienso. Solo cuando pienso.",
    ],
  },
  {
    id: "elvira", name: "Doña Elvira", role: "Bibliotecaria, 1913", sprite: "elvira", kind: "ghost",
    floatM: 0.1, alpha: 0.88,
    personality: { restlessness: 0.35, chattiness: 0.5, noticeRadiusM: 2.2, attendRadiusM: 3 },
    routine: { home: "biblioteca", stations: [st("biblioteca", 6, [150, 360]), st("musica", 1, [60, 120]), st("galeria", 1, [60, 120])] },
    greet: ["¿Una visita? Silencio, por favor. Los libros duermen."],
    ambient: ["Siete noches, nueve campanadas… nunca olvido una cuenta.", "Ese reloj no mide horas. Mide deudas."],
  },
  {
    id: "tomas", name: "Tomás Valcárcel", role: "Antiguo guardés", sprite: "tomas", kind: "ghost",
    floatM: 0.08, alpha: 0.9,
    personality: { restlessness: 0.4, chattiness: 0.55, noticeRadiusM: 2.4, attendRadiusM: 3 },
    routine: { home: "cocina", stations: [st("cocina", 5, [150, 300]), st("archivo", 1, [60, 120]), st("invernadero", 1, [60, 120])] },
    greet: ["¿Quién anda ahí? Ah… una niña. Hacía años que no oía pasos tan ligeros."],
    ambient: ["La caldera respira mal esta noche.", "Yo cerré la capilla. Creí que así la protegía.", "Esa llave de porcelana… nunca debí fiarme de Basilio."],
  },
  {
    id: "ines", name: "Inés", role: "La niña de la casa", sprite: "ines", kind: "ghost",
    floatM: 0.15, alpha: 0.68,
    personality: { restlessness: 0.6, chattiness: 0.4, noticeRadiusM: 3, attendRadiusM: 2 },
    routine: { home: "dormitorio", stations: [st("dormitorio", 3, [60, 150]), st("observatorio", 2, [60, 120]), st("archivo", 1, [40, 80])] },
    greet: ["¿Paula? ¿De verdad eres tú? Llevo trece años esperando que alguien me oiga."],
    ambient: ["No toques la campana… por favor.", "Mis recuerdos están escondidos por la casa.", "La canica azul… ¿la has visto?"],
  },
  {
    id: "bruma", name: "Señora Bruma", role: "Botánica", sprite: "bruma", kind: "person",
    floatM: 0, alpha: 1,
    personality: { restlessness: 0.25, chattiness: 0.6, noticeRadiusM: 2.4, attendRadiusM: 3 },
    routine: { home: "invernadero", stations: [st("invernadero", 8, [200, 500]), st("musica", 1, [60, 100])] },
    greet: ["Cuidado con las flores pálidas, niña: repiten todo lo que oyen."],
    ambient: ["Las plantas recuerdan cada voz que las regó.", "Ocho macetas, tres flores en cada una… siempre las cuento.", "Esa flor de la derecha miente más que Basilio."],
  },
  {
    id: "baltasar", name: "Baltasar", role: "Cocinero y tenor", sprite: "baltasar", kind: "ghost",
    floatM: 0.05, alpha: 0.93,
    personality: { restlessness: 0.45, chattiness: 0.9, noticeRadiusM: 2.8, attendRadiusM: 3.4 },
    routine: { home: "musica", stations: [st("musica", 5, [150, 300]), st("cocina", 2, [80, 150]), st("vestibulo", 1, [60, 100])] },
    greet: ["¡Una espectadora! Por fin alguien que aplaude."],
    ambient: ["Do, mi, sol… y otra vez do.", "La casa me prohibió cantar. ¡Ja! A ver quién me lo impide.", "Si oyes un fa, ha sido el piano, no yo."],
  },

  // ============================================================ los doce criados
  {
    id: "remedios", name: "Remedios", role: "Cocinera", ...servant("remedios"),
    personality: { restlessness: 0.35, chattiness: 0.9, noticeRadiusM: 2.5, attendRadiusM: 3.2 },
    routine: { home: "cocina", stations: [st("cocina", 5, [120, 280]), st("invernadero", 1, [60, 100]), st("vestibulo", 1, [50, 90])] },
    greet: ["¡Ay, qué niña tan flaquita! ¿Has cenado?"],
    ambient: ["Una pizca de canela y tres de paciencia.", "Tomás me robaba las galletas. Y lo sigue intentando.", "La caldera se come los nombres si no la vigilas."],
  },
  {
    id: "anselmo", name: "Anselmo", role: "Cochero", ...servant("anselmo"),
    personality: { restlessness: 0.3, chattiness: 0.4, noticeRadiusM: 2.2, attendRadiusM: 3 },
    routine: { home: "vestibulo", stations: [st("vestibulo", 4, [120, 260]), st("galeria", 1, [60, 100]), st("cocina", 1, [60, 100])] },
    greet: ["Buenas noches, señorita. Mal tiempo para viajar."],
    ambient: ["Trece años sin sacar el coche. Los caballos ni me recuerdan.", "La tormenta no amaina cuando la casa no quiere.", "El camino de vuelta se abre al amanecer. O eso dicen."],
  },
  {
    id: "clotilde", name: "Clotilde", role: "Doncella", ...servant("clotilde"),
    personality: { restlessness: 0.85, chattiness: 1, noticeRadiusM: 3, attendRadiusM: 3.5 },
    routine: { home: "galeria", stations: [st("galeria", 2, [60, 120]), st("dormitorio", 2, [60, 120]), st("vestibulo", 2, [60, 120]), st("biblioteca", 1, [50, 90]), st("musica", 1, [50, 90])] },
    greet: ["¡Una visita! ¿Sabes lo que dicen de ti por los pasillos?"],
    ambient: ["Yo no cotilleo. Informo.", "Doña Elvira y Don Basilio no se hablan desde 1913.", "Si limpias bien el marco de un retrato, a veces se mueve."],
  },
  {
    id: "pepito", name: "Pepito", role: "Mozo de cuadra", ...servant("pepito"),
    personality: { restlessness: 1, chattiness: 0.7, noticeRadiusM: 3.5, attendRadiusM: 2.5 },
    routine: { home: "desvan", stations: [st("desvan", 1, [40, 90]), st("invernadero", 1, [40, 90]), st("archivo", 1, [40, 90]), st("galeria", 1, [40, 90]), st("cocina", 1, [40, 90]), st("musica", 1, [40, 90])] },
    greet: ["¡Te pillé! No, espera… ¡me has pillado tú!"],
    ambient: ["¿Jugamos al escondite? Yo me escondo. Siempre me escondo.", "¡Nadie me encuentra nunca!", "Gafe hace trampas: me huele."],
  },
  {
    id: "florentina", name: "Florentina", role: "Costurera", ...servant("florentina"),
    personality: { restlessness: 0.3, chattiness: 0.35, noticeRadiusM: 2, attendRadiusM: 2.5 },
    routine: { home: "costura", stations: [st("costura", 5, [150, 300]), st("dormitorio", 2, [60, 120]), st("rellano", 1, [50, 90])] },
    greet: ["Oh… hola. Perdona, estaba cosiendo el vestido de Inés."],
    ambient: ["Una puntada por cada noche que Inés no está.", "La cinta roja era su favorita.", "No me gusta la torre. Hace demasiado ruido."],
  },
  {
    id: "nicanor", name: "Nicanor", role: "Relojero", ...servant("nicanor"),
    personality: { restlessness: 0.4, chattiness: 0.6, noticeRadiusM: 2.4, attendRadiusM: 3 },
    routine: { home: "biblioteca", stations: [st("biblioteca", 4, [150, 300]), st("observatorio", 1, [60, 120]), st("galeria", 1, [60, 120])] },
    greet: ["Llegas tarde. O temprano. Aquí los relojes discuten."],
    ambient: ["Trece. Todo en esta casa acaba en trece.", "Ese reloj no cuenta horas, cuenta deudas.", "Siete por nueve, sesenta y tres. Nunca falla."],
  },
  {
    id: "leocadia", name: "Leocadia", role: "Ama de llaves", ...servant("leocadia"),
    personality: { restlessness: 0.45, chattiness: 0.5, noticeRadiusM: 2.6, attendRadiusM: 3.2 },
    routine: { home: "galeria", stations: [st("galeria", 4, [150, 300]), st("vestibulo", 1, [60, 120]), st("archivo", 1, [60, 120]), st("desvan", 1, [60, 120])] },
    greet: ["Las visitas, por la puerta principal. Y con las botas limpias."],
    ambient: ["Tengo una llave para cada puerta. Menos para una.", "La pasarela de la torre se cierra desde dentro.", "Nadie entra en el archivo sin permiso. Nadie… menos los fantasmas."],
  },
  {
    id: "serafin", name: "Serafín", role: "Jardinero", ...servant("serafin"),
    personality: { restlessness: 0.2, chattiness: 0.3, noticeRadiusM: 2, attendRadiusM: 2.5 },
    routine: { home: "invernadero", stations: [st("invernadero", 6, [200, 400]), st("cocina", 1, [60, 100])] },
    greet: ["Mmm… ¿eh? Ah, hola. Estaba regando… durmiendo… regando."],
    ambient: ["Las semillas de luna solo brotan si les dices la verdad.", "Zzz… la fuente cuenta gotas… zzz.", "La señora Bruma sabe más de lo que dice."],
  },
  {
    id: "crispulo", name: "Críspulo", role: "Violinista", ...servant("crispulo"),
    personality: { restlessness: 0.5, chattiness: 0.8, noticeRadiusM: 2.6, attendRadiusM: 3.2 },
    routine: { home: "musica", stations: [st("musica", 5, [150, 300]), st("galeria", 1, [60, 120]), st("biblioteca", 1, [60, 120])] },
    greet: ["¡Ah, una oyente! ¿Te gustan los violines? ¿Y los violines fantasma?"],
    ambient: ["Mi violín de verdad se lo quedó la casa en 1913. Este es su fantasma.", "Baltasar desafina, pero no se lo digas.", "La melodía de la casa tiene tres notas y un secreto."],
  },
  {
    id: "tadeo", name: "Tadeo", role: "Farolero", ...servant("tadeo"),
    personality: { restlessness: 0.5, chattiness: 0.7, noticeRadiusM: 2.8, attendRadiusM: 3.2 },
    routine: { home: "archivo", stations: [st("archivo", 4, [120, 260]), st("vestibulo", 1, [60, 100]), st("galeria", 1, [60, 100])] },
    greet: ["¡Luz! Toma un poco de la mía, que aquí abajo hace falta."],
    ambient: ["En los túneles el agua enseña otra casa.", "Enciendo faroles que nadie apaga desde hace trece años.", "Bajo la capilla, las compuertas cuentan I, II y III."],
  },
  {
    id: "engracia", name: "Engracia", role: "Lavandera", ...servant("engracia"),
    personality: { restlessness: 0.25, chattiness: 0.4, noticeRadiusM: 2.2, attendRadiusM: 2.8 },
    routine: { home: "desvan", stations: [st("desvan", 5, [150, 300]), st("cocina", 1, [60, 120]), st("dormitorio", 1, [60, 120])] },
    greet: ["¿Traes ropa sucia? No. Mejor. Estoy cansadísima."],
    ambient: ["Tiendo las sábanas y se van solas.", "En el baúl número siete hay algo que no es ropa.", "Arriba, en el desván, todo huele a lavanda y a secretos."],
  },
  {
    id: "gumersindo", name: "Gumersindo", role: "Lacayo", ...servant("gumersindo"),
    personality: { restlessness: 0.6, chattiness: 0.8, noticeRadiusM: 2.8, attendRadiusM: 3.2 },
    routine: { home: "vestibulo", stations: [st("vestibulo", 4, [120, 260]), st("galeria", 1, [60, 100]), st("musica", 1, [60, 100])] },
    greet: ["¡Oh! ¡Perdón! ¿Te he asustado? ¿O me has asustado tú a mí?"],
    ambient: ["Se me cayó una bandeja en 1913. Todavía la estoy recogiendo.", "¿Alguien ha visto mi otro guante?", "Don Basilio dice que soy torpe. Es verdad."],
  },
];

/** El ala de la fiesta: los que preparaban el cumpleaños de Inés en 1913. */
NPCS.push(
  {
    id: "anacleto", name: "Maestro Anacleto", role: "Director de orquesta", sprite: "anacleto", kind: "ghost",
    floatM: 0.08, alpha: 0.9,
    personality: { restlessness: 0.35, chattiness: 0.75, noticeRadiusM: 2.8, attendRadiusM: 3.4 },
    routine: { home: "baile", stations: [st("baile", 6, [150, 320]), st("musica", 2, [60, 120]), st("comedor", 1, [50, 90])] },
    greet: ["¡Silencio en la sala! Ah… es una niña. Perdón: llevo trece años mandando callar a nadie."],
    ambient: [
      "Un, dos, tres… un, dos, tres… el vals se me escapa.",
      "¿Alguien ha visto mi batuta? Sin ella, los violines hacen lo que quieren.",
      "Esta orquesta tocará en el cumpleaños de Inés. Aunque sea lo último que toque.",
    ],
  },
  {
    id: "clemencia", name: "Tía Clemencia", role: "Repostera", sprite: "clemencia", kind: "ghost",
    floatM: 0.06, alpha: 0.9,
    personality: { restlessness: 0.45, chattiness: 0.95, noticeRadiusM: 2.6, attendRadiusM: 3.2 },
    routine: { home: "comedor", stations: [st("comedor", 5, [150, 300]), st("cocina", 2, [80, 150]), st("baile", 1, [50, 100])] },
    greet: ["¡Tú debes de ser Paula! Qué alegría, una invitada de verdad. ¿Te gusta el bizcocho de fresa?"],
    ambient: [
      "Tres pisos, diez velas y ni una miga en el suelo.",
      "Remedios dice que su bizcocho es mejor. Remedios exagera.",
      "Una fiesta sin tarta es solo una reunión.",
    ],
  },
  {
    id: "casimiro", name: "Casimiro", role: "Juguetero", sprite: "casimiro", kind: "ghost",
    floatM: 0.07, alpha: 0.9,
    personality: { restlessness: 0.3, chattiness: 0.6, noticeRadiusM: 2.4, attendRadiusM: 3 },
    routine: { home: "taller", stations: [st("taller", 6, [180, 360]), st("galeria", 1, [60, 120]), st("estudio", 1, [60, 100])] },
    greet: ["¡Una niña! Hacía trece años que nadie venía a ver mis juguetes. Mira, pero con los ojos."],
    ambient: [
      "Tic, tac, cuerda y engranaje: así laten los juguetes.",
      "La bailarina era para Inés. Se me durmió antes de la fiesta.",
      "¿Dónde habré dejado la llavecita de cuerda? La tenía Bartolo… o yo… o Bartolo.",
    ],
  },
  {
    id: "fermin", name: "Don Fermín", role: "Pintor de la familia", sprite: "fermin", kind: "ghost",
    floatM: 0.07, alpha: 0.9,
    personality: { restlessness: 0.4, chattiness: 0.55, noticeRadiusM: 2.4, attendRadiusM: 3 },
    routine: { home: "estudio", stations: [st("estudio", 5, [150, 320]), st("taller", 1, [60, 120]), st("galeria", 2, [60, 120])] },
    greet: ["¡No te muevas! Así, con esa luz… Ay, perdona, manías de pintor. Soy Fermín."],
    ambient: [
      "Todos los retratos de la galería los pinté yo. Menos el que se borró.",
      "Con rojo, amarillo, azul y blanco se pinta el mundo entero.",
      "Me faltan colores para las invitaciones. Me sobran ganas.",
    ],
  },
  {
    id: "bartolo", name: "Bartolo", role: "Titiritero", sprite: "bartolo", kind: "ghost",
    floatM: 0.07, alpha: 0.9,
    personality: { restlessness: 0.6, chattiness: 0.9, noticeRadiusM: 2.8, attendRadiusM: 3.2 },
    routine: { home: "teatro", stations: [st("teatro", 5, [150, 300]), st("dormitorio", 1, [60, 120]), st("galeria", 1, [60, 100])] },
    greet: ["¡Pasen y vean! Bueno, pasa y mira, que solo eres una. ¡Bienvenida al teatrito de Inés!"],
    ambient: [
      "El dragón de trapo me muerde si no le hago caso.",
      "Érase una vez… no, así no empezaba.",
      "La función de Inés tiene cuatro escenas y un gato.",
    ],
  },
  {
    // Una lechuza de verdad (no un fantasma): no brilla ni titila; vuela bajito entre los setos.
    id: "ramona", name: "Ramona", role: "Lechuza del jardín", sprite: "ramona", kind: "person",
    floatM: 1.25, alpha: 1, glow: 0,
    personality: { restlessness: 0.5, chattiness: 0.5, noticeRadiusM: 3.5, attendRadiusM: 3 },
    routine: { home: "jardin", stations: [st("jardin", 8, [200, 500]), st("invernadero", 1, [60, 120])] },
    greet: ["Uuh-uuh. Una niña y un gato, de noche, en mi jardín. Qué raro. Qué interesante."],
    ambient: [
      "Uuh-uuh. Desde arriba, el laberinto parece una oreja.",
      "Las luciérnagas se pierden siempre en el mismo rincón.",
      "Anoche vi una batuta en la fuente. Las ranas la usan para dirigir el coro.",
    ],
  },
);

/** La segunda planta: la bisabuela y la maestra de Inés. */
NPCS.push(
  {
    id: "aurelia", name: "Doña Aurelia", role: "La bisabuela", sprite: "aurelia", kind: "ghost",
    floatM: 0.06, alpha: 0.86,
    personality: { restlessness: 0.2, chattiness: 0.55, noticeRadiusM: 2.4, attendRadiusM: 3.2 },
    routine: { home: "alcoba", stations: [st("alcoba", 6, [200, 420]), st("rellano", 1, [60, 120]), st("pajarera", 1, [60, 120])] },
    greet: ["¿Quién anda ahí? Ah… una niña con una brújula. Acércate, que ya no veo bien. Me llamo Aurelia."],
    ambient: [
      "Tenía una bisnieta… o eso creo. Se me borra su cara, como la tiza.",
      "Mis pájaros de papel cantaban la nana. Ahora la pajarera está muda.",
      "Este reloj de la casa cuenta demasiado. Trece, trece, trece…",
    ],
  },
  {
    id: "rosalia", name: "Señorita Rosalía", role: "Institutriz", sprite: "rosalia", kind: "ghost",
    floatM: 0.07, alpha: 0.86,
    personality: { restlessness: 0.45, chattiness: 0.8, noticeRadiusM: 2.6, attendRadiusM: 3.2 },
    routine: { home: "aula", stations: [st("aula", 6, [180, 360]), st("rellano", 1, [60, 120]), st("biblioteca", 1, [60, 120])] },
    greet: ["¡Una alumna nueva! Siéntate derecha, por favor. Soy la señorita Rosalía."],
    ambient: [
      "Despacito y con buena letra.",
      "Inés era mi mejor alumna. Y la que más preguntaba.",
      "¿Siete por ocho? Cincuenta y seis. Siempre se me olvida a mí también.",
    ],
  },
);

export const npcById = (id: string): NpcDef | undefined => NPCS.find((n) => n.id === id);
