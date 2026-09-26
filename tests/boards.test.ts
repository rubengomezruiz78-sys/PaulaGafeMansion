import { describe, expect, it } from "vitest";
import { encodeMix, encodeSeq, expectedAnswer, isGameStep, mazePath, PuzzleRun, type PuzzleDef } from "../src/core/puzzle";
import { matchTwo, parseClockTime, parseDirections, parseNotes } from "../src/core/speech";
import { newGame } from "../src/core/state";

const juegos: PuzzleDef = {
  id: "juegos",
  title: "Juegos",
  story: "",
  steps: [
    { kind: "melody", prompt: "Repite", notes: [0, 2, 4], hint: "do mi sol" },
    { kind: "order", prompt: "Ordena", items: ["uno", "dos", "tres"], hint: "cuenta" },
    { kind: "pairs", prompt: "Parejas", icons: ["🐱", "🦉", "🌙"], hint: "memoria" },
    { kind: "maze", prompt: "Sal", grid: ["S.#", "#.#", "#.E"], hint: "baja" },
    {
      kind: "mix", prompt: "Naranja", target: { name: "naranja", color: 0xff9900 },
      paints: [{ name: "rojo", color: 0xff0000 }, { name: "azul", color: 0x0000ff }, { name: "amarillo", color: 0xffff00 }],
      answer: [2, 0], hint: "rojo y amarillo",
    },
  ],
  reward: [{ set: "hecho" }],
};

describe("pruebas que son un juego", () => {
  it("cada tipo tiene su respuesta codificada", () => {
    expect(juegos.steps.map(expectedAnswer)).toEqual([135, 123, 3, 1, 13]);
    expect(juegos.steps.every(isGameStep)).toBe(true);
    expect(encodeSeq([6, 0])).toBe(71);
    expect(encodeMix(0, 2)).toBe(encodeMix(2, 0));
  });

  it("se resuelven paso a paso con esas respuestas (y fallar no rompe nada)", () => {
    const s = newGame();
    const run = new PuzzleRun(juegos, s);
    expect(run.answer(encodeSeq([0, 2, 3])).correct).toBe(false);
    for (const step of juegos.steps) expect(run.answer(expectedAnswer(step)).correct).toBe(true);
    expect(run.solved).toBe(true);
    expect(s.flags.hecho).toBe(true);
  });

  it("el laberinto encuentra el camino más corto, o ninguno si está cerrado", () => {
    expect(mazePath(["S.#", "#.#", "#.E"])?.length).toBe(5);
    expect(mazePath(["S#", "#E"])).toBeNull();
  });
});

describe("respuestas habladas de los juegos", () => {
  it("entiende las notas dichas en orden", () => {
    expect(parseNotes(["Do, mi, sol."], 3)).toEqual([0, 2, 4]);
    expect(parseNotes(["hola", "do re mi fa"], 3)).toEqual([0, 1, 2]);
    expect(parseNotes(["do mi"], 3)).toBeNull();
  });

  it("entiende direcciones del laberinto", () => {
    expect(parseDirections(["Arriba, arriba y a la derecha"])).toEqual(["up", "up", "right"]);
    expect(parseDirections(["nada"])).toEqual([]);
  });

  it("entiende dos pinturas en la misma frase", () => {
    expect(matchTwo(["mezclo amarillo con rojo"], ["rojo", "azul", "amarillo"])).toEqual([2, 0]);
    expect(matchTwo(["solo azul"], ["rojo", "azul", "amarillo"])).toBeNull();
  });
});

describe("el reloj de agujas", () => {
  it("la respuesta es la hora como número", () => {
    const step = { kind: "clock" as const, prompt: "", hour: 4, minute: 30, hint: "h" };
    expect(expectedAnswer(step)).toBe(430);
  });

  it("entiende la hora dicha como en España", () => {
    expect(parseClockTime(["Son las cuatro y media"])).toEqual({ hour: 4, minute: 30 });
    expect(parseClockTime(["las nueve y cuarto"])).toEqual({ hour: 9, minute: 15 });
    expect(parseClockTime(["las tres menos cuarto"])).toEqual({ hour: 2, minute: 45 });
    expect(parseClockTime(["la una menos diez"])).toEqual({ hour: 12, minute: 50 });
    expect(parseClockTime(["las doce en punto"])).toEqual({ hour: 12, minute: 0 });
    expect(parseClockTime(["las cinco y veinte"])).toEqual({ hour: 5, minute: 20 });
    expect(parseClockTime(["4:30"])).toEqual({ hour: 4, minute: 30 });
    expect(parseClockTime(["hola"])).toBeNull();
  });
});
