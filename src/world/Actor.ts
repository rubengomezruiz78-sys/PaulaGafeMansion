import Phaser from "phaser";
import type { Projection, Pt } from "../core/perspective";
import { Walker, type Gait } from "../core/walker";
import { SPRITES, type SpriteKey } from "../content/sprites";
import { ACTOR_LIGHT, hex3, lighting, type ActorLightParams } from "./lighting";
import type { LightProbe } from "./probe";

export interface ActorOptions {
  /** Anchura de la sombra de contacto (m). */
  shadowWidthM: number;
  /** Opacidad de la sombra (0..1). */
  shadowAlpha?: number;
  /** Tinte multiplicativo (solo sin WebGL: con WebGL manda la luz de la sala). */
  tint?: number;
  /** Cómo encaja la imagen con el cuadro (ver `ActorLightParams`). */
  look?: {
    saturation?: number; contrast?: number; emissive?: number; rim?: number;
    /** Contorno de luna mínimo (color hex y fuerza 0..1), aunque no haya luz cerca. */
    rimMin?: [number, number];
  };
}

/** Lo que la sala aporta a cada personaje: reflejo del suelo, niebla y sombras. */
export interface ActorEnvironment {
  reflect: number;
  fog: number;
  castShadow: boolean;
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
  /** Parámetros de luz de este personaje (los lee el shader de iluminación). */
  readonly lightParams: ActorLightParams;
  private env: ActorEnvironment = { reflect: 0, fog: 0, castShadow: false };
  /** Luz del sitio (la pone la sala). */
  private probe?: LightProbe;
  private readonly probeOut: [number, number, number] = [0, 0, 0];
  private castShadow?: Phaser.GameObjects.Sprite;
  private reflection?: Phaser.GameObjects.Sprite;

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
    const look = opts.look ?? {};
    this.lightParams = {
      keyDir: [0, -1], keyColor: [0, 0, 0],
      saturation: look.saturation ?? 0.9, contrast: look.contrast ?? 0.95, fog: 0, emissive: look.emissive ?? 0,
      rimTexels: 3, keyPower: 0, warp: [0, 0, 0, 0], ripple: [0, 0],
      probe: [0, 0, 0, 0], rimMin: [0, 0, 0, 3],
    };
    if (look.rimMin) {
      const [r, g, b] = hex3(look.rimMin[0]);
      this.lightParams.rimMin[0] = r * look.rimMin[1];
      this.lightParams.rimMin[1] = g * look.rimMin[1];
      this.lightParams.rimMin[2] = b * look.rimMin[1];
    }
  }

  /** La sala dice si el suelo refleja, cuánta niebla hay y si hay sombras proyectadas. */
  setEnvironment(env: ActorEnvironment, probe?: LightProbe): void {
    this.env = env;
    this.probe = probe;
    if (env.castShadow && !this.castShadow) {
      this.castShadow = this.scene.add.sprite(0, 0, "__DEFAULT").setTintFill(0x000000).setAlpha(0);
      this.container.addAt(this.castShadow, 1);
    }
    if (env.reflect > 0.01 && !this.reflection) {
      this.reflection = this.scene.add.sprite(0, 0, "__DEFAULT").setAlpha(0);
      if (lighting.enabled) {
        this.reflection.setPipeline(ACTOR_LIGHT);
        (this.reflection as unknown as { lightParams: ActorLightParams }).lightParams = this.lightParams;
      }
      this.container.addAt(this.reflection, 1);
    }
  }

  protected addPose(name: string, key: SpriteKey): Pose {
    const meta = SPRITES[key];
    const obj = this.scene.add.sprite(0, 0, key, 0).setOrigin(meta.originX, meta.originY);
    if (lighting.enabled) {
      obj.setPipeline(ACTOR_LIGHT);
      (obj as unknown as { lightParams: ActorLightParams }).lightParams = this.lightParams;
    } else if (this.opts.tint !== undefined) obj.setTint(this.opts.tint);
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

  /** Segundos que le quedan hablando (lo marca la escena mientras sale su bocadillo). */
  protected talkFor = 0;

  /** Está diciendo algo ahora mismo: cabecea un poco al hablar. */
  speaking(): void {
    this.talkFor = 0.25;
  }

  /**
   * Cuerpo vivo: respiración, balanceo con los pies quietos, falda y cabeceo.
   * `flip` invierte el balanceo cuando la imagen está volteada.
   */
  protected setWarp(bend: number, breath: number, skirt: number, nod: number, ripple = 0): void {
    const s = Math.sign(this.flip || 1);
    const w = this.lightParams.warp;
    w[0] = bend * s;
    w[1] = breath;
    w[2] = skirt * s;
    w[3] = nod;
    this.lightParams.ripple[0] = ripple;
    this.lightParams.ripple[1] = this.time;
  }

  private seeThrough = 1;

  /** Se vuelve translúcido mientras tapa a Paula, para que siempre se la vea. */
  updateSeeThrough(hiding: boolean, dt: number): void {
    const target = hiding ? 0.38 : 1;
    this.seeThrough += (target - this.seeThrough) * Math.min(1, dt * 7);
    this.body.setAlpha(this.seeThrough);
  }

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
    this.talkFor = Math.max(0, this.talkFor - dt);
    this.walker.update(dt);
    const target = this.walker.facing;
    const step = (dt / TURN_TIME) * 2;
    if (this.flip < target) this.flip = Math.min(target, this.flip + step);
    else if (this.flip > target) this.flip = Math.max(target, this.flip - step);
    this.animate(dt);
    this.layout();
    this.relight();
  }

  /** La pose que más se ve ahora (para copiarla en la sombra y el reflejo). */
  private visiblePose(): Pose | undefined {
    let best: Pose | undefined;
    for (const p of this.poses.values()) if (!best || p.obj.alpha > best.obj.alpha) best = p;
    return best;
  }

  /**
   * Luz principal sobre el personaje: de ella salen el contraluz (el borde que
   * la mira se ilumina), la dirección de la sombra proyectada y su fuerza.
   */
  private relight(): void {
    const pose = this.visiblePose();
    if (!pose) return;
    const obj = pose.obj;
    const ppm = this.proj.ppm(this.pos.y);
    const chestY = this.pos.y - this.heightM() * 0.6 * ppm - this.liftM * ppm;
    const { light, power } = lighting.key(this.pos.x, chestY);
    const lp = this.lightParams;
    if (light) {
      const dx = light.x - this.pos.x;
      const dy = light.y - chestY;
      const d = Math.hypot(dx, dy) || 1;
      lp.keyDir[0] = (dx / d) * Math.sign(obj.scaleX || 1);
      lp.keyDir[1] = dy / d;
      const [r, g, b] = hex3(light.color);
      const k = Math.min(1, 0.25 + power * 1.6) * (this.opts.look?.rim ?? 0.6);
      lp.keyPower = Math.min(1, power * 2.2);
      lp.keyColor[0] = r * k;
      lp.keyColor[1] = g * k;
      lp.keyColor[2] = b * k;
    } else {
      lp.keyColor[0] = lp.keyColor[1] = lp.keyColor[2] = 0;
      lp.keyPower = 0;
    }
    // Contraluz de ~3 px en pantalla (menos en figuras pequeñas: en un gato
    // lejano 3 px son media pata y lo vuelven gris).
    const screenH = this.heightM() * ppm;
    const rimPx = Math.max(1.1, Math.min(3.2, screenH * 0.025));
    lp.rimTexels = rimPx / Math.max(0.05, Math.abs(obj.scaleX));
    lp.rimMin[3] = rimPx * 0.6 / Math.max(0.05, Math.abs(obj.scaleX));
    // Luz del sitio: el color del cuadro alrededor del cuerpo (más ancho que él, para no teñirse de su propia sombra).
    if (this.probe) {
      const hPx = this.heightM() * ppm;
      this.probe.sample({ x: this.pos.x, y: chestY }, Math.max(90, hPx * 0.9), Math.max(80, hPx * 1.1), this.probeOut);
      const s = 0.12;
      lp.probe[0] += (this.probeOut[0] - lp.probe[0]) * s;
      lp.probe[1] += (this.probeOut[1] - lp.probe[1]) * s;
      lp.probe[2] += (this.probeOut[2] - lp.probe[2]) * s;
      lp.probe[3] = 0.6;
    }
    const Z = this.proj.toFloor(this.pos).Z;
    lp.fog = this.env.fog * Math.min(1, Math.max(0, (Z - 3) / 9));

    const mirror = (s: Phaser.GameObjects.Sprite) =>
      s.setTexture(obj.texture.key, obj.frame.name).setOrigin(obj.originX, obj.originY);
    if (this.castShadow) {
      const cs = mirror(this.castShadow);
      // Lejos de la luz: la sombra se alarga hacia el otro lado, pegada al suelo.
      let vx = 0;
      let vy = 1;
      if (light) {
        vx = this.pos.x - light.x;
        vy = Math.max(0.15 * Math.abs(vx), this.pos.y - light.y);
      }
      const ang = Math.max(-1.1, Math.min(1.1, -Math.atan2(vx, vy)));
      const side = Math.abs(Math.sin(ang));
      cs.setScale(obj.scaleX, -obj.scaleY * (0.3 + 0.25 * side)).setRotation(ang)
        .setAlpha(obj.alpha * this.body.alpha * Math.min(0.42, 0.1 + power * 0.45) * (1 - this.env.reflect * 0.6));
    }
    if (this.reflection) {
      mirror(this.reflection).setScale(obj.scaleX, -obj.scaleY).setRotation(-this.body.rotation)
        .setAlpha(obj.alpha * this.body.alpha * this.env.reflect * 0.55);
      this.reflection.y = this.liftM * ppm;
    }
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
