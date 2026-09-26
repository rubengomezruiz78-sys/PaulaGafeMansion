/**
 * Validador de contenido (F11): recorre diálogos, charlas, objetos, puzzles,
 * pistas, misiones y salidas, y comprueba que cada referencia existe y que
 * todo lo que se pide en una condición se puede conseguir en algún sitio.
 * Devuelve la lista de problemas (vacía = contenido sano).
 */
import { heardFlag } from "../core/chat";
import type { DialogueTree } from "../core/dialogue";
import { MAX_DIGITS, mazePath, NOTES, solvedFlag } from "../core/puzzle";
import { condRefs, emptyRefs, type Cond, type Effect, type Refs } from "../core/rules";
import { CHATS } from "./chats";
import { DIALOGUES } from "./dialogues";
import { GAFE_HINTS } from "./hints";
import { ITEMS } from "./items";
import { NPCS } from "./npcs";
import { PROPS } from "./props";
import { PUZZLES } from "./puzzles";
import { MAIN_GOALS, QUESTS } from "./quests";
import { ZONES, type ZoneDef } from "./zones";

interface Produced {
  flags: Set<string>;
  items: Set<string>;
  counters: Set<string>;
  marks: Set<string>;
  quests: Set<string>;
}

const PLACEHOLDER = /\{([a-z0-9:-]+)\}/g;

export function validateContent(): string[] {
  const errors: string[] = [];
  const refs = emptyRefs();
  const produced: Produced = { flags: new Set(), items: new Set(), counters: new Set(), marks: new Set(), quests: new Set() };
  const texts: { where: string; text: string }[] = [];
  const zones = Object.values(ZONES).filter((z): z is ZoneDef => !!z);
  const npcIds = new Set(NPCS.map((n) => n.id));
  const zoneIds = new Set(zones.map((z) => z.id));

  const cond = (c: Cond | undefined) => condRefs(c, refs);
  const effects = (list: readonly Effect[] | undefined, where: string) => {
    for (const e of list ?? []) {
      if ("set" in e) produced.flags.add(e.set);
      else if ("give" in e) produced.items.add(e.give);
      else if ("take" in e) refs.items.add(e.take);
      else if ("count" in e) produced.counters.add(e.count);
      else if ("mark" in e) produced.marks.add(e.mark);
      else if ("stage" in e) {
        refs.quests.add(e.stage[0]);
        produced.quests.add(e.stage[0]);
      } else if ("complete" in e) refs.quests.add(e.complete);
      else if ("affinity" in e) refs.npcs.add(e.affinity[0]);
      else if ("examine" in e) refs.props.add(e.examine);
      else if ("unset" in e) refs.flags.add(e.unset);
      if ("give" in e && !ITEMS[e.give]) errors.push(`${where}: da un objeto inexistente «${e.give}»`);
    }
  };

  // Diálogos.
  for (const [id, tree] of Object.entries(DIALOGUES)) {
    if (tree.npc !== id) errors.push(`diálogo ${id}: su npc es «${tree.npc}»`);
    if (!npcIds.has(id)) errors.push(`diálogo ${id}: no hay personaje con ese id`);
    validateTree(tree, errors);
    for (const e of tree.entries) cond(e.if);
    for (const n of tree.nodes) {
      effects(n.effects, `diálogo ${id}/${n.id}`);
      for (const l of n.lines) texts.push({ where: `diálogo ${id}/${n.id}`, text: typeof l === "string" ? l : l.text });
      for (const c of n.choices ?? []) {
        cond(c.if);
        effects(c.effects, `diálogo ${id}/${n.id}/${c.id}`);
      }
    }
  }
  for (const npc of NPCS) if (!DIALOGUES[npc.id]) errors.push(`personaje ${npc.id}: sin árbol de diálogo`);

  // Charlas.
  for (const chat of CHATS) {
    cond(chat.if);
    effects(chat.effects, `charla ${chat.id}`);
    if (!chat.repeatable) produced.flags.add(heardFlag(chat.id));
    for (const who of chat.between) if (!npcIds.has(who)) errors.push(`charla ${chat.id}: personaje inexistente «${who}»`);
    for (const [who] of chat.lines) if (!chat.between.includes(who)) errors.push(`charla ${chat.id}: habla «${who}», que no está en la charla`);
  }

  // Objetos de las salas.
  const zoneProps = new Set<string>();
  for (const z of zones) {
    for (const p of z.props) {
      zoneProps.add(p.id);
      const actions = PROPS[p.id];
      if (!actions?.length) {
        errors.push(`${z.id}: el objeto «${p.id}» no tiene reacciones`);
        continue;
      }
      const last = actions[actions.length - 1];
      if (last.if || last.use) errors.push(`${z.id}/${p.id}: la última reacción debe valer siempre (sin if ni use)`);
    }
    for (const e of z.exits) {
      cond(e.requires);
      effects(e.onUse, `${z.id}/${e.id}`);
      if (e.requires && !e.lockedText) errors.push(`${z.id}/${e.id}: salida cerrada sin texto que lo explique`);
    }
  }
  for (const [id, actions] of Object.entries(PROPS)) {
    if (!zoneProps.has(id)) errors.push(`reacciones para «${id}», que no está en ninguna sala`);
    for (const a of actions) {
      cond(a.if);
      if (a.use) refs.items.add(a.use);
      effects(a.effects, `objeto ${id}`);
      if (a.puzzle && !PUZZLES[a.puzzle]) errors.push(`objeto ${id}: abre un puzzle inexistente «${a.puzzle}»`);
      for (const l of a.lines) texts.push({ where: `objeto ${id}`, text: typeof l === "string" ? l : l.text });
    }
  }
  // Examinar un objeto lo marca como examinado (lo hace la escena).
  for (const id of zoneProps) refs.props.delete(id);
  for (const id of refs.props) errors.push(`se menciona el objeto «${id}», que no está en ninguna sala`);

  // Puzzles.
  const usedPuzzles = new Set(Object.values(PROPS).flat().map((a) => a.puzzle).filter(Boolean));
  for (const p of Object.values(PUZZLES)) {
    produced.flags.add(solvedFlag(p.id));
    if (!usedPuzzles.has(p.id)) errors.push(`puzzle ${p.id}: ningún objeto lo abre`);
    effects(p.reward, `puzzle ${p.id}`);
    for (const c of p.clues ?? []) cond(c.if);
    p.steps.forEach((s, i) => {
      if (s.kind === "choice" && (s.answer < 0 || s.answer >= s.options.length || !Number.isInteger(s.answer)))
        errors.push(`puzzle ${p.id} paso ${i + 1}: la respuesta no es una de las opciones`);
      if (s.kind === "number" && (!Number.isInteger(s.answer) || s.answer < 0 || String(s.answer).length > MAX_DIGITS))
        errors.push(`puzzle ${p.id} paso ${i + 1}: respuesta que no cabe en el teclado (${s.answer})`);
      const at = `puzzle ${p.id} paso ${i + 1}`;
      if (s.kind === "melody" && (s.notes.length < 2 || s.notes.length > 9 || s.notes.some((n) => !Number.isInteger(n) || n < 0 || n >= NOTES.length)))
        errors.push(`${at}: melodía con notas que no están en el piano`);
      if (s.kind === "order" && (s.items.length < 3 || s.items.length > 6 || new Set(s.items).size !== s.items.length))
        errors.push(`${at}: hay que ordenar de 3 a 6 tarjetas distintas`);
      if (s.kind === "pairs" && (s.icons.length < 3 || s.icons.length > 8 || new Set(s.icons).size !== s.icons.length))
        errors.push(`${at}: las parejas deben ser de 3 a 8 dibujos distintos`);
      if (s.kind === "maze") {
        const w = s.grid[0]?.length ?? 0;
        if (s.grid.some((row) => row.length !== w) || !/^[#.SE]+$/.test(s.grid.join("")))
          errors.push(`${at}: el laberinto tiene filas desiguales o símbolos raros`);
        if (!mazePath(s.grid)) errors.push(`${at}: el laberinto no tiene salida`);
      }
      if (s.kind === "mix") {
        const [a, b] = s.answer;
        if (a === b || [a, b].some((x) => !Number.isInteger(x) || x < 0 || x >= s.paints.length))
          errors.push(`${at}: la mezcla correcta no son dos pinturas distintas`);
      }
      if (s.kind === "clock" && (!Number.isInteger(s.hour) || s.hour < 1 || s.hour > 12 || s.minute < 0 || s.minute > 55 || s.minute % 5 !== 0))
        errors.push(`${at}: la hora del reloj tiene que ser de 1 a 12 y los minutos de 5 en 5`);
      if (!s.hint.trim()) errors.push(`${at}: sin pista`);
    });
  }

  // Pistas de Gafe y objetivos.
  for (const h of GAFE_HINTS) cond(h.if);
  const last = GAFE_HINTS[GAFE_HINTS.length - 1];
  if (!last || !GAFE_HINTS.some((h) => JSON.stringify(h.if) === JSON.stringify({ flag: "final" })))
    errors.push("pistas de Gafe: falta la del final");
  for (const g of MAIN_GOALS) {
    cond(g.done);
    cond(g.show);
    texts.push({ where: "objetivo", text: g.text });
  }
  for (const q of Object.values(QUESTS)) for (const t of Object.values(q.stages)) texts.push({ where: `misión ${q.title}`, text: t });

  // Marcadores {contador} en textos.
  for (const { where, text } of texts) {
    for (const m of text.matchAll(PLACEHOLDER)) if (!produced.counters.has(m[1])) errors.push(`${where}: «{${m[1]}}» no es un contador que cambie nunca`);
  }

  checkRefs(refs, produced, { npcIds, zoneIds }, errors);
  for (const id of Object.keys(ITEMS)) if (!produced.items.has(id)) errors.push(`objeto «${id}»: nadie lo da nunca`);
  return errors;
}

function checkRefs(refs: Refs, produced: Produced, ids: { npcIds: Set<string>; zoneIds: Set<string> }, errors: string[]): void {
  for (const f of refs.flags) if (!produced.flags.has(f)) errors.push(`flag «${f}»: se pide pero nada lo activa`);
  for (const i of refs.items) if (!ITEMS[i]) errors.push(`objeto «${i}»: no existe`);
  for (const i of refs.items) if (ITEMS[i] && !produced.items.has(i)) errors.push(`objeto «${i}»: se pide pero nadie lo da`);
  for (const q of refs.quests) if (!QUESTS[q]) errors.push(`misión «${q}»: no existe`);
  for (const c of refs.counters) if (!produced.counters.has(c)) errors.push(`contador «${c}»: se pide pero nunca cambia`);
  for (const m of refs.marks) if (!produced.marks.has(m)) errors.push(`marca «${m}»: se pide pero nunca se pone`);
  for (const n of refs.npcs) if (!ids.npcIds.has(n)) errors.push(`personaje «${n}»: no existe`);
  for (const z of refs.zones) if (!ids.zoneIds.has(z)) errors.push(`zona «${z}»: no existe`);
  for (const key of refs.choices) {
    const [npc, choice] = key.split(":");
    const tree = DIALOGUES[npc];
    if (!tree?.nodes.some((n) => n.choices?.some((c) => c.id === choice))) errors.push(`opción «${key}»: no existe`);
  }
  for (const key of refs.nodes) {
    const [npc, node] = key.split(":");
    if (!DIALOGUES[npc]?.nodes.some((n) => n.id === node)) errors.push(`nodo «${key}»: no existe`);
  }
}

/** Nodos a los que se salta que no existen, nodos inalcanzables y opciones repetidas. */
function validateTree(tree: DialogueTree, errors: string[]): void {
  const ids = new Set(tree.nodes.map((n) => n.id));
  if (ids.size !== tree.nodes.length) errors.push(`diálogo ${tree.npc}: ids de nodo repetidos`);
  const reach = new Set<string>();
  const stack = tree.entries.map((e) => e.node);
  while (stack.length) {
    const id = stack.pop()!;
    if (reach.has(id)) continue;
    if (!ids.has(id)) {
      errors.push(`diálogo ${tree.npc}: salta a un nodo inexistente «${id}»`);
      continue;
    }
    reach.add(id);
    const node = tree.nodes.find((n) => n.id === id)!;
    if (node.next) stack.push(node.next);
    for (const c of node.choices ?? []) if (c.goto) stack.push(c.goto);
    const choiceIds = (node.choices ?? []).map((c) => c.id);
    if (new Set(choiceIds).size !== choiceIds.length) errors.push(`diálogo ${tree.npc}/${id}: opciones repetidas`);
  }
  for (const id of ids) if (!reach.has(id)) errors.push(`diálogo ${tree.npc}: el nodo «${id}» es inalcanzable`);
}
