/**
 * Solucionador (F11): juega la partida entera sin interfaz, como lo haría una
 * niña muy curiosa que lo toca todo y habla con todos, y comprueba que se
 * llega al final. Si algún día un cambio de contenido deja la historia
 * bloqueada, el test que lo usa falla y dice qué faltó.
 *
 * Es un punto fijo voraz: en cada vuelta recorre las zonas alcanzables,
 * examina cada objeto (resolviendo sus puzzles), habla con cada personaje
 * que puede estar allí probando todas sus opciones, escucha las charlas
 * posibles y cruza las salidas abiertas; para cuando nada cambia.
 */
import { heardFlag } from "../core/chat";
import { DialogueRunner } from "../core/dialogue";
import { resolveProp } from "../core/interact";
import { expectedAnswer, PuzzleRun } from "../core/puzzle";
import { apply, check } from "../core/rules";
import { newGame, type GameState } from "../core/state";
import { CHATS } from "./chats";
import { DIALOGUES } from "./dialogues";
import { NPCS } from "./npcs";
import { PROPS } from "./props";
import { PUZZLES } from "./puzzles";
import { ZONES, type ZoneDef } from "./zones";

export interface SolveOptions {
  /** Escuchar charlas entre personajes (si no, se demuestra que no hacen falta). */
  chats?: boolean;
  /** Personajes con los que no se habla nunca. */
  ignoreNpcs?: string[];
  maxRounds?: number;
}

export interface SolveResult {
  finished: boolean;
  state: GameState;
  /** Lo que hizo avanzar la partida, en orden. */
  log: string[];
  rounds: number;
}

const snapshot = (s: GameState): string => JSON.stringify({ ...s, clock: 0 });

export function solveGame(opts: SolveOptions = {}): SolveResult {
  const s = newGame("vestibulo");
  const log: string[] = [];
  const zones = Object.values(ZONES).filter((z): z is ZoneDef => !!z);
  const where = new Map(NPCS.map((n) => [n.id, new Set([n.routine.home, ...n.routine.stations.map((st) => st.zone)])]));
  const ignore = new Set(opts.ignoreNpcs ?? []);
  const maxRounds = opts.maxRounds ?? 60;

  const track = (what: string, fn: () => void) => {
    const before = snapshot(s);
    fn();
    if (snapshot(s) !== before) log.push(what);
  };

  let rounds = 0;
  for (; rounds < maxRounds && !s.flags.final; rounds += 1) {
    const start = snapshot(s);
    for (const zone of reachableZones(s, zones, log)) {
      s.zone = zone.id;
      for (const prop of zone.props) {
        track(`${zone.id}: examinar ${prop.id}`, () => {
          const action = resolveProp(PROPS[prop.id] ?? [], s);
          if (!action) return;
          apply(action.effects, s);
          apply([{ examine: prop.id }], s);
          if (action.puzzle) solvePuzzle(action.puzzle, s);
        });
      }
      for (const npc of NPCS) {
        if (ignore.has(npc.id) || !where.get(npc.id)?.has(zone.id)) continue;
        track(`${zone.id}: hablar con ${npc.id}`, () => talkThrough(npc.id, s));
      }
      if (opts.chats !== false) {
        for (const chat of CHATS) {
          if (chat.repeatable || s.flags[heardFlag(chat.id)]) continue;
          if (!chat.between.every((id) => !ignore.has(id) && where.get(id)?.has(zone.id)) || !check(chat.if, s)) continue;
          track(`${zone.id}: oír la charla ${chat.id}`, () => {
            s.flags[heardFlag(chat.id)] = true;
            apply(chat.effects, s);
          });
        }
      }
    }
    if (snapshot(s) === start) break;
  }
  return { finished: s.flags.final === true, state: s, log, rounds };
}

/** Zonas a las que se puede llegar ahora, cruzando (y aplicando) las salidas abiertas. */
function reachableZones(s: GameState, zones: ZoneDef[], log: string[]): ZoneDef[] {
  const byId = new Map<string, ZoneDef>(zones.map((z) => [z.id, z]));
  const seen = new Set<string>(["vestibulo"]);
  const queue = ["vestibulo"];
  while (queue.length) {
    const z = byId.get(queue.shift()!);
    if (!z) continue;
    for (const exit of z.exits) {
      if (!check(exit.requires, s)) continue;
      if (exit.onUse?.length) {
        const before = snapshot(s);
        apply(exit.onUse, s);
        if (snapshot(s) !== before) log.push(`${z.id}: cruzar ${exit.id}`);
      }
      if (!s.visited.includes(exit.to)) s.visited.push(exit.to);
      if (!seen.has(exit.to)) {
        seen.add(exit.to);
        queue.push(exit.to);
      }
    }
  }
  return zones.filter((z) => seen.has(z.id));
}

/** Habla con alguien probando cada opción una vez por conversación. */
export function talkThrough(npc: string, s: GameState): void {
  const tree = DIALOGUES[npc];
  if (!tree) return;
  const runner = new DialogueRunner(tree, s);
  const tried = new Set<string>();
  let step = runner.start();
  for (let guard = 0; step && guard < 200; guard += 1) {
    const next = step.choices.find((c) => c.id !== "adios" && !tried.has(c.id));
    if (!next) return;
    tried.add(next.id);
    step = runner.choose(next.id);
  }
}

function solvePuzzle(id: string, s: GameState): void {
  const def = PUZZLES[id];
  if (!def) throw new Error(`Puzzle inexistente: ${id}`);
  const run = new PuzzleRun(def, s);
  for (let i = 0; i < def.steps.length + 1 && !run.solved; i += 1) {
    const r = run.answer(expectedAnswer(run.step));
    if (!r.correct) throw new Error(`La respuesta guardada del puzzle ${id} no es correcta`);
  }
}
