/**
 * Ambiente de cada sala: cuánto se oye la lluvia, el goteo y el viento, si
 * por sus ventanas entran los relámpagos, y el tono de los pasos (madera,
 * alfombra, piedra). Tras el final deja de llover.
 */
import type { Ambience } from "../audio/sound";

export interface ZoneAmbience extends Ambience {
  lightning: boolean;
  /** Tono de los pasos: <1 más sordo (alfombra/tierra), >1 más seco (piedra). */
  floor: number;
}

export const AMBIENCE: Record<string, ZoneAmbience> = {
  vestibulo: { rain: 0.5, drip: 0, wind: 0.1, lightning: true, floor: 1.1 },
  biblioteca: { rain: 0.4, drip: 0, wind: 0, lightning: true, floor: 0.8, tick: 0.7 },
  musica: { rain: 0.45, drip: 0, wind: 0, lightning: true, floor: 0.9 },
  invernadero: { rain: 0.9, drip: 0.3, wind: 0.1, lightning: true, floor: 1.2, water: 0.45, crickets: 1 },
  cocina: { rain: 0.3, drip: 0.25, wind: 0, lightning: true, floor: 1.3, hiss: 0.9 },
  archivo: { rain: 0.1, drip: 0.45, wind: 0, lightning: false, floor: 1.3 },
  tuneles: { rain: 0.05, drip: 1, wind: 0.15, lightning: false, floor: 1.4, water: 1 },
  galeria: { rain: 0.4, drip: 0, wind: 0.05, lightning: true, floor: 1 },
  dormitorio: { rain: 0.5, drip: 0, wind: 0, lightning: true, floor: 0.75 },
  desvan: { rain: 0.7, drip: 0.2, wind: 0.6, lightning: true, floor: 0.85 },
  observatorio: { rain: 0.6, drip: 0, wind: 0.5, lightning: true, floor: 1.1 },
  torre: { rain: 0.8, drip: 0, wind: 0.9, lightning: true, floor: 1.2, tick: 1 },
  baile: { rain: 0.45, drip: 0, wind: 0.05, lightning: true, floor: 0.95 },
  comedor: { rain: 0.3, drip: 0, wind: 0, lightning: true, floor: 1.1, hiss: 0.25 },
  jardin: { rain: 1, drip: 0.4, wind: 0.5, lightning: true, floor: 1.35, water: 0.5, crickets: 1 },
  taller: { rain: 0.35, drip: 0, wind: 0.1, lightning: false, floor: 0.85, tick: 1 },
  estudio: { rain: 0.8, drip: 0.15, wind: 0.2, lightning: true, floor: 0.85 },
  teatro: { rain: 0.2, drip: 0, wind: 0, lightning: false, floor: 1.05 },
};

export function ambienceFor(zone: string, afterEnding: boolean): ZoneAmbience {
  const a = AMBIENCE[zone] ?? { rain: 0.4, drip: 0, wind: 0, lightning: true, floor: 1 };
  return afterEnding ? { ...a, rain: 0, wind: a.wind * 0.3, lightning: false, crickets: 1 } : a;
}
