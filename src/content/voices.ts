/**
 * Voz de cada personaje: cuál de las voces españolas del aparato, con qué tono
 * y a qué velocidad. Aparte del servicio de voz para poder comprobar en los
 * tests que nadie se queda sin la suya.
 *
 * En la tablet, subir el tono por encima de 1 obliga al motor a procesar la
 * frase entera antes de empezar: más del doble de espera (7 s en vez de 3 en
 * una frase corta). Por eso cada uno lleva su propia voz y el tono solo baja.
 * Medidas en la tablet (tono medio): eee 218 Hz, eea 197 Hz y eec 183 Hz son
 * de mujer; eed 120 Hz y eef 109 Hz, de hombre.
 */
export type VoiceCode = "eea" | "eec" | "eed" | "eee" | "eef";

export interface Profile {
  /** Voz española de Google sin conexión (es-es-x-<code>-local). */
  voice: VoiceCode;
  /** Tono: 1 o menos (más de 1 hace esperar en la tablet). */
  pitch: number;
  rate: number;
}

/** Nombre de la voz en el motor de Android. */
export const voiceName = (code: VoiceCode): string => `es-es-x-${code}-local`;

export const PROFILES: Record<string, Profile> = {
  // Niños: la voz más aguda, algo más deprisa.
  paula: { voice: "eee", pitch: 1.0, rate: 1.04 },
  ines: { voice: "eee", pitch: 0.96, rate: 0.94 },
  pepito: { voice: "eee", pitch: 1.0, rate: 1.12 },
  // Gafe y el narrador.
  gafe: { voice: "eea", pitch: 0.94, rate: 0.98 },
  narrador: { voice: "eec", pitch: 1.0, rate: 0.95 },
  // Mujeres.
  elvira: { voice: "eea", pitch: 1.0, rate: 0.92 },
  bruma: { voice: "eec", pitch: 0.92, rate: 0.88 },
  remedios: { voice: "eea", pitch: 1.0, rate: 1.06 },
  clotilde: { voice: "eee", pitch: 0.94, rate: 1.1 },
  florentina: { voice: "eea", pitch: 0.96, rate: 0.94 },
  leocadia: { voice: "eec", pitch: 0.96, rate: 1.0 },
  engracia: { voice: "eec", pitch: 0.92, rate: 0.86 },
  clemencia: { voice: "eea", pitch: 0.92, rate: 1.04 },
  ramona: { voice: "eee", pitch: 0.92, rate: 0.84 },
  aurelia: { voice: "eec", pitch: 0.88, rate: 0.82 },
  rosalia: { voice: "eea", pitch: 1.0, rate: 1.02 },
  // Hombres.
  basilio: { voice: "eef", pitch: 0.9, rate: 0.9 },
  tomas: { voice: "eed", pitch: 0.92, rate: 0.88 },
  baltasar: { voice: "eed", pitch: 1.0, rate: 1.08 },
  anselmo: { voice: "eef", pitch: 1.0, rate: 0.95 },
  nicanor: { voice: "eed", pitch: 0.96, rate: 1.1 },
  serafin: { voice: "eef", pitch: 0.88, rate: 0.84 },
  crispulo: { voice: "eed", pitch: 1.0, rate: 1.05 },
  tadeo: { voice: "eef", pitch: 0.94, rate: 0.95 },
  gumersindo: { voice: "eed", pitch: 0.92, rate: 1.12 },
  anacleto: { voice: "eef", pitch: 0.92, rate: 0.92 },
  casimiro: { voice: "eed", pitch: 0.9, rate: 0.96 },
  fermin: { voice: "eef", pitch: 0.96, rate: 0.9 },
  bartolo: { voice: "eed", pitch: 1.0, rate: 1.14 },
};
