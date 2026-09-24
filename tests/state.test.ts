import { describe, expect, it } from "vitest";
import { apply, check } from "../src/core/rules";
import { deserialize, newGame, serialize } from "../src/core/state";

const ZONES = ["vestibulo", "biblioteca"];

describe("GameState", () => {
  it("guarda y recupera sin perder nada", () => {
    const s = newGame();
    apply([{ set: "carta" }, { give: "sello" }, { affinity: ["basilio", 15] }, { stage: ["pacto", 2] }, { examine: "retrato" }], s);
    s.clock = 123.5;
    const back = deserialize(serialize(s), ZONES);
    expect(back).toEqual(s);
  });

  it("un guardado corrupto o vacío no rompe el juego", () => {
    expect(deserialize(null, ZONES)).toBeNull();
    expect(deserialize("{no es json", ZONES)).toBeNull();
    expect(deserialize("[1,2,3]", ZONES)).toBeNull();
  });

  it("repara campos basura y limita valores", () => {
    const raw = JSON.stringify({
      zone: "zona-que-ya-no-existe", flags: { ok: true, raro: "si" }, inventory: ["a", 3, "a", null],
      npc: { basilio: { affinity: 999, met: "si", seen: ["n1", 2] }, roto: 5 },
      quests: { q: { stage: -4, done: 1 } }, clock: "mucho", visited: ["biblioteca", "marte"],
    });
    const s = deserialize(raw, ZONES)!;
    expect(s.zone).toBe("vestibulo");
    expect(s.flags).toEqual({ ok: true });
    expect(s.inventory).toEqual(["a"]);
    expect(s.npc.basilio).toEqual({ affinity: 100, met: false, seen: ["n1"], chosen: [] });
    expect(s.npc.roto).toBeUndefined();
    expect(s.quests.q).toEqual({ stage: 0, done: false });
    expect(s.clock).toBe(0);
    expect(s.visited).toEqual(["biblioteca", "vestibulo"]);
  });
});

describe("reglas", () => {
  it("condiciones compuestas", () => {
    const s = newGame();
    apply([{ give: "llave" }, { affinity: ["elvira", 30] }, { stage: ["reloj", 1] }], s);
    expect(check({ all: [{ has: "llave" }, { affinity: ["elvira", ">=", 25] }] }, s)).toBe(true);
    expect(check({ any: [{ flag: "nada" }, { quest: ["reloj", "==", 1] }] }, s)).toBe(true);
    expect(check({ not: { has: "llave" } }, s)).toBe(false);
    expect(check(undefined, s)).toBe(true);
  });

  it("dar dos veces un objeto no lo duplica y quitarlo avisa", () => {
    const s = newGame();
    expect(apply([{ give: "sello" }, { give: "sello" }], s)).toEqual([{ type: "item", item: "sello" }]);
    expect(apply([{ take: "sello" }], s)).toEqual([{ type: "itemLost", item: "sello" }]);
    expect(apply([{ take: "sello" }], s)).toEqual([]);
  });

  it("las misiones solo avanzan y la afinidad se limita a ±100", () => {
    const s = newGame();
    apply([{ stage: ["m", 3] }, { stage: ["m", 1] }, { affinity: ["x", 80] }, { affinity: ["x", 80] }], s);
    expect(s.quests.m.stage).toBe(3);
    expect(s.npc.x.affinity).toBe(100);
  });
});
