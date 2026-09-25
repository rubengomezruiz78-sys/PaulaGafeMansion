/**
 * Partida en curso: un único estado compartido por las escenas, con guardado
 * automático en el dispositivo (sin internet). Si el almacenamiento falla, el
 * juego sigue funcionando en memoria.
 */
import { deserialize, newGame, serialize, type GameState } from "../core/state";
import { ZONES } from "../content/zones";

const SAVE_KEY = "paula-gafe-v2";

const knownZones = (): string[] => Object.keys(ZONES);

function load(): GameState {
  try {
    const restored = deserialize(localStorage.getItem(SAVE_KEY), knownZones());
    if (restored) return restored;
  } catch {
    /* sin almacenamiento: partida nueva en memoria */
  }
  return newGame();
}

let state: GameState = load();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const session = {
  get state(): GameState {
    return state;
  },

  /** Guarda en breve (agrupa cambios seguidos en una sola escritura). */
  save(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      try {
        localStorage.setItem(SAVE_KEY, serialize(state));
      } catch {
        /* almacenamiento lleno o bloqueado: se sigue en memoria */
      }
    }, 250);
  },

  enterZone(zone: string): void {
    state.zone = zone;
    if (!state.visited.includes(zone)) state.visited.push(zone);
    this.save();
  },

  /** Hay algo que merezca «Continuar» (si no, la portada solo ofrece empezar). */
  hasProgress(): boolean {
    return state.visited.length > 1 || state.inventory.length > 0 || state.examined.length > 0 || Object.keys(state.npc).length > 0;
  },

  reset(): void {
    state = newGame();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* nada que borrar */
    }
  },
};
