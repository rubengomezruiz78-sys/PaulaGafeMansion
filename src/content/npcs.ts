/**
 * Personajes no jugadores: quiénes son, dónde empiezan, cómo son (IA) y qué
 * dicen. Los textos parten del juego original (legacy/) como inspiración.
 */
import type { Personality } from "../core/npcBrain";
import type { SpriteKey } from "./sprites";
import type { NPt, ZoneId } from "./zones";

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  sprite: SpriteKey;
  zone: ZoneId;
  start: NPt;
  /** Elevación al flotar (m); 0 = pisa el suelo. */
  floatM: number;
  alpha: number;
  tint?: number;
  personality: Personality;
  /** Saludo la primera vez que ve a Paula. */
  greet: string[];
  /** Comentarios que suelta si Paula anda cerca. */
  ambient: string[];
  /** Conversación al tocarle. */
  talk: string[];
}

export const NPCS: NpcDef[] = [
  {
    id: "basilio",
    name: "Don Basilio",
    role: "Mayordomo difunto",
    sprite: "basilio",
    zone: "vestibulo",
    start: [0.66, 0.8],
    floatM: 0.07,
    alpha: 0.92,
    tint: 0xc9d4e6,
    personality: { restlessness: 0.55, chattiness: 0.8, noticeRadiusM: 2.6, attendRadiusM: 3.4 },
    greet: ["¡Señorita Paula! La casa llevaba trece años esperándola."],
    ambient: [
      "Yo jamás miento… desde que usted entró.",
      "La puerta verde es segura. O era la otra. Las bisagras se confunden.",
      "¿Ha visto usted mi bigote? Me lo atuso cuando pienso. Solo cuando pienso.",
    ],
    talk: [
      "Bienvenida, señorita Paula. Soy Don Basilio, mayordomo de esta casa… y de sus secretos.",
      "La biblioteca está a la izquierda. O a la derecha. A mi edad, las puertas cambian de sitio.",
      "Un consejo: no se fíe de todo lo que brilla. Ni de todo lo que digo.",
    ],
  },
  {
    id: "elvira",
    name: "Doña Elvira",
    role: "Bibliotecaria, 1913",
    sprite: "elvira",
    zone: "biblioteca",
    start: [0.36, 0.84],
    floatM: 0.1,
    alpha: 0.88,
    personality: { restlessness: 0.35, chattiness: 0.5, noticeRadiusM: 2.2, attendRadiusM: 3 },
    greet: ["¿Una visita? Silencio, por favor. Los libros duermen."],
    ambient: [
      "Siete noches, nueve campanadas… nunca olvido una cuenta.",
      "Ese reloj no mide horas. Mide deudas.",
    ],
    talk: [
      "Administré esta casa cuando aún fingía ser respetable.",
      "El reloj guarda algo. Si sabes multiplicar sus pecados y dividir sus culpas, te lo dará.",
    ],
  },
];

export const NPCS_BY_ZONE: Partial<Record<ZoneId, NpcDef[]>> = NPCS.reduce<Partial<Record<ZoneId, NpcDef[]>>>((acc, n) => {
  (acc[n.zone] ??= []).push(n);
  return acc;
}, {});
