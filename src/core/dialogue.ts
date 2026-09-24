/**
 * Motor de conversaciones ramificadas con memoria (lógica pura).
 *
 * - Un árbol por personaje. La conversación empieza por la PRIMERA entrada
 *   cuya condición se cumple: lo específico de la historia va antes que lo
 *   genérico, así el personaje reacciona a lo que Paula ha hecho.
 * - Cada nodo dice unas frases, aplica efectos y ofrece opciones.
 * - El personaje recuerda los nodos vistos y las opciones elegidas; las
 *   opciones `once` desaparecen tras elegirse.
 */
import { apply, check, type Cond, type Effect, type Notice } from "./rules";
import { npcMemory, type GameState } from "./state";

/** Frase: texto (lo dice el personaje) o `{ by, text }` para otro hablante (p. ej. "paula"). */
export type Line = string | { by: string; text: string };

export interface DialogueChoice {
  id: string;
  /** Lo que dice Paula (texto del botón). */
  text: string;
  if?: Cond;
  once?: boolean;
  effects?: Effect[];
  /** Nodo siguiente; sin `goto`, la conversación termina. */
  goto?: string;
}

export interface DialogueNode {
  id: string;
  lines: Line[];
  effects?: Effect[];
  choices?: DialogueChoice[];
  /** Continuación automática (sin opciones). */
  next?: string;
}

export interface DialogueTree {
  npc: string;
  entries: { if?: Cond; node: string }[];
  nodes: DialogueNode[];
}

export interface Step {
  lines: { by: string; text: string }[];
  choices: { id: string; text: string }[];
  notices: Notice[];
  /** true si tras estas frases la conversación termina. */
  final: boolean;
}

const MAX_CHAIN = 24;

export class DialogueRunner {
  private readonly nodes = new Map<string, DialogueNode>();
  private current?: DialogueNode;

  constructor(private readonly tree: DialogueTree, private readonly state: GameState) {
    for (const n of tree.nodes) this.nodes.set(n.id, n);
  }

  get npc(): string {
    return this.tree.npc;
  }

  /** Abre la conversación; null si ninguna entrada está disponible. */
  start(): Step | null {
    const entry = this.tree.entries.find((e) => check(e.if, this.state));
    if (!entry) return null;
    npcMemory(this.state, this.tree.npc).met = true;
    return this.enter(entry.node);
  }

  choose(choiceId: string): Step | null {
    const choice = this.current?.choices?.find((c) => c.id === choiceId);
    if (!choice || !this.visible(choice)) return null;
    const mem = npcMemory(this.state, this.tree.npc);
    if (!mem.chosen.includes(choice.id)) mem.chosen.push(choice.id);
    const notices = apply(choice.effects, this.state);
    if (!choice.goto) {
      this.current = undefined;
      return { lines: [], choices: [], notices, final: true };
    }
    const step = this.enter(choice.goto);
    step.notices.unshift(...notices);
    return step;
  }

  private visible(c: DialogueChoice): boolean {
    if (!check(c.if, this.state)) return false;
    if (c.once && npcMemory(this.state, this.tree.npc).chosen.includes(c.id)) return false;
    return true;
  }

  private enter(nodeId: string): Step {
    const step: Step = { lines: [], choices: [], notices: [], final: false };
    const mem = npcMemory(this.state, this.tree.npc);
    let id: string | undefined = nodeId;
    for (let i = 0; id && i < MAX_CHAIN; i += 1) {
      const node = this.nodes.get(id);
      if (!node) throw new Error(`Diálogo de ${this.tree.npc}: nodo inexistente "${id}"`);
      this.current = node;
      if (!mem.seen.includes(node.id)) mem.seen.push(node.id);
      for (const l of node.lines) step.lines.push(typeof l === "string" ? { by: this.tree.npc, text: l } : l);
      step.notices.push(...apply(node.effects, this.state));
      const choices = (node.choices ?? []).filter((c) => this.visible(c));
      if (choices.length) {
        step.choices = choices.map((c) => ({ id: c.id, text: c.text }));
        return step;
      }
      id = node.next;
    }
    step.final = true;
    this.current = undefined;
    return step;
  }
}
