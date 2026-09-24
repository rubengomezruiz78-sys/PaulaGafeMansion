import { describe, expect, it } from "vitest";
import { Projection } from "../src/core/perspective";

const W = 1920;
const H = 1080;
const proj = new Projection({ horizon: 0.575, k: 1.0, focal: 1.0 }, W, H);

describe("Projection", () => {
  it("ida y vuelta pantalla <-> suelo es exacta", () => {
    for (const p of [{ x: 100, y: 1000 }, { x: 960, y: 700 }, { x: 1800, y: 850 }]) {
      const back = proj.fromFloor(proj.toFloor(p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it("la altura en px de algo es ppm·metros y crece hacia delante", () => {
    const front = proj.heightPx(1026, 1.3);
    const back = proj.heightPx(745, 1.3);
    expect(front).toBeCloseTo(proj.ppm(1026) * 1.3, 9);
    expect(front).toBeGreaterThan(back * 3);
  });

  it("un metro lateral a una profundidad son ppm píxeles", () => {
    const y = 900;
    const a = { x: 700, y };
    const b = { x: 700 + proj.ppm(y), y };
    expect(proj.floorDistance(a, b)).toBeCloseTo(1, 6);
  });

  it("la distancia en profundidad coincide con la diferencia de Z", () => {
    const a = { x: W / 2, y: 1000 };
    const b = { x: W / 2, y: 760 };
    expect(proj.floorDistance(a, b)).toBeCloseTo(Math.abs(proj.toFloor(a).Z - proj.toFloor(b).Z), 9);
  });

  it("alejarse cubre más metros por píxel que acercarse (suelo comprimido al fondo)", () => {
    const near = proj.floorDistance({ x: 960, y: 1000 }, { x: 960, y: 980 });
    const far = proj.floorDistance({ x: 960, y: 760 }, { x: 960, y: 740 });
    expect(far).toBeGreaterThan(near * 5);
  });

  it("advance recorre exactamente los metros pedidos y no se pasa", () => {
    const from = { x: 300, y: 1000 };
    const to = { x: 1500, y: 780 };
    const total = proj.floorDistance(from, to);
    const mid = proj.advance(from, to, total / 3);
    expect(proj.floorDistance(from, mid)).toBeCloseTo(total / 3, 6);
    expect(proj.floorDistance(mid, to)).toBeCloseTo((total * 2) / 3, 6);
    expect(proj.advance(from, to, total * 5)).toEqual(to);
  });

  it("avanzar a velocidad constante da el mismo número de pasos cerca y lejos", () => {
    // 1 m hacia la derecha cerca y lejos: mismos metros aunque distintos píxeles.
    const nearFrom = { x: 500, y: 1000 };
    const farFrom = { x: 500, y: 760 };
    const nearTo = proj.advance(nearFrom, { x: 1900, y: 1000 }, 1);
    const farTo = proj.advance(farFrom, { x: 1900, y: 760 }, 1);
    expect(proj.floorDistance(nearFrom, nearTo)).toBeCloseTo(1, 6);
    expect(proj.floorDistance(farFrom, farTo)).toBeCloseTo(1, 6);
    expect(nearTo.x - nearFrom.x).toBeGreaterThan(farTo.x - farFrom.x);
  });

  it("proporciones: un adulto de 1,70 m es 1,31× Paula a la misma profundidad", () => {
    const y = 900;
    expect(proj.heightPx(y, 1.7) / proj.heightPx(y, 1.3)).toBeCloseTo(1.7 / 1.3, 9);
  });

  it("rechaza calibraciones imposibles", () => {
    expect(() => new Projection({ horizon: 0.5, k: 0, focal: 1 }, W, H)).toThrow();
  });
});
