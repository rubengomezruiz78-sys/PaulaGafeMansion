/**
 * Voz de cada personaje (tono y velocidad del motor de voz del aparato).
 * Aparte del servicio de voz para poder comprobar en los tests que nadie se
 * queda sin la suya.
 */
export interface Profile {
  pitch: number;
  rate: number;
}

/** Cómo suena cada uno (tono y velocidad sobre la misma voz española). */
export const PROFILES: Record<string, Profile> = {
  paula: { pitch: 1.35, rate: 1.02 },
  gafe: { pitch: 1.0, rate: 0.98 },
  narrador: { pitch: 1.0, rate: 0.95 },
  basilio: { pitch: 0.7, rate: 0.9 },
  elvira: { pitch: 1.05, rate: 0.9 },
  tomas: { pitch: 0.78, rate: 0.88 },
  ines: { pitch: 1.5, rate: 0.9 },
  bruma: { pitch: 0.95, rate: 0.88 },
  baltasar: { pitch: 0.85, rate: 1.08 },
  remedios: { pitch: 1.12, rate: 1.06 },
  anselmo: { pitch: 0.8, rate: 0.95 },
  clotilde: { pitch: 1.2, rate: 1.12 },
  pepito: { pitch: 1.6, rate: 1.15 },
  florentina: { pitch: 1.25, rate: 0.92 },
  nicanor: { pitch: 0.92, rate: 1.1 },
  leocadia: { pitch: 0.98, rate: 1.0 },
  serafin: { pitch: 0.85, rate: 0.78 },
  crispulo: { pitch: 1.02, rate: 1.05 },
  tadeo: { pitch: 0.82, rate: 0.95 },
  engracia: { pitch: 1.08, rate: 0.85 },
  gumersindo: { pitch: 0.95, rate: 1.12 },
  anacleto: { pitch: 0.75, rate: 0.92 },
  clemencia: { pitch: 1.15, rate: 1.04 },
  casimiro: { pitch: 0.9, rate: 0.96 },
  fermin: { pitch: 0.88, rate: 0.9 },
  bartolo: { pitch: 1.05, rate: 1.14 },
  ramona: { pitch: 1.3, rate: 0.84 },
};
