/**
 * Estado de la partida (lógica pura) y guardado versionado.
 *
 * Todo lo que el juego recuerda vive aquí: flags de historia, objetos, lo que
 * cada personaje sabe de Paula (afinidad, conversaciones vistas), misiones,
 * zonas visitadas y el reloj de la noche. La carga es defensiva: un guardado
 * corrupto o de otra versión nunca rompe el juego, se repara o se descarta.
 */

export const SAVE_VERSION = 1;

export interface NpcMemory {
  /** -100..100: cómo le cae Paula. Sube ayudando y charlando con respeto. */
  affinity: number;
  met: boolean;
  /** Nodos de diálogo ya vistos (para no repetir y para recordar). */
  seen: string[];
  /** Opciones ya elegidas (las de una sola vez desaparecen). */
  chosen: string[];
}

export interface QuestProgress {
  stage: number;
  done: boolean;
}

export interface GameState {
  v: number;
  zone: string;
  flags: Record<string, true>;
  counters: Record<string, number>;
  inventory: string[];
  npc: Record<string, NpcMemory>;
  quests: Record<string, QuestProgress>;
  visited: string[];
  examined: string[];
  /** Segundos de juego transcurridos (reloj ambiental, nunca es un límite). */
  clock: number;
}

export function newGame(startZone = "vestibulo"): GameState {
  return {
    v: SAVE_VERSION,
    zone: startZone,
    flags: {},
    counters: {},
    inventory: [],
    npc: {},
    quests: {},
    visited: [startZone],
    examined: [],
    clock: 0,
  };
}

export function npcMemory(state: GameState, npcId: string): NpcMemory {
  const existing = state.npc[npcId];
  if (existing) return existing;
  const fresh: NpcMemory = { affinity: 0, met: false, seen: [], chosen: [] };
  state.npc[npcId] = fresh;
  return fresh;
}

export const hasItem = (s: GameState, item: string): boolean => s.inventory.includes(item);
export const hasFlag = (s: GameState, flag: string): boolean => s.flags[flag] === true;

// ------------------------------------------------------------- guardado

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : []);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Reconstruye un estado válido a partir de cualquier cosa. Descarta campos
 * basura, repara tipos y limita valores. `knownZones` evita cargar en una zona
 * que ya no existe.
 */
export function deserialize(raw: string | null, knownZones: readonly string[]): GameState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data)) return null;
  const base = newGame(knownZones[0]);
  const zone = typeof data.zone === "string" && knownZones.includes(data.zone) ? data.zone : base.zone;

  const flags: Record<string, true> = {};
  if (isRecord(data.flags)) for (const [k, v] of Object.entries(data.flags)) if (v === true) flags[k] = true;

  const counters: Record<string, number> = {};
  if (isRecord(data.counters)) for (const [k, v] of Object.entries(data.counters)) counters[k] = num(v, 0, 0, 1e6);

  const npc: Record<string, NpcMemory> = {};
  if (isRecord(data.npc)) {
    for (const [id, m] of Object.entries(data.npc)) {
      if (!isRecord(m)) continue;
      npc[id] = { affinity: num(m.affinity, 0, -100, 100), met: m.met === true, seen: strings(m.seen), chosen: strings(m.chosen) };
    }
  }

  const quests: Record<string, QuestProgress> = {};
  if (isRecord(data.quests)) {
    for (const [id, q] of Object.entries(data.quests)) {
      if (!isRecord(q)) continue;
      quests[id] = { stage: Math.round(num(q.stage, 0, 0, 999)), done: q.done === true };
    }
  }

  const visited = strings(data.visited).filter((z) => knownZones.includes(z));
  return {
    v: SAVE_VERSION,
    zone,
    flags,
    counters,
    inventory: strings(data.inventory),
    npc,
    quests,
    visited: visited.includes(zone) ? visited : [...visited, zone],
    examined: strings(data.examined),
    clock: num(data.clock, 0, 0, 1e9),
  };
}
