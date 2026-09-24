/**
 * Movimiento natural sobre el suelo real (lógica pura, sin Phaser).
 *
 * - Velocidad en m/s con aceleración y frenada: frena justo a tiempo para
 *   llegar al destino sin pasarse (v = √(2·a·d)).
 * - La fase de la zancada avanza con los METROS recorridos, no con el tiempo:
 *   los pies nunca patinan, cerca o lejos de la cámara.
 * - El giro (mirar a izquierda/derecha) tiene histéresis: andar casi en
 *   vertical no hace parpadear al personaje.
 */
import type { Projection, Pt } from "./perspective";

export interface Gait {
  /** Velocidad de crucero (m/s). */
  maxSpeed: number;
  /** Aceleración al arrancar (m/s²). */
  accel: number;
  /** Deceleración al frenar (m/s²). */
  decel: number;
  /** Metros que cubre un ciclo completo de la animación (dos pasos). */
  strideCycleM: number;
  /** Desplazamiento horizontal mínimo (px) para darse la vuelta. */
  turnThresholdPx: number;
}

export type Facing = 1 | -1;

export class Walker {
  path: Pt[] = [];
  speed = 0;
  facing: Facing = 1;
  /** Metros totales recorridos (para la fase de la zancada). */
  distance = 0;
  /** Aceleración real del último fotograma (m/s²), para la inclinación. */
  lastAccel = 0;
  private runMultiplier = 1;

  /** `proj` es pública: al cambiar de zona se sustituye por la de la zona nueva. */
  constructor(public proj: Projection, public pos: Pt, public gait: Gait) {}

  setPath(path: Pt[], run = false): void {
    this.path = path.map((p) => ({ x: p.x, y: p.y }));
    this.runMultiplier = run ? 1.65 : 1;
    this.updateFacing();
  }

  stop(): void {
    this.path = [];
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  get target(): Pt | null {
    return this.path.length ? this.path[this.path.length - 1] : null;
  }

  /** Metros que faltan siguiendo el camino. */
  remainingMeters(): number {
    let total = 0;
    let prev = this.pos;
    for (const p of this.path) {
      total += this.proj.floorDistance(prev, p);
      prev = p;
    }
    return total;
  }

  /** Fase del ciclo de paso en [0, 1). */
  gaitPhase(): number {
    const cycles = this.distance / this.gait.strideCycleM;
    return cycles - Math.floor(cycles);
  }

  /** Velocidad relativa a la de crucero (0..~1.65). */
  speedRatio(): number {
    return this.speed / this.gait.maxSpeed;
  }

  update(dt: number): void {
    const before = this.speed;
    if (!this.path.length) {
      this.speed = 0;
      this.lastAccel = dt > 0 ? (this.speed - before) / dt : 0;
      return;
    }
    const cruise = this.gait.maxSpeed * this.runMultiplier;
    const remaining = this.remainingMeters();
    const canStop = Math.sqrt(2 * this.gait.decel * remaining);
    const desired = Math.min(cruise, canStop);
    if (this.speed < desired) {
      this.speed = Math.min(desired, this.speed + this.gait.accel * dt);
    } else {
      // Sigue la curva de frenada v = √(2·a·d). Al final de la curva, por ser
      // discreta, hace falta algo más que a·dt por fotograma: se permite hasta
      // 3× para no quedarse por encima y acabar en un frenazo seco.
      this.speed = Math.max(desired, this.speed - 3 * this.gait.decel * dt);
    }

    // Nunca quedarse clavado a milímetros del destino.
    let move = Math.max(this.speed * dt, Math.min(remaining, 0.004));
    while (move > 1e-9 && this.path.length) {
      const next = this.path[0];
      const d = this.proj.floorDistance(this.pos, next);
      if (d <= move) {
        this.pos = { x: next.x, y: next.y };
        this.distance += d;
        move -= d;
        this.path.shift();
        this.updateFacing();
      } else {
        this.pos = this.proj.advance(this.pos, next, move);
        this.distance += move;
        move = 0;
      }
    }
    if (!this.path.length) this.speed = 0;
    this.lastAccel = dt > 0 ? (this.speed - before) / dt : 0;
  }

  /** Mira hacia donde va el tramo actual, solo si hay desplazamiento lateral claro. */
  private updateFacing(): void {
    const next = this.path[0];
    if (!next) return;
    const dx = next.x - this.pos.x;
    if (Math.abs(dx) >= this.gait.turnThresholdPx) this.facing = dx > 0 ? 1 : -1;
  }

  /** Girarse hacia un punto (p. ej. para hablar con alguien). */
  face(point: Pt): void {
    const dx = point.x - this.pos.x;
    if (Math.abs(dx) >= 1) this.facing = dx > 0 ? 1 : -1;
  }
}

/** Marchas de referencia (m/s, m/s², m). */
export const GAITS = {
  /** Niña de 9 años, paso vivo. Zancada ≈ 0,53 m → ciclo de 2 pasos ≈ 1,05 m. */
  paula: { maxSpeed: 1.35, accel: 3.2, decel: 3.6, strideCycleM: 1.05, turnThresholdPx: 14 },
  /** Gato: pasos cortos y rápidos; trota para alcanzar a Paula. */
  gafe: { maxSpeed: 1.45, accel: 4.5, decel: 5, strideCycleM: 0.44, turnThresholdPx: 10 },
  /** Adulto tranquilo. */
  adult: { maxSpeed: 1.0, accel: 1.6, decel: 2.0, strideCycleM: 1.4, turnThresholdPx: 18 },
  /** Fantasma: se desliza despacio y con inercia. */
  ghost: { maxSpeed: 0.55, accel: 0.5, decel: 0.6, strideCycleM: 1, turnThresholdPx: 24 },
} satisfies Record<string, Gait>;
