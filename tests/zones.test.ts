/**
 * Integridad del mundo: cada puerta lleva a algún sitio y vuelve, cada punto
 * de llegada está en el suelo, ninguna zona queda partida en dos y todo el
 * mapa se puede recorrer. Un fallo aquí sería un bug de contenido que la niña
 * encontraría jugando.
 */
import { describe, expect, it } from "vitest";
import { GAME_H, GAME_W } from "../src/config";
import { NavGrid, pointInPolygon } from "../src/core/navmesh";
import { Projection } from "../src/core/perspective";
import { toPx, walkAreaPx, ZONES, type ZoneDef, type ZoneId } from "../src/content/zones";

const zones = Object.values(ZONES) as ZoneDef[];
const byId = new Map(zones.map((z) => [z.id, z]));
const grids = new Map<ZoneId, { nav: NavGrid; proj: Projection }>();
for (const z of zones) {
  const proj = new Projection(z.perspective, GAME_W, GAME_H);
  grids.set(z.id, { nav: new NavGrid(walkAreaPx(z), proj), proj });
}

/** Distancia real (m) de un punto al suelo caminable más cercano. */
function offFloorM(z: ZoneDef, p: readonly [number, number]): number {
  const { nav, proj } = grids.get(z.id)!;
  const px = toPx(p);
  return proj.floorDistance(px, nav.nearestWalkable(px));
}

describe("mundo", () => {
  it("tiene las 23 zonas (casa, ala de la fiesta y segunda planta)", () => {
    expect(zones.map((z) => z.id).sort()).toEqual(
      ["alcoba", "archivo", "aula", "baile", "biblioteca", "cocina", "comedor", "costura", "desvan", "dormitorio", "estudio", "galeria",
        "invernadero", "jardin", "musica", "observatorio", "pajarera", "rellano", "taller", "teatro", "torre", "tuneles", "vestibulo"],
    );
  });

  for (const z of zones) {
    describe(z.id, () => {
      it("perspectiva coherente: el suelo está por debajo del horizonte", () => {
        const topOfFloor = Math.min(...z.walk.outer.map(([, y]) => y));
        expect(topOfFloor).toBeGreaterThan(z.perspective.horizon + 0.02);
        expect(z.perspective.k).toBeGreaterThan(0.2);
        expect(z.perspective.k).toBeLessThan(2);
      });

      it("coordenadas dentro del cuadro", () => {
        const all = [
          ...z.walk.outer, ...(z.walk.holes ?? []).flat(), ...z.poi, z.spawn,
          ...z.exits.flatMap((e) => [...e.hotspot, e.approach]), ...z.props.flatMap((p) => [...p.hotspot, p.approach]),
        ];
        for (const [x, y] of all) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(1);
        }
      });

      it("inicio, puntos de interés y puntos de acceso están sobre el suelo (±30 cm)", () => {
        const points: [string, readonly [number, number]][] = [
          ["spawn", z.spawn],
          ...z.poi.map((p, i) => [`poi${i}`, p] as [string, readonly [number, number]]),
          ...z.exits.map((e) => [`salida ${e.id}`, e.approach] as [string, readonly [number, number]]),
          ...z.props.map((p) => [`objeto ${p.id}`, p.approach] as [string, readonly [number, number]]),
        ];
        for (const [name, p] of points) {
          expect(offFloorM(z, p), `${z.id}: ${name} fuera del suelo`).toBeLessThan(0.3);
        }
      });

      it("el suelo no está partido: desde el inicio se llega a todo", () => {
        const { nav } = grids.get(z.id)!;
        const start = nav.nearestWalkable(toPx(z.spawn));
        const targets = [...z.poi, ...z.exits.map((e) => e.approach), ...z.props.map((p) => p.approach)];
        for (const t of targets) {
          const goal = nav.nearestWalkable(toPx(t));
          const path = nav.findPath(start, goal);
          const already = Math.hypot(goal.x - start.x, goal.y - start.y) < 2;
          expect(path.length > 0 || already, `${z.id}: no se llega a ${t}`).toBe(true);
        }
      });

      it("cada salida lleva a una zona que tiene la salida de vuelta", () => {
        for (const e of z.exits) {
          const target = byId.get(e.to);
          expect(target, `${z.id}.${e.id} -> zona ${e.to} inexistente`).toBeDefined();
          const back = target!.exits.find((x) => x.id === e.toExit);
          expect(back, `${z.id}.${e.id} -> ${e.to}.${e.toExit} inexistente`).toBeDefined();
          expect(back!.to).toBe(z.id);
          expect(back!.toExit).toBe(e.id);
        }
      });

      it("ids únicos dentro de la zona", () => {
        const ids = [...z.exits.map((e) => e.id), ...z.props.map((p) => p.id)];
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("las zonas tocables no se pisan entre sí (un toque, una cosa)", () => {
        // Fracción del polígono menor que cae dentro del otro, muestreando una rejilla.
        const hs = [...z.exits, ...z.props].map((h) => ({ id: h.id, poly: h.hotspot.map(([x, y]) => ({ x, y })) }));
        const area = (poly: { x: number; y: number }[]) =>
          Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
        const overlap = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
          const xs = a.map((p) => p.x);
          const ys = a.map((p) => p.y);
          let inA = 0;
          let inBoth = 0;
          for (let i = 0; i <= 40; i += 1) {
            for (let j = 0; j <= 40; j += 1) {
              const p = { x: Math.min(...xs) + ((Math.max(...xs) - Math.min(...xs)) * i) / 40, y: Math.min(...ys) + ((Math.max(...ys) - Math.min(...ys)) * j) / 40 };
              if (!pointInPolygon(p, a)) continue;
              inA += 1;
              if (pointInPolygon(p, b)) inBoth += 1;
            }
          }
          return inA ? inBoth / inA : 0;
        };
        for (let i = 0; i < hs.length; i += 1) {
          for (let j = i + 1; j < hs.length; j += 1) {
            const [small, big] = area(hs[i].poly) <= area(hs[j].poly) ? [hs[i], hs[j]] : [hs[j], hs[i]];
            expect(overlap(small.poly, big.poly), `${z.id}: ${small.id} solapa con ${big.id}`).toBeLessThan(0.15);
          }
        }
      });

      it("las salidas bloqueadas explican por qué", () => {
        for (const e of z.exits) if (e.requires) expect(e.lockedText, `${z.id}.${e.id}`).toBeTruthy();
      });
    });
  }

  it("todo el mapa está conectado (ignorando cierres de la historia)", () => {
    const seen = new Set<ZoneId>(["vestibulo"]);
    const queue: ZoneId[] = ["vestibulo"];
    while (queue.length) {
      const z = byId.get(queue.shift()!)!;
      for (const e of z.exits) if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    expect(seen.size).toBe(zones.length);
  });

  it("al empezar hay 21 zonas abiertas y solo túneles y torre esperan a la historia", () => {
    const seen = new Set<ZoneId>(["vestibulo"]);
    const queue: ZoneId[] = ["vestibulo"];
    while (queue.length) {
      const z = byId.get(queue.shift()!)!;
      for (const e of z.exits) if (!e.requires && !seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    expect([...seen].sort()).toEqual(
      ["alcoba", "archivo", "aula", "baile", "biblioteca", "cocina", "comedor", "costura", "desvan", "dormitorio", "estudio", "galeria",
        "invernadero", "jardin", "musica", "observatorio", "pajarera", "rellano", "taller", "teatro", "vestibulo"],
    );
  });
});
