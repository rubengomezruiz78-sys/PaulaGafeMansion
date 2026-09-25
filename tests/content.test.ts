import { describe, expect, it } from "vitest";
import { solveGame } from "../src/content/solver";
import { validateContent } from "../src/content/validate";
import { MEMORIES } from "../src/content/items";

describe("contenido de la historia", () => {
  it("el validador no encuentra referencias rotas", () => {
    expect(validateContent()).toEqual([]);
  });

  it("la partida se puede terminar", () => {
    const r = solveGame();
    expect(r.finished, r.log.join("\n")).toBe(true);
    for (const m of MEMORIES) expect(r.state.inventory).toContain(m);
  });

  it("se puede terminar sin oír ninguna charla (las charlas solo ayudan)", () => {
    expect(solveGame({ chats: false }).finished).toBe(true);
  });

  it("también se completa el escondite de Pepito (tres salas distintas)", () => {
    const r = solveGame();
    expect(r.state.quests.escondite?.done).toBe(true);
    expect(r.state.counters["pepito-pillado"]).toBe(3);
  });

  it("no hace falta la ayuda de Clotilde para encontrar el sello", () => {
    expect(solveGame({ ignoreNpcs: ["clotilde"] }).finished).toBe(true);
  });
});
