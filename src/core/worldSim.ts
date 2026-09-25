/**
 * Simulación del mundo vivo (lógica pura, reproducible con semilla).
 *
 * Todos los personajes viven a la vez, esté Paula donde esté: cada uno tiene
 * una casa y una rutina de sitios que visita, y se mueve entre zonas por las
 * puertas reales siguiendo el grafo del mapa (atravesando zonas intermedias).
 *
 * Reparto de tareas con la escena:
 *  - Fuera de la vista de Paula, todo se resuelve por tiempo.
 *  - En la zona de Paula, la escena mueve al personaje de verdad y avisa:
 *    `reachedExit` (llegó a la puerta por la que sale) y `settled` (terminó de
 *    entrar). Si la escena no avisa a tiempo (atasco), un plazo máximo lo
 *    resuelve: el mundo nunca se congela.
 *
 * Unidades: segundos de juego.
 */
import { Rng } from "./rng";

export interface ZoneLink {
  from: string;
  exitId: string;
  to: string;
  toExit: string;
}

export interface Station {
  zone: string;
  /** Peso relativo al elegir el siguiente sitio. */
  weight: number;
  /** Cuánto se queda (s). */
  stay: [min: number, max: number];
}

export interface Routine {
  home: string;
  stations: Station[];
}

export type Phase =
  /** En una zona, a su aire, hasta `until`. */
  | { kind: "stay"; until: number }
  /** Caminando hacia la puerta `exitId` para salir. */
  | { kind: "leaving"; exitId: string; deadline: number }
  /** Entre zonas (fuera de escena); aparece en `zone` por `entryExit` a `arriveAt`. */
  | { kind: "away"; arriveAt: number; zone: string; entryExit: string }
  /** Acaba de entrar por `entryExit`: camina hacia dentro (o hacia la siguiente puerta). */
  | { kind: "arriving"; entryExit: string; deadline: number };

export interface SimNpc {
  id: string;
  zone: string;
  phase: Phase;
  /** Zonas que le quedan por atravesar hasta su destino (la última es el destino). */
  route: string[];
}

export type SimEvent =
  | { type: "leave"; npc: string; zone: string; exitId: string }
  | { type: "gone"; npc: string; zone: string }
  | { type: "arrive"; npc: string; zone: string; entryExit: string; passingThrough: boolean };

export const TIMING = {
  /** Tiempo que tarda en llegar a la puerta cuando nadie le ve (s). */
  leaveUnseen: [5, 9] as [number, number],
  /** Tiempo entre dos zonas por el pasillo (s). */
  hop: [6, 11] as [number, number],
  /** Tiempo para cruzar una zona intermedia sin que le vean (s). */
  crossUnseen: [8, 14] as [number, number],
  /** Plazo máximo para que la escena resuelva un movimiento visible (s). */
  visibleDeadline: 30,
};

export class ZoneGraph {
  private readonly adj = new Map<string, ZoneLink[]>();

  constructor(links: ZoneLink[]) {
    for (const l of links) {
      if (!this.adj.has(l.from)) this.adj.set(l.from, []);
      this.adj.get(l.from)!.push(l);
    }
  }

  links(zone: string): ZoneLink[] {
    return this.adj.get(zone) ?? [];
  }

  /** Camino más corto en saltos: lista de enlaces desde `from` hasta `to` ([] si ya está). */
  route(from: string, to: string): ZoneLink[] | null {
    if (from === to) return [];
    const prev = new Map<string, ZoneLink>();
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length) {
      const z = queue.shift()!;
      for (const l of this.links(z)) {
        if (seen.has(l.to)) continue;
        seen.add(l.to);
        prev.set(l.to, l);
        if (l.to === to) {
          const path: ZoneLink[] = [];
          for (let cur = to; cur !== from; cur = prev.get(cur)!.from) path.unshift(prev.get(cur)!);
          return path;
        }
        queue.push(l.to);
      }
    }
    return null;
  }

  link(from: string, to: string): ZoneLink | undefined {
    return this.links(from).find((l) => l.to === to);
  }
}

export class WorldSim {
  readonly npcs = new Map<string, SimNpc>();
  private readonly paused = new Set<string>();

  constructor(
    private readonly graph: ZoneGraph,
    private readonly routines: Record<string, Routine>,
    private readonly rng: Rng,
    now = 0,
  ) {
    for (const [id, r] of Object.entries(routines)) {
      this.npcs.set(id, { id, zone: r.home, route: [], phase: { kind: "stay", until: now + this.stayFor(r, r.home) } });
    }
  }

  /** Quién está (o está entrando/saliendo) en una zona. */
  presentIn(zone: string): SimNpc[] {
    return [...this.npcs.values()].filter((n) => n.zone === zone && n.phase.kind !== "away");
  }

  /**
   * Congela a un personaje (p. ej. mientras habla con Paula o charla con
   * otro): no decide irse ni vence ningún plazo hasta `resume`.
   */
  pause(id: string): void {
    this.paused.add(id);
  }

  /** Lo descongela con margen: no se va justo al terminar de hablar. */
  resume(id: string, now: number, visible: boolean): void {
    this.paused.delete(id);
    const npc = this.npcs.get(id);
    if (!npc) return;
    const p = npc.phase;
    if (p.kind === "stay") p.until = Math.max(p.until, now + 20);
    else if (p.kind === "leaving" || p.kind === "arriving") {
      p.deadline = Math.max(p.deadline, now + (visible ? TIMING.visibleDeadline : TIMING.leaveUnseen[1]));
    }
  }

  isPaused(id: string): boolean {
    return this.paused.has(id);
  }

  /** Avanza la simulación. `visibleZone` es donde está Paula. */
  tick(now: number, visibleZone: string): SimEvent[] {
    const events: SimEvent[] = [];
    for (const npc of this.npcs.values()) {
      if (this.paused.has(npc.id)) continue;
      const visible = npc.zone === visibleZone;
      const p = npc.phase;
      switch (p.kind) {
        case "stay":
          if (now >= p.until) this.planTrip(npc, now, visible, events);
          break;
        case "leaving":
          // Sin nadie mirando, llega a la puerta sola; mirando, espera el aviso
          // de la escena (o el plazo, por si se atascara).
          if (now >= p.deadline) this.exit(npc, p.exitId, now, events);
          break;
        case "away":
          if (now >= p.arriveAt) this.arrive(npc, now, visibleZone, events);
          break;
        case "arriving":
          if (now >= p.deadline) this.settle(npc, now, visibleZone, events);
          break;
      }
    }
    return events;
  }

  /** La escena avisa: el personaje visible llegó a la puerta por la que sale. */
  reachedExit(id: string, now: number): SimEvent[] {
    const npc = this.npcs.get(id);
    if (!npc || npc.phase.kind !== "leaving") return [];
    const events: SimEvent[] = [];
    this.exit(npc, npc.phase.exitId, now, events);
    return events;
  }

  /** La escena avisa: el personaje visible terminó de entrar (o de cruzar). */
  settled(id: string, now: number, visibleZone: string): SimEvent[] {
    const npc = this.npcs.get(id);
    if (!npc || npc.phase.kind !== "arriving") return [];
    const events: SimEvent[] = [];
    this.settle(npc, now, visibleZone, events);
    return events;
  }

  /** Paula cambia de zona: lo que estaba a medias fuera de su vista pasa a resolverse por tiempo. */
  visibleZoneChanged(now: number, newZone: string): void {
    for (const npc of this.npcs.values()) {
      if (npc.zone === newZone) continue;
      if (npc.phase.kind === "leaving") npc.phase.deadline = Math.min(npc.phase.deadline, now + this.rng.range(...TIMING.leaveUnseen));
      if (npc.phase.kind === "arriving") npc.phase.deadline = Math.min(npc.phase.deadline, now + this.rng.range(...TIMING.crossUnseen));
    }
  }

  // ------------------------------------------------------------ interno

  private stayFor(r: Routine, zone: string): number {
    const st = r.stations.find((s) => s.zone === zone) ?? r.stations[0];
    return this.rng.range(st.stay[0], st.stay[1]);
  }

  /** Siguiente sitio según los pesos de su rutina; puede ser quedarse donde está. */
  private pickDestination(npc: SimNpc): string {
    const r = this.routines[npc.id];
    const options = r.stations.filter((s) => s.weight > 0);
    if (!options.length) return npc.zone;
    const total = options.reduce((s, o) => s + o.weight, 0);
    let x = this.rng.next() * total;
    for (const o of options) {
      x -= o.weight;
      if (x <= 0) return o.zone;
    }
    return options[options.length - 1].zone;
  }

  private planTrip(npc: SimNpc, now: number, visible: boolean, events: SimEvent[]): void {
    const dest = this.pickDestination(npc);
    const path = dest === npc.zone ? [] : this.graph.route(npc.zone, dest);
    if (!path || !path.length) {
      npc.phase = { kind: "stay", until: now + this.stayFor(this.routines[npc.id], npc.zone) };
      return;
    }
    npc.route = path.map((l) => l.to);
    this.startLeaving(npc, path[0].exitId, now, visible, events);
  }

  private startLeaving(npc: SimNpc, exitId: string, now: number, visible: boolean, events: SimEvent[]): void {
    const deadline = now + (visible ? TIMING.visibleDeadline : this.rng.range(...TIMING.leaveUnseen));
    npc.phase = { kind: "leaving", exitId, deadline };
    if (visible) events.push({ type: "leave", npc: npc.id, zone: npc.zone, exitId });
  }

  private exit(npc: SimNpc, exitId: string, now: number, events: SimEvent[]): void {
    const link = this.graph.links(npc.zone).find((l) => l.exitId === exitId);
    if (!link) {
      // Salida inexistente (no debería ocurrir: los tests de zonas lo impiden).
      npc.route = [];
      npc.phase = { kind: "stay", until: now + 5 };
      return;
    }
    events.push({ type: "gone", npc: npc.id, zone: npc.zone });
    npc.phase = { kind: "away", arriveAt: now + this.rng.range(...TIMING.hop), zone: link.to, entryExit: link.toExit };
  }

  private arrive(npc: SimNpc, now: number, visibleZone: string, events: SimEvent[]): void {
    if (npc.phase.kind !== "away") return;
    const { zone, entryExit } = npc.phase;
    npc.zone = zone;
    npc.route = npc.route[0] === zone ? npc.route.slice(1) : npc.route;
    const visible = zone === visibleZone;
    const passingThrough = npc.route.length > 0;
    const deadline = now + (visible ? TIMING.visibleDeadline : this.rng.range(...TIMING.crossUnseen));
    npc.phase = { kind: "arriving", entryExit, deadline };
    if (visible) events.push({ type: "arrive", npc: npc.id, zone, entryExit, passingThrough });
  }

  private settle(npc: SimNpc, now: number, visibleZone: string, events: SimEvent[]): void {
    const visible = npc.zone === visibleZone;
    if (npc.route.length) {
      const link = this.graph.link(npc.zone, npc.route[0]);
      if (link) {
        this.startLeaving(npc, link.exitId, now, visible, events);
        return;
      }
      npc.route = [];
    }
    npc.phase = { kind: "stay", until: now + this.stayFor(this.routines[npc.id], npc.zone) };
  }
}
