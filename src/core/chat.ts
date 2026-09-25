/**
 * Charlas entre personajes que Paula puede escuchar (lógica pura).
 *
 * Cuando dos personajes coinciden libres en la zona de Paula, el director
 * elige una charla adecuada. Las de historia suenan una vez y, si Paula las
 * oye, quedan en la memoria (`oido:<id>`) y aplican sus efectos (pistas que
 * desbloquean preguntas nuevas). Las de ambiente pueden repetirse de vez en
 * cuando para que la casa parezca viva.
 */
import { check, type Cond, type Effect } from "./rules";
import type { Rng } from "./rng";
import type { GameState } from "./state";

export interface ChatDef {
  id: string;
  between: [string, string];
  if?: Cond;
  /** Charla de ambiente: puede volver a sonar (no deja pista). */
  repeatable?: boolean;
  /** [quién, qué dice] en orden. */
  lines: [string, string][];
  /** Se aplican si Paula la oye entera. */
  effects?: Effect[];
}

export const heardFlag = (chatId: string) => `oido:${chatId}`;

/** Pausa mínima entre charlas en una misma zona (s). */
export const CHAT_GAP = 22;

export class ChatDirector {
  private readonly lastPlayed = new Map<string, number>();

  constructor(private readonly chats: readonly ChatDef[], private readonly rng: Rng) {}

  /**
   * Charla a empezar entre los personajes libres presentes, o null.
   * Prioriza las de historia no oídas; las de ambiente, como mucho una vez
   * cada 3 minutos cada una.
   */
  pick(idle: readonly string[], state: GameState, now: number, lastChatAt: number): ChatDef | null {
    if (now - lastChatAt < CHAT_GAP) return null;
    const here = new Set(idle);
    const possible = this.chats.filter((c) =>
      here.has(c.between[0]) && here.has(c.between[1]) && check(c.if, state) &&
      (c.repeatable ? now - (this.lastPlayed.get(c.id) ?? -Infinity) > 180 : !state.flags[heardFlag(c.id)]),
    );
    if (!possible.length) return null;
    const story = possible.filter((c) => !c.repeatable);
    const chosen = story.length ? story[0] : this.rng.pick(possible);
    this.lastPlayed.set(chosen.id, now);
    return chosen;
  }
}
