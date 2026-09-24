import Phaser from "phaser";
import type { NavGrid } from "../core/navmesh";
import type { Projection, Pt } from "../core/perspective";
import { GAITS } from "../core/walker";
import { SPRITES, type SpriteKey } from "../content/sprites";
import { Actor, type Pose } from "./Actor";

/** Acerca `v` a `target` a lo sumo `maxStep`. */
export const approach = (v: number, target: number, maxStep: number): number =>
  v < target ? Math.min(target, v + maxStep) : Math.max(target, v - maxStep);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Paula, 9 años (1,30 m). Anda con la hoja de 4 fotogramas cuya fase sale de
 * los metros recorridos; en reposo, pose frontal con respiración.
 */
export class Paula extends Actor {
  private readonly walk: Pose;
  private readonly idle: Pose;
  private walkMix = 0;

  constructor(scene: Phaser.Scene, proj: Projection, pos: Pt, tint?: number) {
    super(scene, proj, pos, GAITS.paula, { shadowWidthM: 0.5, tint });
    this.walk = this.addPose("walk", "paula-walk");
    this.idle = this.addPose("idle", "paula-idle");
    this.walk.obj.setAlpha(0);
  }

  heightM(): number {
    return 1.3;
  }

  protected animate(dt: number): void {
    const moving = this.walker.moving;
    // Arrancar es rápido (0,1 s); pararse se funde algo más lento (0,18 s).
    this.walkMix = approach(this.walkMix, moving ? 1 : 0, dt / (moving ? 0.1 : 0.18));
    const phase = this.walker.gaitPhase();
    const frames = SPRITES["paula-walk"].frames;
    this.walk.obj.setFrame(Math.floor(phase * frames) % frames);

    const sw = this.poseScale(this.walk);
    const si = this.poseScale(this.idle);
    const breathe = Math.sin(this.time * Math.PI * 2 * 0.28);
    this.walk.obj.setScale(sw * this.flip, sw).setAlpha(this.walkMix);
    this.idle.obj.setScale(si * this.flip * (1 - 0.004 * breathe), si * (1 + 0.007 * breathe)).setAlpha(1 - this.walkMix);

    // Balanceo: el cuerpo sube a media pisada y baja al apoyar (2 veces por ciclo).
    const ppm = this.proj.ppm(this.pos.y);
    const sr = Math.min(1, this.walker.speedRatio());
    this.body.y = -0.009 * ppm * sr * (0.5 - 0.5 * Math.cos(4 * Math.PI * phase));
    // Inclinación: algo hacia delante al andar, más al acelerar, hacia atrás al frenar.
    const lean = this.walker.facing * (0.026 * sr + clamp(this.walker.lastAccel * 0.005, -0.018, 0.018));
    this.body.rotation = approach(this.body.rotation, lean, dt * 0.9);
  }
}

/**
 * Gafe, gato negro (0,29 m andando, 0,32 m sentado). Sigue a Paula a un lado y
 * un poco por delante (para que se le vea), con retraso natural; trota si se
 * queda atrás y se sienta cuando ella se para.
 */
export class Gafe extends Actor {
  private readonly walk: Pose;
  private readonly sit: Pose;
  private sitMix = 1;
  private stillFor = 10;
  private thinkIn = 0;
  private paulaWasMoving = false;

  constructor(scene: Phaser.Scene, proj: Projection, pos: Pt, tint?: number) {
    super(scene, proj, pos, GAITS.gafe, { shadowWidthM: 0.42, tint });
    this.walk = this.addPose("walk", "gafe-walk");
    this.sit = this.addPose("sit", "gafe-sit");
    this.walk.obj.setAlpha(0);
  }

  heightM(): number {
    return this.sitMix > 0.5 ? 0.32 : 0.29;
  }

  /** IA de compañero: decide cada 0,2 s adónde ir respecto a Paula. */
  follow(dt: number, paula: Actor, nav: NavGrid): void {
    // Cuando Paula arranca, Gafe lo nota enseguida (como un gato atento).
    const paulaMovingNow = paula.walker.moving;
    if (paulaMovingNow && !this.paulaWasMoving) this.thinkIn = Math.min(this.thinkIn, 0.08 + Math.random() * 0.14);
    this.paulaWasMoving = paulaMovingNow;
    this.thinkIn -= dt;
    if (this.thinkIn > 0) return;
    this.thinkIn = 0.2;
    const pf = this.proj.toFloor(paula.pos);
    const side = -paula.walker.facing; // detrás de ella según hacia dónde mira
    const spot = nav.nearestWalkable(this.proj.fromFloor({ X: pf.X + side * 0.75, Z: Math.max(0.6, pf.Z - 0.35) }));
    const dist = this.proj.floorDistance(this.pos, spot);
    const paulaMoving = paula.walker.moving;
    if (dist > (paulaMoving ? 0.55 : 0.35)) {
      const far = this.proj.floorDistance(this.pos, paula.pos) > 2.4;
      this.walker.setPath(nav.findPath(this.pos, spot), far);
    } else if (!paulaMoving && !this.walker.moving) {
      this.walker.face(paula.pos);
    }
  }

  protected animate(dt: number): void {
    const moving = this.walker.moving;
    this.stillFor = moving ? 0 : this.stillFor + dt;
    const wantSit = this.stillFor > 0.9;
    this.sitMix = approach(this.sitMix, wantSit ? 1 : 0, dt / (wantSit ? 0.35 : 0.08));
    const frames = SPRITES["gafe-walk"].frames;
    // Parado sin sentarse aún: fotograma de pie (0).
    this.walk.obj.setFrame(moving ? Math.floor(this.walker.gaitPhase() * frames) % frames : 0);

    const sw = this.poseScale(this.walk);
    const ss = this.poseScale(this.sit);
    const breathe = Math.sin(this.time * Math.PI * 2 * 0.45);
    this.walk.obj.setScale(sw * this.flip, sw).setAlpha(1 - this.sitMix);
    this.sit.obj.setScale(ss * this.flip, ss * (1 + 0.006 * breathe)).setAlpha(this.sitMix);
    // Los gatos casi no balancean el cuerpo: solo un leve cabeceo al trotar.
    const ppm = this.proj.ppm(this.pos.y);
    const sr = Math.min(1.6, this.walker.speedRatio());
    this.body.y = -0.004 * ppm * sr * (0.5 - 0.5 * Math.cos(4 * Math.PI * this.walker.gaitPhase()));
  }
}

export interface GhostStyle {
  /** Elevación media sobre el suelo (m). */
  floatM: number;
  /** Opacidad base. */
  alpha: number;
  tint?: number;
}

/**
 * Fantasma: no anda, se desliza con inercia (marcha "ghost") y flota con un
 * vaivén lento. La sombra se encoge y aclara cuanto más alto flota.
 */
export class Ghost extends Actor {
  private readonly pose: Pose;
  private readonly seed: number;

  constructor(
    scene: Phaser.Scene,
    proj: Projection,
    pos: Pt,
    readonly key: SpriteKey,
    private readonly style: GhostStyle,
  ) {
    super(scene, proj, pos, GAITS.ghost, { shadowWidthM: 0.5, shadowAlpha: 0.32, tint: style.tint });
    this.pose = this.addPose("body", key);
    this.seed = (pos.x * 13.37 + pos.y * 7.1) % 10;
  }

  heightM(): number {
    return SPRITES[this.key].realHeightM;
  }

  protected animate(dt: number): void {
    const t = this.time + this.seed;
    this.liftM = this.style.floatM + 0.03 * Math.sin(t * 1.35);
    const ppm = this.proj.ppm(this.pos.y);
    this.body.y = -this.liftM * ppm;
    const sr = Math.min(1, this.walker.speedRatio());
    // Se inclina un poco en la dirección del deslizamiento y oscila despacio.
    const target = 0.02 * Math.sin(t * 0.9) + this.walker.facing * 0.035 * sr;
    this.body.rotation = approach(this.body.rotation, target, dt * 0.6);
    const s = this.poseScale(this.pose);
    this.pose.obj.setScale(s * this.flip, s).setAlpha(this.style.alpha + 0.05 * Math.sin(t * 0.6));
  }
}
