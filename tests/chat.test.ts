import { describe, expect, it } from "vitest";
import { CHAT_GAP, ChatDirector, heardFlag, type ChatDef } from "../src/core/chat";
import { Rng } from "../src/core/rng";
import { newGame } from "../src/core/state";

const chats: ChatDef[] = [
  { id: "ambiente", between: ["a", "b"], repeatable: true, lines: [["a", "Buenas noches."], ["b", "Buenas."]] },
  { id: "pista", between: ["a", "b"], if: { flag: "empezado" }, lines: [["a", "El portón…"], ["b", "…se abre con la llave de Tomás."]], effects: [{ set: "sabe-porton" }] },
  { id: "otros", between: ["c", "d"], repeatable: true, lines: [["c", "Hola."], ["d", "Hola."]] },
];

describe("ChatDirector", () => {
  it("solo charlan los que están presentes y libres", () => {
    const d = new ChatDirector(chats, new Rng(1));
    const s = newGame();
    expect(d.pick(["a"], s, 100, -Infinity)).toBeNull();
    expect(d.pick(["a", "b"], s, 100, -Infinity)?.id).toBe("ambiente");
  });

  it("respeta la pausa entre charlas", () => {
    const d = new ChatDirector(chats, new Rng(1));
    const s = newGame();
    expect(d.pick(["c", "d"], s, 100, 100 - CHAT_GAP + 1)).toBeNull();
    expect(d.pick(["c", "d"], s, 100, 100 - CHAT_GAP - 1)).not.toBeNull();
  });

  it("prioriza la charla de historia cuando se cumple su condición, y no la repite si Paula la oyó", () => {
    const d = new ChatDirector(chats, new Rng(1));
    const s = newGame();
    s.flags.empezado = true;
    expect(d.pick(["a", "b"], s, 100, -Infinity)?.id).toBe("pista");
    s.flags[heardFlag("pista")] = true;
    expect(d.pick(["a", "b"], s, 300, -Infinity)?.id).toBe("ambiente");
  });

  it("las de ambiente no se repiten en menos de 3 minutos", () => {
    const d = new ChatDirector(chats, new Rng(1));
    const s = newGame();
    expect(d.pick(["c", "d"], s, 100, -Infinity)?.id).toBe("otros");
    expect(d.pick(["c", "d"], s, 200, -Infinity)).toBeNull();
    expect(d.pick(["c", "d"], s, 290, -Infinity)?.id).toBe("otros");
  });
});
