/**
 * Puzzles de la casa (lógica pura): cuentas con teclado numérico o elegir
 * una respuesta entre varias. Pensados para una niña de 9 años: nunca se
 * pierde nada por fallar, cada paso tiene su pista y el progreso se guarda
 * (si Paula sale a mitad, vuelve al paso en que estaba).
 */
import { apply, check, type Cond, type Effect, type Notice } from "./rules";
import type { GameState } from "./state";

/** Las siete notas del piano de la casa (índice 0 = do). */
export const NOTES = ["do", "re", "mi", "fa", "sol", "la", "si"] as const;

export interface Paint {
  name: string;
  color: number;
}

export type PuzzleStep =
  | { kind: "number"; prompt: string; answer: number; hint: string }
  | { kind: "choice"; prompt: string; options: string[]; answer: number; hint: string }
  /** Escuchar una melodía y repetirla en el teclado del piano (0 = do … 6 = si). */
  | { kind: "melody"; prompt: string; notes: number[]; hint: string }
  /** Tocar las tarjetas en su orden. `items` ya viene ordenado; se enseñan barajadas. */
  | { kind: "order"; prompt: string; items: string[]; hint: string }
  /** Levantar cartas de dos en dos hasta encontrar todas las parejas. */
  | { kind: "pairs"; prompt: string; icons: string[]; hint: string }
  /** Llevar la luz por el laberinto: «#» seto, «S» salida, «E» meta, «.» camino. */
  | { kind: "maze"; prompt: string; grid: string[]; hint: string }
  /** Mezclar dos pinturas para conseguir el color pedido (`answer`: las dos). */
  | { kind: "mix"; prompt: string; target: Paint; paints: Paint[]; answer: [number, number]; hint: string };

export type PuzzleKind = PuzzleStep["kind"];

/** Los pasos que son un juego (tablero grande) en vez de una cuenta. */
export const isGameStep = (s: PuzzleStep): boolean => !(s.kind === "number" || s.kind === "choice");

/** Una secuencia de índices (0..8) como número: [0, 2, 4] → 135. */
export const encodeSeq = (seq: readonly number[]): number => Number(seq.map((n) => n + 1).join("") || "0");
/** Dos pinturas, sin importar el orden: (2, 0) → 13. */
export const encodeMix = (a: number, b: number): number => encodeSeq([Math.min(a, b), Math.max(a, b)]);

/** Lo que hay que responder en un paso, sea del tipo que sea (un número). */
export function expectedAnswer(step: PuzzleStep): number {
  switch (step.kind) {
    case "number":
    case "choice":
      return step.answer;
    case "melody":
      return encodeSeq(step.notes);
    case "order":
      return encodeSeq(step.items.map((_, i) => i));
    case "pairs":
      return step.icons.length;
    case "maze":
      return 1;
    case "mix":
      return encodeMix(step.answer[0], step.answer[1]);
  }
}

export interface MazeCell {
  r: number;
  c: number;
}

/** Casilla de un símbolo del laberinto. */
export function mazeFind(grid: readonly string[], ch: string): MazeCell | null {
  for (let r = 0; r < grid.length; r += 1) {
    const c = grid[r].indexOf(ch);
    if (c >= 0) return { r, c };
  }
  return null;
}

export const mazeOpen = (grid: readonly string[], r: number, c: number): boolean =>
  r >= 0 && r < grid.length && c >= 0 && c < grid[r].length && grid[r][c] !== "#";

/** Camino más corto de la salida a la meta (o null si no hay). */
export function mazePath(grid: readonly string[]): MazeCell[] | null {
  const start = mazeFind(grid, "S");
  const end = mazeFind(grid, "E");
  if (!start || !end) return null;
  const key = (p: MazeCell) => `${p.r},${p.c}`;
  const prev = new Map<string, MazeCell | null>([[key(start), null]]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift()!;
    if (p.r === end.r && p.c === end.c) {
      const path: MazeCell[] = [];
      for (let q: MazeCell | null = p; q; q = prev.get(key(q)) ?? null) path.unshift(q);
      return path;
    }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { r: p.r + dr, c: p.c + dc };
      if (mazeOpen(grid, n.r, n.c) && !prev.has(key(n))) {
        prev.set(key(n), p);
        queue.push(n);
      }
    }
  }
  return null;
}

export interface PuzzleDef {
  id: string;
  title: string;
  /** Por qué Paula tiene que resolverlo (se ve arriba del todo). */
  story: string;
  steps: PuzzleStep[];
  /** Cosas que Paula recuerda y ayudan (lo que oyó, lo que leyó). */
  clues?: { if: Cond; text: string }[];
  reward: Effect[];
}

export const solvedFlag = (id: string): string => `resuelto:${id}`;
export const progressKey = (id: string): string => `puzzle:${id}`;
/** Respuestas de más de 4 cifras no caben en el teclado ni hacen falta. */
export const MAX_DIGITS = 4;

export interface AnswerResult {
  correct: boolean;
  /** true si con esta respuesta se resolvió el puzzle entero. */
  solved: boolean;
  notices: Notice[];
}

export class PuzzleRun {
  mistakes = 0;

  constructor(readonly def: PuzzleDef, private readonly state: GameState) {
    if (!def.steps.length) throw new Error(`Puzzle sin pasos: ${def.id}`);
  }

  get solved(): boolean {
    return this.state.flags[solvedFlag(this.def.id)] === true;
  }

  get index(): number {
    return Math.min(this.def.steps.length - 1, Math.max(0, this.state.counters[progressKey(this.def.id)] ?? 0));
  }

  get step(): PuzzleStep {
    return this.def.steps[this.index];
  }

  get total(): number {
    return this.def.steps.length;
  }

  /** Pistas de la historia que Paula ya conoce. */
  clues(): string[] {
    return (this.def.clues ?? []).filter((c) => check(c.if, this.state)).map((c) => c.text);
  }

  /** Respuesta: número (teclado) o índice de la opción elegida. */
  answer(value: number): AnswerResult {
    if (this.solved) return { correct: true, solved: true, notices: [] };
    if (value !== expectedAnswer(this.step)) {
      this.mistakes += 1;
      return { correct: false, solved: false, notices: [] };
    }
    this.mistakes = 0;
    const next = this.index + 1;
    if (next < this.def.steps.length) {
      this.state.counters[progressKey(this.def.id)] = next;
      return { correct: true, solved: false, notices: [] };
    }
    delete this.state.counters[progressKey(this.def.id)];
    this.state.flags[solvedFlag(this.def.id)] = true;
    return { correct: true, solved: true, notices: apply(this.def.reward, this.state) };
  }
}
