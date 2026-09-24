/**
 * Zonas del mundo. Coordenadas NORMALIZADAS (0..1) sobre el cuadro pintado,
 * que ocupa toda la escena lógica (1920×1080): así son independientes de la
 * resolución. `toPx` las pasa a píxeles de escena.
 *
 * Calibración de perspectiva (método, ver docs/MUNDO_ABIERTO.md):
 *   1. `horizon` = altura a la que fugan las líneas del suelo y estanterías.
 *   2. Cámara a la altura de los ojos de un adulto (1,6–1,7 m) → k = 1 / altura.
 *   3. Verificar con `python tools/calib_preview.py` que los muebles de
 *      referencia (sillas ~1 m, mesas ~0,8 m, puertas >2 m) casan con Paula
 *      y que los ojos de un adulto caen sobre el horizonte.
 */
import { GAME_H, GAME_W } from "../config";
import type { PerspectiveCalib, Pt } from "../core/perspective";
import type { WalkArea } from "../core/navmesh";

export type ZoneId =
  | "vestibulo" | "biblioteca" | "cocina" | "archivo" | "invernadero" | "galeria"
  | "dormitorio" | "observatorio" | "musica" | "desvan" | "tuneles" | "torre";

export type NPt = readonly [number, number];

export interface ExitDef {
  id: string;
  to: ZoneId;
  /** Salida de la zona destino por la que se aparece. */
  toExit: string;
  label: string;
  /** Zona tocable (la puerta) en coordenadas normalizadas. */
  hotspot: readonly NPt[];
  /** Punto del suelo al que camina Paula antes de cruzar (y por donde aparece al llegar). */
  approach: NPt;
}

export interface PropDef {
  id: string;
  label: string;
  hotspot: readonly NPt[];
  /** Dónde se coloca Paula para interactuar. */
  approach: NPt;
}

export interface ZoneDef {
  id: ZoneId;
  name: string;
  image: string;
  perspective: PerspectiveCalib;
  walk: { outer: readonly NPt[]; holes?: readonly (readonly NPt[])[] };
  exits: readonly ExitDef[];
  props: readonly PropDef[];
  /** Puntos de interés para que los NPC deambulen con sentido. */
  poi: readonly NPt[];
  spawn: NPt;
  /** Tinte multiplicativo de los personajes para casar con la luz del cuadro. */
  actorTint?: number;
}

export const toPx = ([x, y]: NPt): Pt => ({ x: x * GAME_W, y: y * GAME_H });
export const polyPx = (poly: readonly NPt[]): Pt[] => poly.map(toPx);
export const walkAreaPx = (zone: ZoneDef): WalkArea => ({
  outer: polyPx(zone.walk.outer),
  holes: (zone.walk.holes ?? []).map(polyPx),
});

export const ZONES: Partial<Record<ZoneId, ZoneDef>> = {
  vestibulo: {
    id: "vestibulo",
    name: "Vestíbulo de los ausentes",
    image: "world/vestibulo.webp",
    // Cámara a 1,70 m (ojos de adulto: los de Basilio caen en el horizonte).
    // Verificado: silla roja 1,05 m, consola 0,80 m, puerta verde 2,75 m.
    perspective: { horizon: 0.469, k: 0.587, focal: 1.0 },
    walk: {
      outer: [
        [0.005, 0.995], [0.005, 0.878], [0.118, 0.866], [0.118, 0.748], [0.168, 0.702],
        [0.272, 0.692], [0.3, 0.66], [0.345, 0.66], [0.378, 0.676], [0.575, 0.676],
        [0.598, 0.672], [0.642, 0.684], [0.682, 0.694], [0.832, 0.704], [0.842, 0.752],
        [0.962, 0.757], [0.995, 0.772], [0.995, 0.995],
      ],
    },
    exits: [
      {
        id: "puerta-biblioteca", to: "biblioteca", toExit: "puerta-vestibulo", label: "Biblioteca",
        hotspot: [[0.06, 0.33], [0.165, 0.33], [0.165, 0.7], [0.06, 0.7]], approach: [0.16, 0.725],
      },
      {
        id: "puerta-servicio", to: "cocina", toExit: "puerta-vestibulo", label: "Puerta de servicio",
        hotspot: [[0.835, 0.3], [0.958, 0.3], [0.958, 0.748], [0.835, 0.748]], approach: [0.9, 0.772],
      },
      {
        id: "escalera", to: "galeria", toExit: "escalera", label: "Subir la escalera",
        hotspot: [[0.39, 0.4], [0.56, 0.4], [0.575, 0.672], [0.378, 0.672]], approach: [0.475, 0.69],
      },
      {
        id: "arco-sotano", to: "archivo", toExit: "arco-vestibulo", label: "Arco del sótano",
        hotspot: [[0.28, 0.45], [0.35, 0.45], [0.35, 0.655], [0.28, 0.655]], approach: [0.322, 0.672],
      },
    ],
    props: [
      { id: "retrato-aurelia", label: "Retrato de Aurelia", hotspot: [[0.72, 0.16], [0.795, 0.16], [0.795, 0.5], [0.72, 0.5]], approach: [0.76, 0.72] },
      { id: "carta-mojada", label: "Media carta mojada", hotspot: [[0.795, 0.9], [0.86, 0.9], [0.86, 0.97], [0.795, 0.97]], approach: [0.8, 0.92] },
      { id: "campanilla", label: "Campanilla", hotspot: [[0.74, 0.88], [0.78, 0.88], [0.78, 0.94], [0.74, 0.94]], approach: [0.72, 0.92] },
      { id: "baul-ines", label: "Baúl de Inés", hotspot: [[0.575, 0.585], [0.625, 0.585], [0.625, 0.655], [0.575, 0.655]], approach: [0.6, 0.69] },
      { id: "paraguero", label: "Paragüero", hotspot: [[0.675, 0.595], [0.705, 0.595], [0.705, 0.68], [0.675, 0.68]], approach: [0.69, 0.705] },
    ],
    poi: [[0.25, 0.82], [0.47, 0.74], [0.62, 0.8], [0.8, 0.78], [0.55, 0.9], [0.35, 0.95]],
    spawn: [0.5, 0.9],
    actorTint: 0xc9c5c6,
  },

  biblioteca: {
    id: "biblioteca",
    name: "Biblioteca del marqués",
    image: "world/biblioteca.webp",
    // Cámara a 1,60 m (los ojos de Elvira caen en el horizonte). Verificado:
    // escritorio ≈ 0,9 m, reloj ≈ 3,2 m.
    perspective: { horizon: 0.48, k: 0.625, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 0.995], [0.0, 0.957], [0.228, 0.936], [0.238, 0.8], [0.29, 0.748],
        [0.468, 0.738], [0.515, 0.8], [0.53, 0.876], [0.662, 0.905], [0.682, 0.975],
        [0.8, 0.995],
      ],
    },
    exits: [
      {
        id: "puerta-vestibulo", to: "vestibulo", toExit: "puerta-biblioteca", label: "Vestíbulo",
        hotspot: [[0.0, 0.93], [0.11, 0.93], [0.11, 1.0], [0.0, 1.0]], approach: [0.07, 0.968],
      },
      {
        id: "arco-musica", to: "musica", toExit: "arco-biblioteca", label: "Salón de música",
        hotspot: [[0.4, 0.3], [0.465, 0.3], [0.465, 0.735], [0.4, 0.735]], approach: [0.43, 0.75],
      },
    ],
    props: [
      { id: "reloj-aritmetico", label: "Reloj aritmético", hotspot: [[0.53, 0.1], [0.7, 0.1], [0.7, 0.87], [0.53, 0.87]], approach: [0.6, 0.9] },
      { id: "libro-abierto", label: "Libro abierto", hotspot: [[0.12, 0.6], [0.2, 0.6], [0.2, 0.68], [0.12, 0.68]], approach: [0.25, 0.94] },
    ],
    poi: [[0.35, 0.8], [0.45, 0.9], [0.3, 0.97], [0.6, 0.93]],
    spawn: [0.35, 0.9],
    actorTint: 0xd4c2ad,
  },
};

export const zone = (id: ZoneId): ZoneDef => {
  const z = ZONES[id];
  if (!z) throw new Error(`Zona sin definir: ${id}`);
  return z;
};
