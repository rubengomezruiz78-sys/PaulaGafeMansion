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
  private readonly startled: Pose;
  private walkMix = 0;
  private startleMix = 0;
  private startleFor = 0;
  /** Quieta un rato, mira a su alrededor (una niña no se queda como una estatua). */
  private stillFor = 0;
  private glanceAt = 4 + Math.random() * 3;
  private glanceBack = 0;
  /** Atenta a una conversación o un puzzle: no se distrae mirando a otro lado. */
  attentive = false;

  constructor(scene: Phaser.Scene, proj: Projection, pos: Pt, tint?: number) {
    // Es una foto: algo menos de saturación y contraste la acercan al cuadro.
    super(scene, proj, pos, GAITS.paula, { shadowWidthM: 0.5, tint, look: { saturation: 0.82, contrast: 0.92, rim: 0.8, rimMin: [0x8fa4d8, 0.12] } });
    this.walk = this.addPose("walk", "paula-walk");
    this.idle = this.addPose("idle", "paula-idle");
    this.startled = this.addPose("startled", "paula-startled");
    this.walk.obj.setAlpha(0);
    this.startled.obj.setAlpha(0);
  }

  /** Un trueno fuerte: se sobresalta un momento (si está quieta). */
  startle(): void {
    if (!this.walker.moving) this.startleFor = 0.9;
  }

  heightM(): number {
    return 1.3;
  }

  protected animate(dt: number): void {
    const moving = this.walker.moving;
    this.stillFor = moving || this.talkFor > 0 || this.attentive ? 0 : this.stillFor + dt;
    if (this.stillFor > this.glanceAt && this.glanceBack === 0) {
      // Echa un vistazo al otro lado… y al rato vuelve a mirar al frente.
      this.walker.facing = this.walker.facing === 1 ? -1 : 1;
      this.glanceBack = this.stillFor + 1.4 + Math.random() * 1.6;
    } else if (this.glanceBack > 0 && this.stillFor > this.glanceBack) {
      this.walker.facing = this.walker.facing === 1 ? -1 : 1;
      this.glanceBack = 0;
      this.glanceAt = this.stillFor + 5 + Math.random() * 6;
    }
    if (this.stillFor === 0) {
      this.glanceBack = 0;
      this.glanceAt = 4 + Math.random() * 3;
    }
    // Arrancar es rápido (0,1 s); pararse se funde algo más lento (0,18 s).
    this.walkMix = approach(this.walkMix, moving ? 1 : 0, dt / (moving ? 0.1 : 0.18));
    const phase = this.walker.gaitPhase();
    const frames = SPRITES["paula-walk"].frames;
    this.walk.obj.setFrame(Math.floor(phase * frames) % frames);

    const sw = this.poseScale(this.walk);
    const si = this.poseScale(this.idle);
    const ss = this.poseScale(this.startled);
    this.startleFor = Math.max(0, this.startleFor - dt);
    if (moving) this.startleFor = 0;
    this.startleMix = approach(this.startleMix, this.startleFor > 0 ? 1 : 0, dt / (this.startleFor > 0 ? 0.06 : 0.3));
    const breathe = Math.sin(this.time * Math.PI * 2 * 0.28);
    this.walk.obj.setScale(sw * this.flip, sw).setAlpha(this.walkMix);
    this.idle.obj.setScale(si * this.flip * (1 - 0.004 * breathe), si * (1 + 0.007 * breathe)).setAlpha((1 - this.walkMix) * (1 - this.startleMix));
    this.startled.obj.setScale(ss * this.flip, ss).setAlpha((1 - this.walkMix) * this.startleMix);

    // Balanceo: el cuerpo sube a media pisada y baja al apoyar (2 veces por ciclo).
    const ppm = this.proj.ppm(this.pos.y);
    const sr = Math.min(1, this.walker.speedRatio());
    // Cuerpo vivo: respira, se balancea sobre los pies quietos y la falda acompaña el paso.
    const idleSway = 0.006 * Math.sin(this.time * 0.63) + 0.003 * Math.sin(this.time * 1.7 + 1.3);
    const breath = 0.016 * (0.5 + 0.5 * Math.sin(this.time * Math.PI * 2 * 0.28));
    const skirt = moving ? 0.022 * sr * Math.sin(phase * Math.PI * 4 + 0.6) : 0.004 * Math.sin(this.time * 1.1);
    const nod = this.talkFor > 0 ? 0.005 * Math.sin(this.time * 17) : 0;
    this.setWarp(moving ? 0.012 * sr : idleSway, moving ? breath * 0.4 : breath, skirt, nod);
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
  /** Paula lleva un rato quieta: Gafe se va a curiosear cerca (y vuelve en cuanto ella se mueve). */
  private paulaStill = 0;
  private roaming?: { until: number };
  /** Sitios interesantes de la sala para curiosear (los pone la escena). */
  sniffSpots: Pt[] = [];

  constructor(scene: Phaser.Scene, proj: Projection, pos: Pt, tint?: number) {
    // Un gato negro en una casa oscura se pierde: brillo propio, contraluz fuerte y contorno de luna.
    super(scene, proj, pos, GAITS.gafe, {
      shadowWidthM: 0.46, shadowAlpha: 0.7, tint,
      look: { saturation: 1, contrast: 1.12, rim: 0.85, emissive: 0.08, rimMin: [0x9fb8ff, 0.3] },
    });
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
    this.paulaStill = paulaMovingNow ? 0 : this.paulaStill + dt;
    if (paulaMovingNow) this.roaming = undefined;
    this.thinkIn -= dt;
    if (this.thinkIn > 0) return;
    this.thinkIn = 0.2;
    // Curiosear: con Paula quieta un rato, se va a olfatear algo cercano y se sienta allí.
    if (this.roaming) {
      if (this.time < this.roaming.until) return;
      this.roaming = undefined;
    } else if (this.paulaStill > 7 && !this.walker.moving && Math.random() < 0.08) {
      const near = this.sniffSpots.filter((p) => {
        const d = this.proj.floorDistance(p, paula.pos);
        return d > 0.8 && d < 3;
      });
      if (near.length) {
        const spot = nav.nearestWalkable(near[Math.floor(Math.random() * near.length)]);
        this.walker.setPath(nav.findPath(this.pos, spot));
        this.roaming = { until: this.time + 6 + Math.random() * 6 };
        return;
      }
    }
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
    // Respira despacio sentado y mueve un poco la cabeza cuando «habla».
    this.setWarp(moving ? 0 : 0.004 * Math.sin(this.time * 0.7), moving ? 0 : 0.014 * (0.5 + 0.5 * Math.sin(this.time * Math.PI * 2 * 0.45)), 0,
      this.talkFor > 0 ? 0.008 * Math.sin(this.time * 14) : 0);
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
  /** Cuánto brilla por sí mismo (0 = persona viva, ~0,3 fantasma pintado, ~0,7 criado). */
  emissive?: number;
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
    super(scene, proj, pos, GAITS.ghost, {
      shadowWidthM: 0.5, shadowAlpha: 0.32, tint: style.tint,
      look: { saturation: style.emissive ? 0.95 : 0.85, contrast: 0.95, emissive: style.emissive ?? 0, rim: style.emissive ? 0.35 : 0.6 },
    });
    this.seed = (pos.x * 13.37 + pos.y * 7.1) % 10;
    // Los fantasmas desprenden un resplandor frío alrededor.
    if ((style.emissive ?? 0) > 0) {
      this.halo = scene.add.image(0, 0, "halo").setBlendMode(Phaser.BlendModes.ADD).setTint(0xa8c4ff);
      this.body.add(this.halo);
    }
    this.pose = this.addPose("body", key);
  }

  private readonly halo?: Phaser.GameObjects.Image;
  private flickerFor = 0;
  /** Mirar a un lado y a otro de vez en cuando (sin moverse). */
  private stillFor = 0;
  private glanceAt = 5 + Math.random() * 6;

  /** Con el relámpago, el fantasma titila (como una bombilla). */
  flicker(): void {
    this.flickerFor = 0.35;
  }

  heightM(): number {
    return SPRITES[this.key].realHeightM;
  }

  protected animate(dt: number): void {
    const t = this.time + this.seed;
    const ppm = this.proj.ppm(this.pos.y);
    const sr = Math.min(1, this.walker.speedRatio());
    this.stillFor = this.walker.moving || this.talkFor > 0 ? 0 : this.stillFor + dt;
    if (this.stillFor > this.glanceAt) {
      this.walker.facing = this.walker.facing === 1 ? -1 : 1;
      this.glanceAt = this.stillFor + 4 + Math.random() * 7;
    }
    if (this.style.floatM <= 0) {
      // Persona viva (no flota): pisa el suelo, con un leve balanceo al andar.
      this.liftM = 0;
      const phase = this.walker.gaitPhase();
      this.body.y = -0.012 * ppm * sr * Math.abs(Math.sin(phase * Math.PI * 2));
      this.body.rotation = approach(this.body.rotation, 0.025 * sr * Math.sin(phase * Math.PI * 2), dt * 0.8);
      const s = this.poseScale(this.pose);
      this.pose.obj.setScale(s * this.flip, s).setAlpha(this.style.alpha);
      this.setWarp(
        sr > 0.05 ? 0.012 * sr : 0.006 * Math.sin(t * 0.55),
        0.014 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.25)),
        sr > 0.05 ? 0.02 * sr * Math.sin(phase * Math.PI * 4) : 0,
        this.talkFor > 0 ? 0.005 * Math.sin(t * 16) : 0,
      );
      return;
    }
    this.liftM = this.style.floatM + 0.03 * Math.sin(t * 1.35);
    this.body.y = -this.liftM * ppm;
    if (this.halo) {
      const h = this.heightM() * ppm;
      this.halo.setPosition(0, -h * 0.5).setScale((h * 1.9) / 256).setAlpha((this.style.emissive ?? 0) * 0.32 * (0.85 + 0.15 * Math.sin(t * 1.7)));
    }
    // Se inclina un poco en la dirección del deslizamiento y oscila despacio.
    const target = 0.02 * Math.sin(t * 0.9) + this.walker.facing * 0.035 * sr;
    this.body.rotation = approach(this.body.rotation, target, dt * 0.6);
    const s = this.poseScale(this.pose);
    // Flota como tela o humo: se mece, respira y la parte de abajo ondea; al deslizarse, se queda atrás.
    const sheet = this.key.startsWith("ghost-");
    this.setWarp(
      (sheet ? 0.018 : 0.01) * Math.sin(t * 0.9) - this.walker.facing * 0.012 * sr,
      0.012 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.22)),
      -0.03 * sr,
      this.talkFor > 0 ? 0.006 * Math.sin(t * 15) : 0,
      sheet ? 0.022 : 0.009,
    );
    this.flickerFor = Math.max(0, this.flickerFor - dt);
    const flick = this.flickerFor > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(this.flickerFor * 40)) : 1;
    this.pose.obj.setScale(s * this.flip, s).setAlpha((this.style.alpha + 0.05 * Math.sin(t * 0.6)) * flick);
  }
}
