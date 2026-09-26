import { describe, expect, it } from "vitest";
import { matchChoice, normalize, parseSpanishNumber } from "../src/core/speech";
import { PUZZLES } from "../src/content/puzzles";

describe("números dichos en voz alta", () => {
  it("entiende cifras y palabras", () => {
    expect(parseSpanishNumber("63")).toBe(63);
    expect(parseSpanishNumber("sesenta y tres")).toBe(63);
    expect(parseSpanishNumber("Son sesenta y tres campanadas")).toBe(63);
    expect(parseSpanishNumber("doce")).toBe(12);
    expect(parseSpanishNumber("ciento cuarenta y cuatro")).toBe(144);
    expect(parseSpanishNumber("veintiuno")).toBe(21);
    expect(parseSpanishNumber("siete")).toBe(7);
    expect(parseSpanishNumber("cien")).toBe(100);
    expect(parseSpanishNumber("mil doscientos treinta")).toBe(1230);
    expect(parseSpanishNumber("no lo sé")).toBeNull();
  });

  it("todas las respuestas numéricas de los puzzles se pueden decir con palabras", () => {
    const words: Record<number, string> = {
      63: "sesenta y tres", 12: "doce", 84: "ochenta y cuatro", 60: "sesenta", 15: "quince", 144: "ciento cuarenta y cuatro",
      18: "dieciocho", 30: "treinta", 48: "cuarenta y ocho", 24: "veinticuatro", 72: "setenta y dos", 8: "ocho",
      21: "veintiuno", 45: "cuarenta y cinco", 7: "siete", 65: "sesenta y cinco", 42: "cuarenta y dos", 2: "dos",
    };
    for (const p of Object.values(PUZZLES)) {
      for (const s of p.steps) {
        if (s.kind !== "number") continue;
        expect(words[s.answer], `falta ${s.answer}`).toBeDefined();
        expect(parseSpanishNumber(words[s.answer])).toBe(s.answer);
      }
    }
  });
});

describe("elegir opciones con la voz", () => {
  const opts = ["¿Quién es usted de verdad?", "¿Qué puerta es la segura?", "Hasta luego."];

  it("por número u ordinal", () => {
    expect(matchChoice(["la dos"], opts)).toBe(1);
    expect(matchChoice(["la segunda"], opts)).toBe(1);
    expect(matchChoice(["uno"], opts)).toBe(0);
    expect(matchChoice(["3"], opts)).toBe(2);
  });

  it("por el texto, aunque no sea exacto", () => {
    expect(matchChoice(["quién es usted"], opts)).toBe(0);
    expect(matchChoice(["qué puerta es segura"], opts)).toBe(1);
    expect(matchChoice(["hasta luego"], opts)).toBe(2);
  });

  it("prueba todas las alternativas del reconocedor", () => {
    expect(matchChoice(["asta lugo", "hasta luego"], opts)).toBe(2);
  });

  it("si no se parece a nada, no elige", () => {
    expect(matchChoice(["plátano"], opts)).toBeNull();
  });

  it("notas musicales y nombres", () => {
    expect(matchChoice(["do"], ["DO", "RE", "MI", "FA", "SOL", "LA"])).toBe(0);
    expect(matchChoice(["gafe"], ["Don Basilio", "Gafe", "Elvira", "Tomás"])).toBe(1);
    expect(matchChoice(["cuando"], ["DO", "RE", "MI"])).toBeNull();
    expect(matchChoice(["tomás"], ["Aurelia", "Tomás", "Elvira"])).toBe(1);
  });

  it("normaliza tildes y signos", () => {
    expect(normalize("¿Qué puerta ES la segura?")).toBe("que puerta es la segura");
  });
});
