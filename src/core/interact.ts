/**
 * Qué pasa al tocar un objeto de la sala (lógica pura).
 *
 * Cada objeto tiene una lista de reacciones en orden de prioridad: lo que
 * depende de la historia va antes que lo genérico. Al examinarlo gana la
 * primera cuya condición se cumple (y, si pide un objeto, Paula lo lleva: así
 * no hay que adivinar qué usar dónde). Al usar a propósito un objeto de la
 * mochila, solo valen las reacciones que piden ese objeto.
 */
import type { Line } from "./dialogue";
import { check, type Cond, type Effect } from "./rules";
import { hasItem, type GameState } from "./state";

export interface PropAction {
  if?: Cond;
  /** Objeto de la mochila que hace falta aquí. */
  use?: string;
  /** Lo que se dice (por defecto habla Paula). */
  lines: Line[];
  effects?: Effect[];
  /** Puzzle que se abre al terminar las frases. */
  puzzle?: string;
}

export function resolveProp(actions: readonly PropAction[], s: GameState, using?: string): PropAction | null {
  if (using) return actions.find((a) => a.use === using && check(a.if, s)) ?? null;
  return actions.find((a) => check(a.if, s) && (!a.use || hasItem(s, a.use))) ?? null;
}
