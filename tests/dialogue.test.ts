import { describe, expect, it } from "vitest";
import { DialogueRunner, type DialogueTree } from "../src/core/dialogue";
import { newGame } from "../src/core/state";

const tree: DialogueTree = {
  npc: "elvira",
  entries: [
    { if: { has: "engranaje" }, node: "gracias" },
    { if: { met: "elvira" }, node: "otra-vez" },
    { node: "hola" },
  ],
  nodes: [
    { id: "hola", lines: ["¿Una visita?", { by: "paula", text: "Hola, soy Paula." }], next: "menu" },
    {
      id: "menu", lines: ["¿Qué quieres saber?"],
      choices: [
        { id: "reloj", text: "¿Qué es ese reloj?", goto: "reloj", once: true },
        { id: "pista", text: "¿Me das una pista?", if: { seen: ["elvira", "reloj"] }, goto: "pista" },
        { id: "adios", text: "Adiós", effects: [{ affinity: ["elvira", 5] }] },
      ],
    },
    { id: "reloj", lines: ["Mide deudas, no horas."], effects: [{ set: "sabe-reloj" }], next: "menu" },
    { id: "pista", lines: ["Siete noches, nueve campanadas."], effects: [{ give: "pagina" }] },
    { id: "otra-vez", lines: ["Otra vez tú."], next: "menu" },
    { id: "gracias", lines: ["¡Mi engranaje!"], effects: [{ take: "engranaje" }, { stage: ["reloj", 2] }] },
  ],
};

describe("DialogueRunner", () => {
  it("encadena nodos, registra lo visto y aplica efectos", () => {
    const s = newGame();
    const r = new DialogueRunner(tree, s);
    const a = r.start()!;
    expect(a.lines.map((l) => l.by)).toEqual(["elvira", "paula", "elvira"]);
    expect(a.choices.map((c) => c.id)).toEqual(["reloj", "adios"]);
    const b = r.choose("reloj")!;
    expect(s.flags["sabe-reloj"]).toBe(true);
    // "reloj" era de una vez: ya no sale; "pista" aparece porque ya lo contó.
    expect(b.choices.map((c) => c.id)).toEqual(["pista", "adios"]);
    const c = r.choose("pista")!;
    expect(c.final).toBe(true);
    expect(c.notices).toEqual([{ type: "item", item: "pagina" }]);
    expect(s.npc.elvira.seen).toEqual(["hola", "menu", "reloj", "pista"]);
  });

  it("recuerda a Paula: la segunda vez saluda distinto", () => {
    const s = newGame();
    new DialogueRunner(tree, s).start();
    const again = new DialogueRunner(tree, s).start()!;
    expect(again.lines[0].text).toBe("Otra vez tú.");
  });

  it("lo específico de la historia tiene prioridad", () => {
    const s = newGame();
    s.inventory.push("engranaje");
    const step = new DialogueRunner(tree, s).start()!;
    expect(step.lines[0].text).toBe("¡Mi engranaje!");
    expect(s.inventory).not.toContain("engranaje");
    expect(s.quests.reloj.stage).toBe(2);
    expect(step.final).toBe(true);
  });

  it("no acepta elegir opciones ocultas ni inexistentes", () => {
    const s = newGame();
    const r = new DialogueRunner(tree, s);
    r.start();
    expect(r.choose("pista")).toBeNull();
    expect(r.choose("no-existe")).toBeNull();
  });

  it("elegir sin destino cierra la conversación aplicando sus efectos", () => {
    const s = newGame();
    const r = new DialogueRunner(tree, s);
    r.start();
    const end = r.choose("adios")!;
    expect(end.final).toBe(true);
    expect(s.npc.elvira.affinity).toBe(5);
  });
});
