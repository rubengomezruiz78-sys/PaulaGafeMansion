/**
 * Zonas del mundo. Coordenadas NORMALIZADAS (0..1) sobre el cuadro pintado,
 * que ocupa toda la escena lógica (1920×1080): así son independientes de la
 * resolución. `toPx` las pasa a píxeles de escena.
 *
 * Calibración de perspectiva (método, ver docs/MUNDO_ABIERTO.md):
 *   1. `horizon` = altura a la que fugan las líneas del suelo y estanterías.
 *   2. Primera aproximación: cámara a ojos de adulto (1,6–1,7 m) → k = 1/altura.
 *   3. Si los muebles no casan (cuadros pintados desde más abajo o más arriba),
 *      resolver `horizon` y `k` con DOS referencias de altura conocida, una
 *      cerca y otra lejos: ppm(y) = k·(y − horizonte) en ambas.
 *   4. Verificar con `python tools/calib_batch.py` (Paula y un adulto junto a
 *      sillas ~1 m, mesas ~0,8 m, puertas >2 m).
 */
import { GAME_H, GAME_W } from "../config";
import type { PerspectiveCalib, Pt } from "../core/perspective";
import type { WalkArea } from "../core/navmesh";
import type { Cond } from "../core/rules";
import { PLANTA_ALTA } from "./zones/plantaAlta";
import { PLANTA_BAJA } from "./zones/plantaBaja";
import { SOTANO } from "./zones/sotano";

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
  /** Condición para poder cruzar (sin ella, la salida está bloqueada por la historia). */
  requires?: Cond;
  /** Lo que dice Paula si está bloqueada. */
  lockedText?: string;
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

export const ZONES: Partial<Record<ZoneId, ZoneDef>> = { ...PLANTA_BAJA, ...SOTANO, ...PLANTA_ALTA };

export const zone = (id: ZoneId): ZoneDef => {
  const z = ZONES[id];
  if (!z) throw new Error(`Zona sin definir: ${id}`);
  return z;
};

/** Enlaces del grafo del mapa (para la simulación del mundo). */
export const zoneLinks = (): { from: string; exitId: string; to: string; toExit: string }[] =>
  (Object.values(ZONES) as ZoneDef[]).flatMap((z) => z.exits.map((e) => ({ from: z.id, exitId: e.id, to: e.to, toExit: e.toExit })));
