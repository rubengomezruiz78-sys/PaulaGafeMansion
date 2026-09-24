import { describe, expect, it } from "vitest";
import { NpcBrain, type Intent, type Perception, type Personality } from "../src/core/npcBrain";
import { Rng } from "../src/core/rng";

const pois = [{ x: 400, y: 900 }, { x: 900, y: 800 }, { x: 1400, y: 950 }];
const calm: Personality = { restlessness: 0.5, chattiness: 0.5, noticeRadiusM: 2.5, attendRadiusM: 3 };
const base = (over: Partial<Perception> = {}): Perception => ({
  now: 0, self: { x: 900, y: 800 }, selfMoving: false, player: null, playerDistM: Infinity, ...over,
});
const has = (intents: Intent[], type: Intent["type"]) => intents.some((i) => i.type === type);

describe("NpcBrain", () => {
  it("saluda una sola vez cuando Paula se acerca", () => {
    const brain = new NpcBrain(new Rng(1), calm, pois);
    const far = brain.think(base({ now: 1, player: { x: 100, y: 1000 }, playerDistM: 6 }));
    expect(far.some((i) => i.type === "bark" && i.kind === "greet")).toBe(false);
    const near = brain.think(base({ now: 2, player: { x: 800, y: 820 }, playerDistM: 1.5 }));
    expect(near.some((i) => i.type === "bark" && i.kind === "greet")).toBe(true);
    expect(has(near, "face")).toBe(true);
    const again = brain.think(base({ now: 10, player: { x: 800, y: 820 }, playerDistM: 1.5 }));
    expect(again.some((i) => i.type === "bark" && i.kind === "greet")).toBe(false);
  });

  it("mientras habla con Paula se queda quieto y la mira", () => {
    const brain = new NpcBrain(new Rng(2), calm, pois);
    brain.beginTalk();
    const out = brain.think(base({ now: 5, player: { x: 700, y: 900 }, playerDistM: 1 }));
    expect(out).toEqual([{ type: "stop" }, { type: "face", target: { x: 700, y: 900 } }]);
    brain.endTalk(5);
    expect(brain.stateKind).toBe("idle");
  });

  it("deambula entre puntos de interés distintos y descansa al llegar", () => {
    const brain = new NpcBrain(new Rng(3), { ...calm, restlessness: 1 }, pois);
    const targets: string[] = [];
    let self = { x: 900, y: 800 };
    for (let t = 0; t < 200; t += 0.5) {
      const out = brain.think(base({ now: t, self, selfMoving: brain.stateKind === "wander" && t % 3 !== 0 }));
      for (const i of out) {
        if (i.type === "moveTo") {
          targets.push(`${i.target.x},${i.target.y}`);
          self = i.target;
        }
      }
    }
    expect(targets.length).toBeGreaterThan(4);
    for (let i = 1; i < targets.length; i += 1) expect(targets[i]).not.toBe(targets[i - 1]);
  });

  it("es reproducible con la misma semilla", () => {
    const run = () => {
      const b = new NpcBrain(new Rng(42), calm, pois);
      const log: string[] = [];
      for (let t = 0; t < 120; t += 0.5) {
        for (const i of b.think(base({ now: t, player: { x: 800, y: 850 }, playerDistM: 3.5 }))) log.push(`${t}:${i.type}`);
      }
      return log.join("|");
    };
    expect(run()).toBe(run());
  });

  it("los comentarios ambientales respetan una pausa mínima", () => {
    const brain = new NpcBrain(new Rng(7), { ...calm, chattiness: 1 }, pois);
    const barks: number[] = [];
    for (let t = 0; t < 600; t += 0.25) {
      for (const i of brain.think(base({ now: t, player: { x: 850, y: 820 }, playerDistM: 3.8 }))) {
        if (i.type === "bark") barks.push(t);
      }
    }
    expect(barks.length).toBeGreaterThan(2);
    for (let i = 1; i < barks.length; i += 1) expect(barks[i] - barks[i - 1]).toBeGreaterThan(14);
  });
});
