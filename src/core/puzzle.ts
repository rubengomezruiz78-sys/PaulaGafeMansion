/**
 * Puzzles de la casa (lógica pura): cuentas con teclado numérico o elegir
 * una respuesta entre varias. Pensados para una niña de 9 años: nunca se
 * pierde nada por fallar, cada paso tiene su pista y el progreso se guarda
 * (si Paula sale a mitad, vuelve al paso en que estaba).
 */
import { apply, check, type Cond, type Effect, type Notice } from "./rules";
import type { GameState } from "./state";

export type PuzzleStep =
  | { kind: "number"; prompt: string; answer: number; hint: string }
  | { kind: "choice"; prompt: string; options: string[]; answer: number; hint: string };

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
    if (value !== this.step.answer) {
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
