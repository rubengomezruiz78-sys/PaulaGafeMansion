/**
 * Perspectiva de una escena pintada, modelada como cámara estenopeica que mira
 * en horizontal. Todo se mide en metros sobre el suelo, así las proporciones
 * son reales y un paso de 50 cm mide 50 cm cerca y lejos de la cámara.
 *
 * Con horizonte hPx = horizon·H, focal f = focal·H y altura de cámara c = 1/k:
 *   - un punto del suelo (X, Z) en metros se ve en  x = W/2 + X·f/Z,  y = hPx + f·c/Z
 *   - píxeles por metro a esa profundidad:          ppm = f/Z = k·(y − hPx)
 * La proyección es exacta en ambos sentidos, así que distancias y avances se
 * calculan sobre el suelo real y la perspectiva conserva las rectas.
 */

export interface PerspectiveCalib {
  /** Línea de horizonte, fracción de la altura de la escena (0 arriba, 1 abajo). */
  horizon: number;
  /** Inverso de la altura de cámara (m⁻¹). ppm(y) = k·(y − horizonte en px). */
  k: number;
  /** Focal relativa a la altura de la escena (≈1 para un objetivo normal). */
  focal: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface FloorPt {
  /** Metros a la derecha del eje de la cámara. */
  X: number;
  /** Metros de profundidad desde la cámara. */
  Z: number;
}

/** Distancia mínima bajo el horizonte (px): nada se puede pisar en el horizonte. */
const MIN_BELOW_HORIZON = 2;

export class Projection {
  readonly hPx: number;
  readonly focalPx: number;
  /** Altura de la cámara en metros. */
  readonly cameraHeight: number;

  constructor(readonly calib: PerspectiveCalib, readonly width: number, readonly height: number) {
    if (calib.k <= 0 || calib.focal <= 0) throw new Error("Perspectiva inválida: k y focal deben ser > 0");
    this.hPx = calib.horizon * height;
    this.focalPx = calib.focal * height;
    this.cameraHeight = 1 / calib.k;
  }

  private below(y: number): number {
    return Math.max(y - this.hPx, MIN_BELOW_HORIZON);
  }

  /** Píxeles por metro para algo apoyado en el suelo a la altura de pantalla `y`. */
  ppm(y: number): number {
    return this.calib.k * this.below(y);
  }

  /** Altura en píxeles de algo que mide `meters` con los pies en `y`. */
  heightPx(y: number, meters: number): number {
    return this.ppm(y) * meters;
  }

  /** Escala de un sprite para que `realHeightM` mida lo que toca con los pies en `y`. */
  spriteScale(y: number, realHeightM: number, refHeightPx: number): number {
    return this.heightPx(y, realHeightM) / refHeightPx;
  }

  toFloor(p: Pt): FloorPt {
    const Z = (this.focalPx * this.cameraHeight) / this.below(p.y);
    const X = ((p.x - this.width / 2) * Z) / this.focalPx;
    return { X, Z };
  }

  fromFloor(f: FloorPt): Pt {
    return {
      x: this.width / 2 + (f.X * this.focalPx) / f.Z,
      y: this.hPx + (this.focalPx * this.cameraHeight) / f.Z,
    };
  }

  /** Distancia real sobre el suelo (metros) entre dos puntos de pantalla. */
  floorDistance(a: Pt, b: Pt): number {
    const fa = this.toFloor(a);
    const fb = this.toFloor(b);
    return Math.hypot(fb.X - fa.X, fb.Z - fa.Z);
  }

  /**
   * Punto de pantalla tras recorrer `meters` de suelo desde `from` hacia
   * `toward` (en línea recta real). No se pasa del destino.
   */
  advance(from: Pt, toward: Pt, meters: number): Pt {
    const fa = this.toFloor(from);
    const fb = this.toFloor(toward);
    const dist = Math.hypot(fb.X - fa.X, fb.Z - fa.Z);
    if (dist <= meters || dist === 0) return { x: toward.x, y: toward.y };
    const t = meters / dist;
    return this.fromFloor({ X: fa.X + (fb.X - fa.X) * t, Z: fa.Z + (fb.Z - fa.Z) * t });
  }
}
