import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";
import { TIMING, WorldSim, ZoneGraph, type Routine, type SimEvent } from "../src/core/worldSim";
import { zoneLinks } from "../src/content/zones";

const graph = new ZoneGraph(zoneLinks());
const routines: Record<string, Routine> = {
  basilio: { home: "vestibulo", stations: [
    { zone: "vestibulo", weight: 4, stay: [60, 120] },
    { zone: "cocina", weight: 1, stay: [30, 60] },
    { zone: "musica", weight: 1, stay: [30, 60] },
  ] },
  elvira: { home: "biblioteca", stations: [
    { zone: "biblioteca", weight: 5, stay: [90, 200] },
    { zone: "galeria", weight: 1, stay: [40, 80] },
  ] },
  pepito: { home: "desvan", stations: [
    { zone: "desvan", weight: 1, stay: [20, 40] },
    { zone: "invernadero", weight: 1, stay: [20, 40] },
    { zone: "tuneles", weight: 1, stay: [20, 40] },
  ] },
};

function run(sim: WorldSim, from: number, to: number, visible = "nada", dt = 0.5) {
  const events: SimEvent[] = [];
  for (let t = from; t <= to; t += dt) events.push(...sim.tick(t, visible));
  return events;
}

describe("ZoneGraph", () => {
  it("encuentra la ruta más corta por puertas reales", () => {
    const r = graph.route("vestibulo", "musica")!;
    expect(r.map((l) => l.to)).toEqual(["biblioteca", "musica"]);
    expect(r[0].exitId).toBe("puerta-biblioteca");
    expect(graph.route("vestibulo", "vestibulo")).toEqual([]);
  });

  it("todas las zonas son alcanzables desde cualquier otra", () => {
    const zones = [...new Set(zoneLinks().map((l) => l.from))];
    for (const a of zones) for (const b of zones) expect(graph.route(a, b), `${a}->${b}`).not.toBeNull();
  });
});

describe("WorldSim", () => {
  it("fuera de la vista de Paula todos se mueven por el mapa y nadie se atasca", () => {
    const sim = new WorldSim(graph, routines, new Rng(1));
    // Atasco = una fase de viaje (saliendo, de camino o entrando) que no termina.
    // Sin nadie mirando, cada una dura como mucho su tiempo máximo.
    const maxPhase = Math.max(TIMING.leaveUnseen[1], TIMING.hop[1], TIMING.crossUnseen[1]) + 0.5;
    const phaseSince = new Map<string, { phase: object; t: number }>();
    const zonesSeen = new Map<string, Set<string>>();
    for (let t = 0; t <= 7200; t += 0.5) {
      sim.tick(t, "nada");
      for (const n of sim.npcs.values()) {
        const cur = phaseSince.get(n.id);
        if (!cur || cur.phase !== n.phase) phaseSince.set(n.id, { phase: n.phase, t });
        if (n.phase.kind !== "stay") {
          expect(t - phaseSince.get(n.id)!.t, `${n.id} atascado en ${n.phase.kind}`).toBeLessThanOrEqual(maxPhase);
        }
        (zonesSeen.get(n.id) ?? zonesSeen.set(n.id, new Set()).get(n.id)!).add(n.zone);
      }
    }
    expect(zonesSeen.get("basilio")!.size).toBeGreaterThanOrEqual(3);
    expect([...zonesSeen.get("pepito")!]).toEqual(expect.arrayContaining(["desvan", "invernadero", "tuneles"]));
  });

  it("solo entra en una zona por la puerta que la conecta con la anterior", () => {
    const sim = new WorldSim(graph, routines, new Rng(2));
    const prev = new Map([...sim.npcs.values()].map((n) => [n.id, n.zone]));
    const links = zoneLinks();
    for (let t = 0; t <= 5000; t += 0.5) {
      sim.tick(t, "nada");
      for (const n of sim.npcs.values()) {
        const before = prev.get(n.id)!;
        if (n.zone !== before) {
          expect(n.phase.kind).toBe("arriving");
          const entry = n.phase.kind === "arriving" ? n.phase.entryExit : "";
          expect(links.some((l) => l.from === before && l.to === n.zone && l.toExit === entry), `${n.id}: ${before}->${n.zone} por ${entry}`).toBe(true);
          prev.set(n.id, n.zone);
        }
      }
    }
  });

  it("en la zona de Paula: avisa de que se va y espera a que llegue a la puerta", () => {
    const sim = new WorldSim(graph, { basilio: { home: "vestibulo", stations: [
      { zone: "vestibulo", weight: 0, stay: [10, 10] }, { zone: "cocina", weight: 1, stay: [10, 10] },
    ] } }, new Rng(3));
    const ev = run(sim, 0, 12, "vestibulo");
    expect(ev).toEqual([{ type: "leave", npc: "basilio", zone: "vestibulo", exitId: "puerta-servicio" }]);
    // Sin aviso de la escena no se va (hasta el plazo de seguridad).
    expect(run(sim, 12.5, 25, "vestibulo")).toEqual([]);
    expect(sim.reachedExit("basilio", 25)).toEqual([{ type: "gone", npc: "basilio", zone: "vestibulo" }]);
  });

  it("si la escena no avisa (atasco), el plazo de seguridad lo resuelve", () => {
    const sim = new WorldSim(graph, { basilio: { home: "vestibulo", stations: [
      { zone: "vestibulo", weight: 0, stay: [5, 5] }, { zone: "cocina", weight: 1, stay: [5, 5] },
    ] } }, new Rng(4));
    run(sim, 0, 6, "vestibulo");
    const ev = run(sim, 6.5, 6 + TIMING.visibleDeadline + 1, "vestibulo");
    expect(ev.some((e) => e.type === "gone")).toBe(true);
  });

  it("al cruzar una zona intermedia visible, entra de paso y sale por la puerta siguiente", () => {
    const sim = new WorldSim(graph, { elvira: { home: "vestibulo", stations: [
      { zone: "vestibulo", weight: 0, stay: [5, 5] }, { zone: "musica", weight: 1, stay: [50, 50] },
    ] } }, new Rng(5));
    // Paula está en la biblioteca, que Elvira atraviesa camino de la música.
    const ev = run(sim, 0, 40, "biblioteca");
    const arrive = ev.find((e) => e.type === "arrive");
    expect(arrive).toEqual({ type: "arrive", npc: "elvira", zone: "biblioteca", entryExit: "puerta-vestibulo", passingThrough: true });
    const after = sim.settled("elvira", 40, "biblioteca");
    expect(after).toEqual([{ type: "leave", npc: "elvira", zone: "biblioteca", exitId: "arco-musica" }]);
  });

  it("si Paula se va, lo que estaba a medias se resuelve pronto por tiempo", () => {
    const sim = new WorldSim(graph, { basilio: { home: "vestibulo", stations: [
      { zone: "vestibulo", weight: 0, stay: [5, 5] }, { zone: "cocina", weight: 1, stay: [5, 5] },
    ] } }, new Rng(6));
    run(sim, 0, 6, "vestibulo");
    sim.visibleZoneChanged(6, "biblioteca");
    const ev = run(sim, 6.5, 6 + TIMING.leaveUnseen[1] + 0.5, "biblioteca");
    expect(ev.some((e) => e.type === "gone")).toBe(true);
  });

  it("es reproducible con la misma semilla", () => {
    const trace = (seed: number) => {
      const sim = new WorldSim(graph, routines, new Rng(seed));
      const out: string[] = [];
      for (let t = 0; t <= 3000; t += 1) {
        sim.tick(t, "nada");
        out.push([...sim.npcs.values()].map((n) => `${n.zone}:${n.phase.kind}`).join(","));
      }
      return out.join("|");
    };
    expect(trace(9)).toBe(trace(9));
    expect(trace(9)).not.toBe(trace(10));
  });

  it("pasa la mayor parte del tiempo en casa si su rutina lo pide", () => {
    const sim = new WorldSim(graph, { elvira: routines.elvira }, new Rng(8));
    let home = 0;
    let total = 0;
    for (let t = 0; t <= 20000; t += 1) {
      sim.tick(t, "nada");
      const n = sim.npcs.get("elvira")!;
      total += 1;
      if (n.zone === "biblioteca" && n.phase.kind === "stay") home += 1;
    }
    expect(home / total).toBeGreaterThan(0.6);
  });

  it("congelado (hablando con Paula) no se va ni vence plazos; al soltarlo tiene margen", () => {
    const sim = new WorldSim(graph, { basilio: { home: "vestibulo", stations: [
      { zone: "vestibulo", weight: 0, stay: [5, 5] }, { zone: "cocina", weight: 1, stay: [5, 5] },
    ] } }, new Rng(11));
    run(sim, 0, 6, "vestibulo"); // decide irse: fase leaving
    sim.pause("basilio");
    expect(run(sim, 6.5, 200, "vestibulo")).toEqual([]);
    expect(sim.npcs.get("basilio")!.phase.kind).toBe("leaving");
    sim.resume("basilio", 200, true);
    expect(run(sim, 200.5, 200 + TIMING.visibleDeadline - 1, "vestibulo")).toEqual([]);
    expect(run(sim, 200 + TIMING.visibleDeadline, 200 + TIMING.visibleDeadline + 1, "vestibulo").some((e) => e.type === "gone")).toBe(true);
  });

  it("después de hablar se queda un rato (no se marcha en mitad del saludo)", () => {
    const sim = new WorldSim(graph, { elvira: routines.elvira }, new Rng(12));
    const n = sim.npcs.get("elvira")!;
    n.phase = { kind: "stay", until: 101 };
    sim.pause("elvira");
    sim.resume("elvira", 100, true);
    expect(n.phase.kind === "stay" && n.phase.until).toBeGreaterThanOrEqual(120);
  });

  it("reset devuelve a todos a casa y quita las pausas", () => {
    const sim = new WorldSim(graph, routines, new Rng(7), 0);
    run(sim, 0, 600);
    sim.pause("pepito");
    sim.reset(600);
    expect(sim.isPaused("pepito")).toBe(false);
    for (const [id, n] of sim.npcs) {
      expect(n.zone).toBe(routines[id].home);
      expect(n.phase.kind).toBe("stay");
    }
  });
});
