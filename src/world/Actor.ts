import Phaser from "phaser";
import type { Projection, Pt } from "../core/perspective";
import { Walker, type Gait } from "../core/walker";
import { SPRITES, type SpriteKey } from "../content/sprites";

export interface ActorOptions {
  /** Anchura de la sombra de contacto (m). */
  shadowWidthM: number;
  /** Opacidad de la sombra (0..1). */
  shadowAlpha?: number;
  /** Tinte multiplicativo para integrarlo con la luz de la escena. */
  tint?: number;
}

/** Una pose es una imagen o una hoja de animación con sus métricas reales. */
export interface Pose {
  key: SpriteKey;
  obj: Phaser.GameObjects.Sprite;
}

/** Tiempo del giro (s): el personaje se da la vuelta, no "salta" de lado. */
const TURN_TIME = 0.14;

/**
 * Personaje del mundo: pies en `walker.pos`, escala a su estatura real según la
 * profundidad, sombra de contacto y orden por Y. Las subclases deciden la pose
 * y el movimiento secundario (balanceo, inclinación, respiración, flotar).
 */
export abstract class Actor {
  readonly container: Phaser.GameObjects.Container;
  readonly walker: Walker;
  protected readonly shadow: Phaser.GameObjects.Image;
  /** Grupo del cuerpo: el balanceo y la inclinación se aplican aquí. */
  protected readonly body: Phaser.GameObjects.Container;
  protected readonly poses = new Map<string, Pose>();
  /** Giro animado en [-1, 1] (signo = hacia dónde mira). */
  protected flip = 1;
  /** Elevación sobre el suelo en metros (fantasmas). */
  protected liftM = 0;
  protected time = 0;

  constructor(
    protected readonly scene: Phaser.Scene,
    protected proj: Projection,
    pos: Pt,
    gait: Gait,
    protected readonly opts: ActorOptions,
  ) {
    this.walker = new Walker(proj, pos, gait);
    this.shadow = scene.add.image(0, 0, "shadow").setAlpha(opts.shadowAlpha ?? 0.55);
    this.body = scene.add.container(0, 0);
    this.container = scene.add.container(pos.x, pos.y, [this.shadow, this.body]);
    this.flip = this.walker.facing;
  }

  protected addPose(name: string, key: SpriteKey): Pose {
    const meta = SPRITES[key];
    const obj = this.scene.add.sprite(0, 0, key, 0).setOrigin(meta.originX, meta.originY);
    if (this.opts.tint !== undefined) obj.setTint(this.opts.tint);
    this.body.add(obj);
    const pose = { key, obj };
    this.poses.set(name, pose);
    return pose;
  }

  /** Cambiar de zona: nueva perspectiva y posición. */
  place(proj: Projection, pos: Pt): void {
    this.proj = proj;
    this.walker.proj = proj;
    this.walker.pos = { x: pos.x, y: pos.y };
    this.walker.stop();
    this.layout();
  }

  get pos(): Pt {
    return this.walker.pos;
  }

  /** Altura en pantalla de la cabeza (para bocadillos y toques). */
  headY(): number {
    const h = this.proj.heightPx(this.pos.y, this.heightM());
    return this.pos.y - h - this.proj.ppm(this.pos.y) * this.liftM;
  }

  abstract heightM(): number;

  /** Rectángulo aproximado del cuerpo en pantalla (para tocar al personaje). */
  hitRect(): Phaser.Geom.Rectangle {
    const ppm = this.proj.ppm(this.pos.y);
    const h = this.heightM() * ppm;
    const w = Math.max(this.opts.shadowWidthM * ppm, 60);
    const lift = this.liftM * ppm;
    return new Phaser.Geom.Rectangle(this.pos.x - w / 2, this.pos.y - h - lift, w, h + lift);
  }

  update(dt: number): void {
    this.time += dt;
    this.walker.update(dt);
    const target = this.walker.facing;
    const step = (dt / TURN_TIME) * 2;
    if (this.flip < target) this.flip = Math.min(target, this.flip + step);
    else if (this.flip > target) this.flip = Math.max(target, this.flip - step);
    this.animate(dt);
    this.layout();
  }

  /** Pose, fotograma y movimiento secundario. */
  protected abstract animate(dt: number): void;

  /** Escala de una pose para su estatura real a la profundidad actual. */
  protected poseScale(pose: Pose): number {
    const meta = SPRITES[pose.key];
    return this.proj.spriteScale(this.pos.y, meta.realHeightM, meta.refHeightPx);
  }

  protected layout(): void {
    const { x, y } = this.pos;
    this.container.setPosition(x, y);
    this.container.setDepth(y);
    // Sombra: anchura real × ppm; se achata según altura de cámara / profundidad.
    const ppm = this.proj.ppm(y);
    const depth = this.proj.toFloor(this.pos).Z;
    const flatten = Math.min(0.55, Math.max(0.08, this.proj.cameraHeight / depth));
    const shrink = 1 / (1 + this.liftM * 1.6);
    const w = this.opts.shadowWidthM * ppm * shrink;
    this.shadow.setDisplaySize(w, w * flatten);
  }
}
