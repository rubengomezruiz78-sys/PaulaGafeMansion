import { describe, expect, it } from "vitest";
import { Projection } from "../src/core/perspective";
import { GAITS, Walker } from "../src/core/walker";

const proj = new Projection({ horizon: 0.575, k: 1.0, focal: 1.0 }, 1920, 1080);
const run = (w: Walker, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) w.update(dt);
};

describe("Walker", () => {
  it("llega exactamente al destino y se detiene sin pasarse", () => {
    const w = new Walker(proj, { x: 300, y: 1000 }, GAITS.paula);
    w.setPath([{ x: 1500, y: 800 }]);
    let maxOvershoot = 0;
    const target = { x: 1500, y: 800 };
    for (let i = 0; i < 60 * 10; i += 1) {
      w.update(1 / 60);
      maxOvershoot = Math.max(maxOvershoot, w.pos.x - target.x);
    }
    expect(w.moving).toBe(false);
    expect(w.pos).toEqual(target);
    expect(maxOvershoot).toBeLessThanOrEqual(0);
  });

  it("acelera de forma progresiva y no supera la velocidad de crucero", () => {
    const w = new Walker(proj, { x: 100, y: 1000 }, GAITS.paula);
    w.setPath([{ x: 1850, y: 1000 }]);
    const speeds: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      w.update(1 / 60);
      speeds.push(w.speed);
    }
    expect(speeds[0]).toBeLessThan(0.1);
    for (let i = 1; i < speeds.length; i += 1) expect(speeds[i]).toBeGreaterThanOrEqual(speeds[i - 1]);
    run(w, 1);
    expect(w.speed).toBeLessThanOrEqual(GAITS.paula.maxSpeed + 1e-9);
  });

  it("frena suave al final (la última velocidad es baja)", () => {
    const w = new Walker(proj, { x: 300, y: 1000 }, GAITS.paula);
    w.setPath([{ x: 1300, y: 1000 }]);
    let prev = 0;
    let lastBeforeStop = 0;
    for (let i = 0; i < 600 && w.moving; i += 1) {
      prev = w.speed;
      w.update(1 / 60);
      if (w.moving) lastBeforeStop = w.speed;
    }
    expect(lastBeforeStop).toBeLessThan(0.3);
    expect(prev).toBeLessThan(0.3);
  });

  it("la zancada avanza con los metros: sin patinar cerca ni lejos", () => {
    const near = new Walker(proj, { x: 200, y: 1000 }, GAITS.paula);
    const far = new Walker(proj, { x: 200, y: 740 }, GAITS.paula);
    near.setPath([proj.advance({ x: 200, y: 1000 }, { x: 1900, y: 1000 }, 3)]);
    far.setPath([proj.advance({ x: 200, y: 740 }, { x: 1900, y: 740 }, 3)]);
    run(near, 8);
    run(far, 8);
    expect(near.distance).toBeCloseTo(3, 3);
    expect(far.distance).toBeCloseTo(3, 3);
    expect(near.gaitPhase()).toBeCloseTo(far.gaitPhase(), 3);
  });

  it("recorrer un camino con varios tramos suma exactamente su longitud", () => {
    const w = new Walker(proj, { x: 200, y: 1000 }, GAITS.paula);
    const path = [{ x: 700, y: 900 }, { x: 1100, y: 1010 }, { x: 1500, y: 780 }];
    w.setPath(path);
    const expected = w.remainingMeters();
    run(w, 15);
    expect(w.pos).toEqual(path[2]);
    expect(w.distance).toBeCloseTo(expected, 6);
  });

  it("no se gira al andar casi en vertical (histéresis)", () => {
    const w = new Walker(proj, { x: 900, y: 1000 }, GAITS.paula);
    w.facing = -1;
    w.setPath([{ x: 905, y: 760 }]);
    run(w, 6);
    expect(w.facing).toBe(-1);
    w.setPath([{ x: 1400, y: 760 }]);
    expect(w.facing).toBe(1);
  });

  it("correr es más rápido que andar", () => {
    const a = new Walker(proj, { x: 100, y: 1000 }, GAITS.paula);
    const b = new Walker(proj, { x: 100, y: 1000 }, GAITS.paula);
    a.setPath([{ x: 1850, y: 1000 }]);
    b.setPath([{ x: 1850, y: 1000 }], true);
    run(a, 1.5);
    run(b, 1.5);
    expect(b.distance).toBeGreaterThan(a.distance * 1.3);
  });
});
