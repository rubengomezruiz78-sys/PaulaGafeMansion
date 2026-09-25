import { describe, expect, it } from "vitest";
import { resolveProp, type PropAction } from "../src/core/interact";
import { progressKey, PuzzleRun, solvedFlag, type PuzzleDef } from "../src/core/puzzle";
import { apply, check, markFlag } from "../src/core/rules";
import { newGame } from "../src/core/state";
import { fill } from "../src/core/text";

const def: PuzzleDef = {
  id: "prueba",
  title: "Prueba",
  story: "",
  steps: [
    { kind: "number", prompt: "2 × 3", answer: 6, hint: "tabla del 2" },
    { kind: "choice", prompt: "¿Gato?", options: ["Perro", "Gafe"], answer: 1, hint: "maúlla" },
  ],
  clues: [{ if: { flag: "oido" }, text: "Lo oíste" }],
  reward: [{ give: "premio" }, { set: "hecho" }],
};

describe("puzzles", () => {
  it("fallar no rompe nada y cuenta los errores", () => {
    const s = newGame();
    const run = new PuzzleRun(def, s);
    expect(run.answer(5)).toEqual({ correct: false, solved: false, notices: [] });
    expect(run.mistakes).toBe(1);
    expect(run.index).toBe(0);
  });

  it("el progreso se guarda en la partida y se retoma", () => {
    const s = newGame();
    new PuzzleRun(def, s).answer(6);
    expect(s.counters[progressKey("prueba")]).toBe(1);
    const again = new PuzzleRun(def, s);
    expect(again.index).toBe(1);
    expect(again.step.kind).toBe("choice");
  });

  it("al resolverlo da la recompensa una sola vez y limpia el progreso", () => {
    const s = newGame();
    const run = new PuzzleRun(def, s);
    run.answer(6);
    const r = run.answer(1);
    expect(r.solved).toBe(true);
    expect(r.notices).toEqual([{ type: "item", item: "premio" }]);
    expect(s.flags[solvedFlag("prueba")]).toBe(true);
    expect(s.counters[progressKey("prueba")]).toBeUndefined();
    expect(run.answer(1).notices).toEqual([]);
    expect(s.inventory.filter((i) => i === "premio")).toHaveLength(1);
  });

  it("las pistas de la historia aparecen solo si Paula las conoce", () => {
    const s = newGame();
    expect(new PuzzleRun(def, s).clues()).toEqual([]);
    s.flags.oido = true;
    expect(new PuzzleRun(def, s).clues()).toEqual(["Lo oíste"]);
  });
});

describe("objetos de las salas", () => {
  const actions: PropAction[] = [
    { if: { flag: "abierto" }, lines: ["abierto"] },
    { use: "llave", lines: ["abro con la llave"], effects: [{ set: "abierto" }] },
    { lines: ["cerrado"] },
  ];

  it("gana la primera reacción que se cumple", () => {
    const s = newGame();
    expect(resolveProp(actions, s)?.lines).toEqual(["cerrado"]);
    s.inventory.push("llave");
    expect(resolveProp(actions, s)?.lines).toEqual(["abro con la llave"]);
    s.flags.abierto = true;
    expect(resolveProp(actions, s)?.lines).toEqual(["abierto"]);
  });

  it("usar un objeto a propósito solo vale donde se pide", () => {
    const s = newGame();
    s.inventory.push("llave", "galleta");
    expect(resolveProp(actions, s, "llave")?.lines).toEqual(["abro con la llave"]);
    expect(resolveProp(actions, s, "galleta")).toBeNull();
  });
});

describe("marcas por sala y textos con contadores", () => {
  it("una marca vale solo en la sala donde se puso", () => {
    const s = newGame("desvan");
    apply([{ mark: "visto" }], s);
    expect(s.flags[markFlag("visto", "desvan")]).toBe(true);
    expect(check({ marked: "visto" }, s)).toBe(true);
    s.zone = "cocina";
    expect(check({ marked: "visto" }, s)).toBe(false);
  });

  it("fill sustituye contadores (0 si no existen)", () => {
    const s = newGame();
    s.counters.recuerdos = 3;
    expect(fill("Llevo {recuerdos} de 5 y {nada}", s)).toBe("Llevo 3 de 5 y 0");
  });
});
