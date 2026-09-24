/**
 * IA de un personaje no jugador (lógica pura, reproducible con semilla).
 *
 * El cerebro no mueve nada: percibe (dónde está Paula, si se mueve, la hora) y
 * devuelve intenciones (ir a, pararse, mirar a, decir algo). El mundo las
 * ejecuta con el controlador de movimiento. Así se puede probar sin Phaser.
 */
import type { Pt } from "./perspective";
import { Rng } from "./rng";

export interface Personality {
  /** 0..1: ganas de ir de un sitio a otro. */
  restlessness: number;
  /** 0..1: ganas de hablar solo o con Paula (comentarios ambientales). */
  chattiness: number;
  /** Distancia (m) a la que se fija en Paula y la saluda. */
  noticeRadiusM: number;
  /** Distancia (m) a la que se gira educadamente hacia ella. */
  attendRadiusM: number;
}

export interface Perception {
  /** Segundos de juego. */
  now: number;
  self: Pt;
  selfMoving: boolean;
  player: Pt | null;
  /** Distancia real (m) a Paula, Infinity si no está en la zona. */
  playerDistM: number;
}

export type BarkKind = "greet" | "ambient";

export type Intent =
  | { type: "moveTo"; target: Pt }
  | { type: "stop" }
  | { type: "face"; target: Pt }
  | { type: "bark"; kind: BarkKind };

type State =
  | { kind: "idle"; until: number }
  | { kind: "wander"; target: Pt }
  | { kind: "greet"; until: number }
  | { kind: "talk" };

export interface BrainMemory {
  greeted: boolean;
  lastBark: number;
}

export class NpcBrain {
  private state: State = { kind: "idle", until: 0 };
  readonly memory: BrainMemory = { greeted: false, lastBark: -Infinity };
  private lastPoi = -1;

  constructor(
    private readonly rng: Rng,
    readonly personality: Personality,
    private readonly pois: readonly Pt[],
  ) {}

  get stateKind(): State["kind"] {
    return this.state.kind;
  }

  /** Paula empieza a hablar con él: se queda quieto y la mira. */
  beginTalk(): void {
    this.state = { kind: "talk" };
    this.memory.greeted = true;
  }

  endTalk(now: number): void {
    this.state = { kind: "idle", until: now + this.rng.range(2.5, 5) };
  }

  think(p: Perception): Intent[] {
    const out: Intent[] = [];
    const { now } = p;

    if (this.state.kind === "talk") {
      out.push({ type: "stop" });
      if (p.player) out.push({ type: "face", target: p.player });
      return out;
    }

    // Percepción: primera vez que ve a Paula de cerca -> la saluda.
    if (p.player && !this.memory.greeted && p.playerDistM <= this.personality.noticeRadiusM) {
      this.memory.greeted = true;
      this.memory.lastBark = now;
      this.state = { kind: "greet", until: now + 2.8 };
      out.push({ type: "stop" }, { type: "face", target: p.player }, { type: "bark", kind: "greet" });
      return out;
    }

    switch (this.state.kind) {
      case "greet":
        if (p.player) out.push({ type: "face", target: p.player });
        if (now >= this.state.until) this.state = { kind: "idle", until: now + this.rng.range(1.5, 3.5) };
        break;

      case "idle":
        if (p.player && p.playerDistM <= this.personality.attendRadiusM) {
          out.push({ type: "face", target: p.player });
        }
        if (now >= this.state.until) {
          if (this.pois.length > 0 && this.rng.chance(0.25 + 0.7 * this.personality.restlessness)) {
            const target = this.pickPoi(p.self);
            this.state = { kind: "wander", target };
            out.push({ type: "moveTo", target });
          } else {
            this.state = { kind: "idle", until: now + this.rng.range(2.5, 6.5) };
          }
        }
        break;

      case "wander":
        if (!p.selfMoving) this.state = { kind: "idle", until: now + this.rng.range(3, 7.5) };
        break;
    }

    // Comentarios ambientales: el mundo habla si Paula anda cerca.
    const quietFor = now - this.memory.lastBark;
    if (
      p.player && p.playerDistM <= 4.5 && quietFor > 14 &&
      this.rng.chance(this.personality.chattiness * 0.02)
    ) {
      this.memory.lastBark = now;
      out.push({ type: "bark", kind: "ambient" });
    }
    return out;
  }

  /** Un punto de interés distinto del anterior (y no el que tiene encima). */
  private pickPoi(self: Pt): Pt {
    const candidates = this.pois
      .map((pt, i) => ({ pt, i }))
      .filter(({ pt, i }) => i !== this.lastPoi && Math.hypot(pt.x - self.x, pt.y - self.y) > 40);
    const choice = candidates.length ? this.rng.pick(candidates) : { pt: this.pois[0], i: 0 };
    this.lastPoi = choice.i;
    return choice.pt;
  }
}
