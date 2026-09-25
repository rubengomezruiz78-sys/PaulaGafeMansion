import type { GameState } from "./state";

/** Sustituye `{contador}` por su valor en la partida (p. ej. «{recuerdos}/5»). */
export function fill(text: string, s: GameState): string {
  return text.replace(/\{([a-z0-9:-]+)\}/g, (_, name: string) => String(s.counters[name] ?? 0));
}
