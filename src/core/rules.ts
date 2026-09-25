/**
 * Condiciones y efectos del contenido (lógica pura).
 *
 * El contenido (diálogos, objetos, misiones) no lleva código: describe con
 * datos cuándo algo está disponible (Cond) y qué cambia al ocurrir (Effect).
 * Así el validador puede comprobar cada referencia y el solucionador puede
 * razonar sobre la partida entera.
 */
import { hasFlag, hasItem, npcMemory, type GameState } from "./state";

export type Cmp = ">=" | "<=" | "==" | ">" | "<";

export type Cond =
  | { flag: string }
  | { has: string }
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] }
  | { met: string }
  | { affinity: [npc: string, op: Cmp, value: number] }
  | { quest: [quest: string, op: Cmp, stage: number] }
  | { questDone: string }
  | { visited: string }
  | { examined: string }
  | { counter: [name: string, op: Cmp, value: number] }
  /** El personaje ya le contó a Paula ese nodo de conversación. */
  | { seen: [npc: string, node: string] }
  /** Paula ya eligió esa opción con ese personaje. */
  | { chose: [npc: string, choice: string] }
  /** Hay una marca con ese nombre en la zona donde está Paula (ver `mark`). */
  | { marked: string };

export type Effect =
  | { set: string }
  | { unset: string }
  | { give: string }
  | { take: string }
  | { affinity: [npc: string, delta: number] }
  | { stage: [quest: string, stage: number] }
  | { complete: string }
  | { count: string }
  | { examine: string }
  /** Marca ligada a la zona actual (p. ej. «ya encontré a Pepito aquí»). */
  | { mark: string };

/** Clave del flag de una marca en una zona. */
export const markFlag = (name: string, zone: string): string => `${name}@${zone}`;

/** Aviso para la interfaz de algo que el jugador debe notar. */
export type Notice =
  | { type: "item"; item: string }
  | { type: "itemLost"; item: string }
  | { type: "quest"; quest: string; stage: number }
  | { type: "questDone"; quest: string };

export function compare(a: number, op: Cmp, b: number): boolean {
  switch (op) {
    case ">=": return a >= b;
    case "<=": return a <= b;
    case "==": return a === b;
    case ">": return a > b;
    case "<": return a < b;
  }
}

export function check(cond: Cond | undefined, s: GameState): boolean {
  if (!cond) return true;
  if ("flag" in cond) return hasFlag(s, cond.flag);
  if ("has" in cond) return hasItem(s, cond.has);
  if ("not" in cond) return !check(cond.not, s);
  if ("all" in cond) return cond.all.every((c) => check(c, s));
  if ("any" in cond) return cond.any.some((c) => check(c, s));
  if ("met" in cond) return s.npc[cond.met]?.met === true;
  if ("affinity" in cond) return compare(s.npc[cond.affinity[0]]?.affinity ?? 0, cond.affinity[1], cond.affinity[2]);
  if ("quest" in cond) return compare(s.quests[cond.quest[0]]?.stage ?? 0, cond.quest[1], cond.quest[2]);
  if ("questDone" in cond) return s.quests[cond.questDone]?.done === true;
  if ("visited" in cond) return s.visited.includes(cond.visited);
  if ("examined" in cond) return s.examined.includes(cond.examined);
  if ("counter" in cond) return compare(s.counters[cond.counter[0]] ?? 0, cond.counter[1], cond.counter[2]);
  if ("seen" in cond) return s.npc[cond.seen[0]]?.seen.includes(cond.seen[1]) === true;
  if ("chose" in cond) return s.npc[cond.chose[0]]?.chosen.includes(cond.chose[1]) === true;
  if ("marked" in cond) return hasFlag(s, markFlag(cond.marked, s.zone));
  const never: never = cond;
  throw new Error(`Condición desconocida: ${JSON.stringify(never)}`);
}

/** Aplica efectos sobre el estado (lo modifica) y devuelve los avisos para la interfaz. */
export function apply(effects: readonly Effect[] | undefined, s: GameState): Notice[] {
  const notices: Notice[] = [];
  for (const e of effects ?? []) {
    if ("set" in e) s.flags[e.set] = true;
    else if ("unset" in e) delete s.flags[e.unset];
    else if ("give" in e) {
      if (!s.inventory.includes(e.give)) {
        s.inventory.push(e.give);
        notices.push({ type: "item", item: e.give });
      }
    } else if ("take" in e) {
      const i = s.inventory.indexOf(e.take);
      if (i >= 0) {
        s.inventory.splice(i, 1);
        notices.push({ type: "itemLost", item: e.take });
      }
    } else if ("affinity" in e) {
      const m = npcMemory(s, e.affinity[0]);
      m.affinity = Math.max(-100, Math.min(100, m.affinity + e.affinity[1]));
    } else if ("stage" in e) {
      const [quest, stage] = e.stage;
      const q = (s.quests[quest] ??= { stage: 0, done: false });
      if (stage > q.stage) {
        q.stage = stage;
        notices.push({ type: "quest", quest, stage });
      }
    } else if ("complete" in e) {
      const q = (s.quests[e.complete] ??= { stage: 0, done: false });
      if (!q.done) {
        q.done = true;
        notices.push({ type: "questDone", quest: e.complete });
      }
    } else if ("count" in e) s.counters[e.count] = (s.counters[e.count] ?? 0) + 1;
    else if ("examine" in e) {
      if (!s.examined.includes(e.examine)) s.examined.push(e.examine);
    } else if ("mark" in e) s.flags[markFlag(e.mark, s.zone)] = true;
    else {
      const never: never = e;
      throw new Error(`Efecto desconocido: ${JSON.stringify(never)}`);
    }
  }
  return notices;
}

/** Todas las referencias que contiene una condición (para el validador). */
export function condRefs(cond: Cond | undefined, out: Refs = emptyRefs()): Refs {
  if (!cond) return out;
  if ("flag" in cond) out.flags.add(cond.flag);
  else if ("has" in cond) out.items.add(cond.has);
  else if ("not" in cond) condRefs(cond.not, out);
  else if ("all" in cond) cond.all.forEach((c) => condRefs(c, out));
  else if ("any" in cond) cond.any.forEach((c) => condRefs(c, out));
  else if ("met" in cond) out.npcs.add(cond.met);
  else if ("affinity" in cond) out.npcs.add(cond.affinity[0]);
  else if ("quest" in cond) out.quests.add(cond.quest[0]);
  else if ("questDone" in cond) out.quests.add(cond.questDone);
  else if ("visited" in cond) out.zones.add(cond.visited);
  else if ("examined" in cond) out.props.add(cond.examined);
  else if ("counter" in cond) out.counters.add(cond.counter[0]);
  else if ("seen" in cond) {
    out.npcs.add(cond.seen[0]);
    out.nodes.add(`${cond.seen[0]}:${cond.seen[1]}`);
  } else if ("chose" in cond) {
    out.npcs.add(cond.chose[0]);
    out.choices.add(`${cond.chose[0]}:${cond.chose[1]}`);
  } else if ("marked" in cond) out.marks.add(cond.marked);
  return out;
}

export interface Refs {
  flags: Set<string>;
  items: Set<string>;
  npcs: Set<string>;
  quests: Set<string>;
  zones: Set<string>;
  props: Set<string>;
  marks: Set<string>;
  counters: Set<string>;
  /** «npc:nodo» de condiciones `seen`. */
  nodes: Set<string>;
  /** «npc:opción» de condiciones `chose`. */
  choices: Set<string>;
}

export const emptyRefs = (): Refs => ({
  flags: new Set(), items: new Set(), npcs: new Set(), quests: new Set(), zones: new Set(), props: new Set(), marks: new Set(),
  counters: new Set(), nodes: new Set(), choices: new Set(),
});
