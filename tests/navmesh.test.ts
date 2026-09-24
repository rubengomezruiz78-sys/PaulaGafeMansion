import { describe, expect, it } from "vitest";
import { NavGrid, inWalkArea, type WalkArea } from "../src/core/navmesh";
import { Projection } from "../src/core/perspective";

const proj = new Projection({ horizon: 0.5, k: 1.0, focal: 1.0 }, 1920, 1080);
const box = (x0: number, y0: number, x1: number, y1: number) => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

function assertValidPath(grid: NavGrid, from: { x: number; y: number }, path: { x: number; y: number }[]) {
  let prev = grid.nearestWalkable(from);
  for (const p of path) {
    expect(grid.isWalkable(p)).toBe(true);
    expect(grid.lineOfSight(prev, p)).toBe(true);
    prev = p;
  }
}

describe("NavGrid", () => {
  const open: WalkArea = { outer: box(100, 640, 1820, 1060) };

  it("en campo abierto va directo (un solo tramo)", () => {
    const grid = new NavGrid(open, proj);
    const path = grid.findPath({ x: 200, y: 1000 }, { x: 1700, y: 700 });
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ x: 1700, y: 700 });
  });

  it("rodea un obstáculo y todos los tramos son caminables", () => {
    const area: WalkArea = { outer: box(100, 640, 1820, 1060), holes: [box(800, 660, 1100, 1040)] };
    const grid = new NavGrid(area, proj);
    const from = { x: 300, y: 850 };
    const path = grid.findPath(from, { x: 1600, y: 850 });
    expect(path.length).toBeGreaterThan(1);
    assertValidPath(grid, from, path);
    expect(path[path.length - 1]).toEqual({ x: 1600, y: 850 });
  });

  it("un destino fuera del suelo se ajusta al punto caminable más cercano", () => {
    const grid = new NavGrid(open, proj);
    const path = grid.findPath({ x: 500, y: 900 }, { x: 500, y: 300 });
    expect(path).toHaveLength(1);
    expect(inWalkArea(path[0], open)).toBe(true);
    expect(path[0].y).toBeLessThan(700);
  });

  it("si ya está en el destino no hay camino", () => {
    const grid = new NavGrid(open, proj);
    expect(grid.findPath({ x: 900, y: 900 }, { x: 900, y: 900 })).toEqual([]);
  });

  it("zonas desconectadas no tienen camino", () => {
    const area: WalkArea = { outer: box(100, 640, 1820, 1060), holes: [box(900, 600, 1000, 1080)] };
    const grid = new NavGrid(area, proj);
    expect(grid.findPath({ x: 300, y: 850 }, { x: 1600, y: 850 })).toEqual([]);
  });

  it("elige la ruta más corta en METROS, no en píxeles (rodea por delante)", () => {
    // Obstáculo centrado en pantalla: por píxeles ambos rodeos son parecidos,
    // pero al fondo el suelo está comprimido y cada píxel son más metros.
    const area: WalkArea = { outer: box(100, 600, 1820, 1070), holes: [box(860, 640, 1060, 1030)] };
    const grid = new NavGrid(area, proj);
    const from = { x: 700, y: 835 };
    const path = grid.findPath(from, { x: 1220, y: 835 });
    assertValidPath(grid, from, path);
    const detour = path.slice(0, -1);
    expect(detour.length).toBeGreaterThan(0);
    for (const p of detour) expect(p.y).toBeGreaterThan(835);
  });

  it("encuentra caminos rápido en una rejilla completa", () => {
    const area: WalkArea = { outer: box(0, 560, 1920, 1080), holes: [box(400, 600, 500, 1000), box(900, 640, 1000, 1080), box(1400, 580, 1500, 980)] };
    const grid = new NavGrid(area, proj);
    const t0 = performance.now();
    const path = grid.findPath({ x: 50, y: 1050 }, { x: 1880, y: 600 });
    const ms = performance.now() - t0;
    assertValidPath(grid, { x: 50, y: 1050 }, path);
    expect(ms).toBeLessThan(250);
  });
});
