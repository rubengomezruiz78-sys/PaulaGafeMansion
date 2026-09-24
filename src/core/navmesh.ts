/**
 * Suelo caminable de una zona y búsqueda de caminos.
 *
 * - El suelo es un polígono exterior con huecos (muebles, columnas…), en
 *   píxeles de la escena lógica.
 * - Se rasteriza a una rejilla; A* usa como coste la distancia REAL de suelo
 *   (metros, vía la perspectiva), así el camino más corto lo es de verdad.
 * - El resultado se suaviza tirando de la cuerda con línea de visión: la
 *   perspectiva conserva las rectas, así que un tramo recto en pantalla es un
 *   tramo recto en el suelo real.
 */
import type { Projection, Pt } from "./perspective";

export interface WalkArea {
  outer: Pt[];
  holes?: Pt[][];
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    const crosses = (a.y > p.y) !== (b.y > p.y);
    if (crosses && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function inWalkArea(p: Pt, area: WalkArea): boolean {
  if (!pointInPolygon(p, area.outer)) return false;
  return !(area.holes ?? []).some((hole) => pointInPolygon(p, hole));
}

/** Montículo binario mínimo por prioridad (para A*). */
class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    this.items.push(item);
    this.prio.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop() as number;
    const lastPrio = this.prio.pop() as number;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}

const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly walkable: Uint8Array;

  constructor(
    readonly area: WalkArea,
    readonly projection: Projection,
    readonly cell = 12,
  ) {
    this.cols = Math.ceil(projection.width / cell);
    this.rows = Math.ceil(projection.height / cell);
    this.walkable = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (inWalkArea(this.center(c, r), area)) this.walkable[r * this.cols + c] = 1;
      }
    }
  }

  private center(c: number, r: number): Pt {
    return { x: (c + 0.5) * this.cell, y: (r + 0.5) * this.cell };
  }

  private cellOf(p: Pt): [number, number] {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor(p.x / this.cell)));
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor(p.y / this.cell)));
    return [c, r];
  }

  private isCellWalkable(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.walkable[r * this.cols + c] === 1;
  }

  /** ¿Se puede estar en este punto? (según el polígono exacto, no la rejilla). */
  isWalkable(p: Pt): boolean {
    return inWalkArea(p, this.area);
  }

  /** Punto caminable más cercano (en metros de suelo) a `p`. */
  nearestWalkable(p: Pt): Pt {
    if (this.isWalkable(p)) {
      const [c, r] = this.cellOf(p);
      if (this.isCellWalkable(c, r)) return { x: p.x, y: p.y };
    }
    let best: Pt | null = null;
    let bestD = Infinity;
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (!this.walkable[r * this.cols + c]) continue;
        const q = this.center(c, r);
        const d = this.projection.floorDistance(p, q);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    if (!best) throw new Error("NavGrid sin celdas caminables");
    return best;
  }

  /** ¿Hay línea de visión caminable entre dos puntos? */
  lineOfSight(a: Pt, b: Pt): boolean {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / (this.cell * 0.4)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const [c, r] = this.cellOf({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (!this.isCellWalkable(c, r)) return false;
    }
    return true;
  }

  /**
   * Camino de `from` a `to` como lista de puntos (sin incluir `from`). Si `to`
   * no es caminable se usa el punto caminable más cercano. Devuelve [] si ya
   * se está allí o si no hay camino.
   */
  findPath(from: Pt, to: Pt): Pt[] {
    const start = this.nearestWalkable(from);
    const goal = this.nearestWalkable(to);
    if (this.lineOfSight(start, goal)) {
      return this.projection.floorDistance(start, goal) < 0.02 ? [] : [goal];
    }
    const [sc, sr] = this.cellOf(start);
    const [gc, gr] = this.cellOf(goal);
    const n = this.cols * this.rows;
    const g = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const startIdx = sr * this.cols + sc;
    const goalIdx = gr * this.cols + gc;
    const goalPt = this.center(gc, gr);
    const heap = new MinHeap();
    g[startIdx] = 0;
    heap.push(startIdx, 0);
    while (heap.size > 0) {
      const cur = heap.pop();
      if (cur === goalIdx) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % this.cols;
      const cr = (cur - cc) / this.cols;
      const curPt = this.center(cc, cr);
      for (const [dc, dr] of NEIGHBOURS) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (!this.isCellWalkable(nc, nr)) continue;
        // Sin atajos diagonales por esquinas de obstáculos.
        if (dc !== 0 && dr !== 0 && (!this.isCellWalkable(cc + dc, cr) || !this.isCellWalkable(cc, cr + dr))) continue;
        const ni = nr * this.cols + nc;
        if (closed[ni]) continue;
        const nPt = this.center(nc, nr);
        const cost = g[cur] + this.projection.floorDistance(curPt, nPt);
        if (cost < g[ni]) {
          g[ni] = cost;
          came[ni] = cur;
          heap.push(ni, cost + this.projection.floorDistance(nPt, goalPt));
        }
      }
    }
    if (came[goalIdx] === -1 && goalIdx !== startIdx) return [];
    const cells: Pt[] = [];
    for (let i = goalIdx; i !== -1 && i !== startIdx; i = came[i]) {
      const c = i % this.cols;
      cells.push(this.center(c, (i - c) / this.cols));
    }
    cells.reverse();
    cells[cells.length - 1] = goal;
    return this.smooth(start, cells);
  }

  /** Tira de la cuerda: quita puntos intermedios con línea de visión directa. */
  private smooth(start: Pt, points: Pt[]): Pt[] {
    const out: Pt[] = [];
    let anchor = start;
    let i = 0;
    while (i < points.length) {
      let furthest = i;
      for (let j = points.length - 1; j > i; j -= 1) {
        if (this.lineOfSight(anchor, points[j])) {
          furthest = j;
          break;
        }
      }
      out.push(points[furthest]);
      anchor = points[furthest];
      i = furthest + 1;
    }
    return out;
  }
}
