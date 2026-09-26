/**
 * La vida visible de una sala: todo lo que se mueve sin que nadie lo toque.
 * Luces que parpadean (con halo y llamita), haces de luz con polvo, niebla
 * baja en dos capas (detrás y delante de los personajes), estrellas que
 * titilan, polillas, murciélagos, arañas, ratones, luciérnagas, gotas con su
 * salpicadura, vapor, fantasmitas lejanos y el relámpago en los cristales.
 * También prepara, cada fotograma, las luces con las que se ilumina a los
 * personajes (`lighting`).
 */
import Phaser from "phaser";
import { GAME_H, GAME_W } from "../config";
import type { LightDef, NPoly, ZoneLife } from "../content/life";
import { SPRITES } from "../content/sprites";
import type { Projection, Pt } from "../core/perspective";
import { BG_LIFE, type BgLifePipeline, makeLifeMask } from "./bgLife";
import { ACTOR_LIGHT, hex3, lighting, MAX_LIGHTS, type ActorLightParams } from "./lighting";

const W = GAME_W;
const H = GAME_H;
const px = (x: number, y: number) => ({ x: x * W, y: y * H });

/** Ruido suave barato: suma de senos con fases propias. */
const wobble = (t: number, a: number, b: number, c: number) =>
  0.5 * Math.sin(t * 7.3 + a) + 0.3 * Math.sin(t * 13.1 + b) + 0.2 * Math.sin(t * 23.7 + c);

function inPoly(p: { x: number; y: number }, poly: NPoly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function bbox(poly: NPoly): { x0: number; y0: number; x1: number; y1: number } {
  const xs = poly.map((q) => q[0]);
  const ys = poly.map((q) => q[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

interface LiveLight {
  def: LightDef;
  phase: [number, number, number];
  factor: number;
  halo?: Phaser.GameObjects.Image;
  flames: Phaser.GameObjects.Image[];
}

interface Moth {
  img: Phaser.GameObjects.Image;
  light: LiveLight;
  angle: number;
  radius: number;
  speed: number;
  seed: number;
}

interface Drift {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  box: { x0: number; y0: number; x1: number; y1: number };
  seed: number;
  base: number;
}

export interface LifeActor {
  x: number;
  y: number;
  ghost: boolean;
}

export class ZoneLifeFx {
  private lights: LiveLight[] = [];
  private moths: Moth[] = [];
  private dust: Drift[] = [];
  private flies: Drift[] = [];
  /** Parejas de fantasmitas que bailan el vals por la pista (salón de baile). */
  private dancers: { img: Phaser.GameObjects.Image; halo: Phaser.GameObjects.Image; key: string; phase: number; speed: number; spin: number }[] = [];
  /** Lluvia de exterior: trazos delante y detrás de los personajes. */
  private rain: { img: Phaser.GameObjects.Image; vy: number }[] = [];
  private shaftImgs: Phaser.GameObjects.Image[] = [];
  private fogBack?: Phaser.GameObjects.TileSprite;
  private fogFront?: Phaser.GameObjects.TileSprite;
  private grain?: Phaser.GameObjects.TileSprite;
  private pipeline?: BgLifePipeline;
  private spinAngles: number[] = [];
  private t = 0;
  private flashT = 99;
  private flashPower = 0;
  private timers: { at: number; every: [number, number]; run: () => void }[] = [];
  private readonly rng: () => number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly zoneId: string,
    private readonly life: ZoneLife,
    private readonly proj: Projection,
    private readonly opts: { lowFx: boolean; calm: boolean },
  ) {
    let seed = zoneId.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 1;
    this.rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    lighting.ambient = hex3(life.ambient);
    lighting.fogColor = hex3(life.fog.color);
    lighting.flash = 0;
    this.setupLights();
    this.setupShafts();
    this.setupFog();
    this.setupTwinkles();
    this.setupCritters();
    if (!opts.lowFx) {
      this.grain = scene.add.tileSprite(0, 0, W, H, "grain").setOrigin(0).setDepth(4450).setAlpha(0.055)
        .setBlendMode(Phaser.BlendModes.SCREEN);
    }
  }

  /** Modo ligero (la gráfica no llega): fuera las capas a pantalla completa que menos se notan. */
  lighten(): void {
    this.grain?.destroy();
    this.grain = undefined;
    this.fogFront?.destroy();
    this.fogFront = undefined;
  }

  /** El cuadro de fondo pasa por el shader de vida (si hay WebGL). */
  attachBackground(bg: Phaser.GameObjects.Image): void {
    const renderer = this.scene.game.renderer;
    if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) || !renderer.pipelines.has(BG_LIFE)) return;
    this.pipeline = renderer.pipelines.get(BG_LIFE) as BgLifePipeline;
    this.pipeline.mask = makeLifeMask(this.scene, this.zoneId, this.life);
    this.pipeline.spins.fill(0);
    this.spinAngles = this.life.spin.map(() => this.rng() * Math.PI * 2);
    this.pipeline.rain = this.opts.calm ? 0 : 0.85;
    bg.setPipeline(BG_LIFE);
  }

  /** Provoca ya un bicho o una aparición (para el vídeo de muestra y pruebas). */
  trigger(kind: "bat" | "spider" | "mouse" | "wisp"): void {
    if (kind === "bat") this.bat();
    else if (kind === "spider") this.spider();
    else if (kind === "mouse") this.mouse();
    else if (this.life.wisps) this.wisp();
  }

  /** Relámpago: los cristales se encienden y los personajes reciben el fogonazo. */
  flash(power: number): void {
    this.flashT = 0;
    this.flashPower = power;
  }

  update(dt: number, actors: LifeActor[], paula: Pt): void {
    this.t += dt;
    const t = this.t;
    // Relámpago: doble destello y cola.
    this.flashT += dt;
    const ft = this.flashT;
    const env = ft < 0.06 ? ft / 0.06 : ft < 0.14 ? 1 - (ft - 0.06) / 0.08 * 0.8 : ft < 0.2 ? 0.2 + (ft - 0.14) / 0.06 * 0.6 : Math.max(0, 0.8 - (ft - 0.2) / 0.5 * 0.8);
    const flash = this.flashPower * env;
    lighting.flash = flash * 0.35;
    if (this.pipeline) {
      this.pipeline.time = t;
      this.pipeline.flash = flash * 0.9;
      this.life.spin.forEach((s, i) => {
        if (i >= 4) return;
        this.spinAngles[i] += s.speed * dt;
        this.pipeline!.spins.set([s.x, s.y, s.r / H, this.spinAngles[i]], i * 4);
      });
    }

    // Luces: parpadeo, halos, llamitas.
    lighting.clear();
    for (const l of this.lights) {
      const n = wobble(t, ...l.phase);
      const dip = l.def.flicker > 0.5 && Math.sin(t * 0.9 + l.phase[0]) > 0.985 ? 0.75 : 1;
      l.factor = (1 + l.def.flicker * 0.14 * n) * dip;
      if (l.halo) l.halo.setAlpha(0.42 * l.factor).setScale((l.def.glow! * 2) / 256 * (0.97 + 0.03 * n));
      l.flames.forEach((f, i) => {
        const m = wobble(t * 1.3 + i, l.phase[1] + i, l.phase[2], l.phase[0] + i * 2);
        f.setScale(0.36 * (1 + 0.06 * m), 0.38 * (1 + 0.16 * m)).setAlpha(0.75 + 0.2 * m);
        f.x = (f.getData("x") as number) + m * 0.8;
      });
      const p = px(l.def.x, l.def.y);
      lighting.add(p.x, p.y, l.def.radius, l.def.intensity * l.factor, l.def.color);
    }
    // Los fantasmas también dan luz (los más cercanos a Paula primero).
    const ghosts = actors.filter((a) => a.ghost)
      .sort((a, b) => Math.hypot(a.x - paula.x, a.y - paula.y) - Math.hypot(b.x - paula.x, b.y - paula.y));
    for (const g of ghosts) {
      if (lighting.count >= MAX_LIGHTS) break;
      lighting.add(g.x, g.y, 300, 0.35, 0xb0c8ff);
    }

    for (const m of this.moths) {
      m.angle += m.speed * dt * (1 + 0.5 * Math.sin(t * 3 + m.seed));
      const c = px(m.light.def.x, m.light.def.y);
      const r = m.radius * (1 + 0.3 * Math.sin(t * 2.1 + m.seed));
      m.img.setPosition(c.x + Math.cos(m.angle) * r, c.y + Math.sin(m.angle * 1.3) * r * 0.6)
        .setScale(0.7, 0.7 * Math.abs(Math.sin(t * 38 + m.seed)) + 0.15);
    }
    for (const d of [...this.dust, ...this.flies]) {
      d.img.x += d.vx * dt + Math.sin(t * 0.7 + d.seed) * 4 * dt;
      d.img.y += d.vy * dt + Math.cos(t * 0.5 + d.seed) * 3 * dt;
      const b = d.box;
      if (d.img.x < b.x0) d.img.x = b.x1;
      if (d.img.x > b.x1) d.img.x = b.x0;
      if (d.img.y < b.y0) d.img.y = b.y1;
      if (d.img.y > b.y1) d.img.y = b.y0;
      d.img.setAlpha(d.base * (0.55 + 0.45 * Math.sin(t * (d.vx ? 1.1 : 2.6) + d.seed)));
    }
    for (const s of this.shaftImgs) s.setAlpha((s.getData("a") as number) * (0.85 + 0.15 * Math.sin(t * 0.35 + (s.getData("p") as number))));
    this.updateDancers(dt);
    for (const r of this.rain) {
      r.img.y += r.vy * dt;
      r.img.x += r.vy * dt * 0.12;
      if (r.img.y > H + 50) {
        r.img.y = -50 - this.rng() * 80;
        r.img.x = this.rng() * W;
      }
      if (r.img.x > W + 10) r.img.x -= W + 20;
    }
    if (this.fogBack) this.fogBack.tilePositionX += 9 * dt;
    if (this.fogFront) this.fogFront.tilePositionX -= 15 * dt;
    if (this.grain) this.grain.setTilePosition(Math.floor(this.rng() * 256), Math.floor(this.rng() * 256));

    for (const tm of this.timers) {
      if (t < tm.at) continue;
      tm.at = t + tm.every[0] + this.rng() * (tm.every[1] - tm.every[0]);
      tm.run();
    }
  }

  /**
   * El vals: cada pareja recorre una elipse sobre el suelo de verdad (en metros,
   * así la perspectiva y el tamaño salen solos) y gira sobre sí misma.
   */
  private updateDancers(dt: number): void {
    if (!this.dancers.length) return;
    const center = this.proj.toFloor({ x: 0.5 * W, y: 0.78 * H });
    for (const d of this.dancers) {
      d.phase += d.speed * dt;
      d.spin += dt * 2.4;
      const floor = { X: center.X + Math.cos(d.phase) * 1.7, Z: Math.max(1, center.Z + Math.sin(d.phase) * 1.0) };
      const p = this.proj.fromFloor(floor);
      const meta = SPRITES[d.key];
      const s = this.proj.spriteScale(p.y, meta.realHeightM, meta.refHeightPx);
      const lift = this.proj.ppm(p.y) * (0.22 + 0.04 * Math.sin(this.t * 2.2 + d.spin));
      // Al girar, la pareja se ve de un lado y del otro (como una peonza lenta).
      const turn = Math.cos(d.spin);
      d.img.setPosition(p.x, p.y - lift).setScale(s * (Math.abs(turn) * 0.35 + 0.65) * Math.sign(turn || 1), s).setDepth(p.y);
      const h = meta.realHeightM * this.proj.ppm(p.y);
      d.halo.setPosition(p.x, p.y - lift - h * 0.5).setScale((h * 1.8) / 256).setDepth(p.y - 1);
      const lp = (d.img as unknown as { lightParams?: ActorLightParams }).lightParams;
      if (lp) {
        lp.ripple[1] = this.t;
        lp.warp[0] = 0.02 * Math.sin(d.spin * 0.5);
        lp.warp[1] = 0.01 * Math.sin(this.t * 2);
        lp.rimTexels = 3.2 / Math.max(0.05, Math.abs(d.img.scaleX));
      }
    }
  }

  // ------------------------------------------------------------------ montaje

  private setupLights(): void {
    for (const def of this.life.lights) {
      const live: LiveLight = { def, phase: [this.rng() * 6, this.rng() * 6, this.rng() * 6], factor: 1, flames: [] };
      if (def.glow) {
        const p = px(def.x, def.y);
        live.halo = this.scene.add.image(p.x, p.y, "halo").setTint(def.color).setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-900).setScale((def.glow * 2) / 256);
      }
      for (const [fx, fy] of def.flames ?? []) {
        const p = px(fx, fy);
        const f = this.scene.add.image(p.x, p.y, "flame").setOrigin(0.5, 0.9).setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-890).setScale(0.36, 0.38);
        f.setData("x", p.x);
        live.flames.push(f);
      }
      this.lights.push(live);
    }
  }

  private setupShafts(): void {
    if (!this.life.shafts.length) return;
    const key = `shafts-${this.zoneId}`;
    if (!this.scene.textures.exists(key)) {
      const tex = this.scene.textures.createCanvas(key, 480, 270);
      const ctx = tex!.getContext();
      ctx.filter = "blur(7px)";
      for (const poly of this.life.shafts) {
        const b = bbox(poly);
        const g = ctx.createLinearGradient(0, b.y0 * 270, 0, b.y1 * 270);
        g.addColorStop(0, "rgba(255,255,255,0.55)");
        g.addColorStop(0.55, "rgba(255,255,255,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * 480, y * 270) : ctx.moveTo(x * 480, y * 270)));
        ctx.closePath();
        ctx.fill();
      }
      tex!.refresh();
    }
    const moon = this.life.lights.find((l) => l.flicker === 0)?.color ?? 0x9fb6ff;
    const img = this.scene.add.image(0, 0, key).setOrigin(0).setDisplaySize(W, H).setTint(moon)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(-880);
    img.setData("a", this.opts.calm ? 0.2 : 0.3).setData("p", this.rng() * 6);
    this.shaftImgs.push(img);
    if (this.opts.lowFx) return;
    for (const poly of this.life.shafts) {
      const b = bbox(poly);
      const box = { x0: b.x0 * W, y0: b.y0 * H, x1: b.x1 * W, y1: b.y1 * H };
      for (let i = 0; i < 18; i += 1) {
        const x = box.x0 + this.rng() * (box.x1 - box.x0);
        const y = box.y0 + this.rng() * (box.y1 - box.y0);
        if (!inPoly({ x: x / W, y: y / H }, poly)) continue;
        const d = this.scene.add.image(x, y, "halo").setScale(0.018 + this.rng() * 0.02).setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-870).setTint(0xdfe8ff);
        this.dust.push({ img: d, vx: (this.rng() - 0.5) * 6, vy: -2 - this.rng() * 5, box, seed: this.rng() * 9, base: 0.25 + this.rng() * 0.35 });
      }
    }
  }

  private setupFog(): void {
    const { color, amount } = this.life.fog;
    if (amount <= 0) return;
    this.fogBack = this.scene.add.tileSprite(0, H * 0.46, W, H * 0.56, "fog").setOrigin(0).setTint(color)
      .setAlpha(Math.min(0.9, amount * 1.6)).setDepth(-850);
    this.fogBack.tileScaleY = (H * 0.56) / 256;
    this.fogBack.tileScaleX = this.fogBack.tileScaleY;
    if (this.opts.lowFx) return;
    this.fogFront = this.scene.add.tileSprite(0, H * 0.7, W, H * 0.32, "fog").setOrigin(0).setTint(color)
      .setAlpha(amount * 0.6).setDepth(1500);
    this.fogFront.tileScaleY = (H * 0.32) / 256;
    this.fogFront.tileScaleX = this.fogFront.tileScaleY * 1.3;
    this.fogFront.tilePositionX = 400;
  }

  private setupTwinkles(): void {
    if (this.opts.lowFx) return;
    for (const poly of this.life.twinkle) {
      const b = bbox(poly);
      for (let i = 0; i < 26; i += 1) {
        const p = { x: b.x0 + this.rng() * (b.x1 - b.x0), y: b.y0 + this.rng() * (b.y1 - b.y0) };
        if (!inPoly(p, poly)) continue;
        const s = this.scene.add.image(p.x * W, p.y * H, "glint").setScale(0.05 + this.rng() * 0.06)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(-880).setAlpha(0).setTint(0xe8f0ff);
        this.scene.tweens.add({
          targets: s, alpha: { from: 0, to: 0.5 + this.rng() * 0.4 }, duration: 500 + this.rng() * 900,
          yoyo: true, repeat: -1, repeatDelay: 1500 + this.rng() * 5000, delay: this.rng() * 5000,
        });
      }
    }
  }

  // ------------------------------------------------------------------ bichos

  private setupCritters(): void {
    const has = (c: string) => this.life.critters.includes(c as never);
    if (has("moths")) {
      const lit = this.lights.filter((l) => l.flames.length || l.halo).slice(0, 3);
      for (const l of lit) {
        for (let i = 0; i < 2; i += 1) {
          const img = this.scene.add.image(0, 0, "moth").setDepth(-880).setAlpha(0.85);
          this.moths.push({ img, light: l, angle: this.rng() * 6, radius: 22 + this.rng() * 40, speed: (this.rng() < 0.5 ? -1 : 1) * (2 + this.rng() * 2.5), seed: this.rng() * 9 });
        }
      }
    }
    if (has("fireflies")) {
      const box = { x0: 0.05 * W, y0: 0.3 * H, x1: 0.95 * W, y1: 0.85 * H };
      for (let i = 0; i < 16; i += 1) {
        const img = this.scene.add.image(box.x0 + this.rng() * (box.x1 - box.x0), box.y0 + this.rng() * (box.y1 - box.y0), "halo")
          .setScale(0.035 + this.rng() * 0.02).setTint(0xd8ff8a).setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(this.rng() < 0.3 ? 1400 : -860);
        this.flies.push({ img, vx: (this.rng() - 0.5) * 28, vy: (this.rng() - 0.5) * 18, box, seed: this.rng() * 9, base: 0.9 });
      }
    }
    if (has("dancers")) {
      for (const [i, key] of ["dancers-1", "dancers-2"].entries()) {
        if (!this.scene.textures.exists(key) || !SPRITES[key]) continue;
        const halo = this.scene.add.image(0, 0, "halo").setBlendMode(Phaser.BlendModes.ADD).setTint(0xb8ccff).setAlpha(0.18);
        const img = this.scene.add.image(0, 0, key).setOrigin(SPRITES[key].originX, SPRITES[key].originY).setAlpha(0.66);
        // La luz de la sala también les llega (y brillan un poco, como todos los fantasmas).
        if (lighting.enabled) {
          const lp: ActorLightParams = {
            keyDir: [0, -1], keyColor: [0, 0, 0], saturation: 0.9, contrast: 0.95, fog: 0.1, emissive: 0.45,
            rimTexels: 3, keyPower: 0, warp: [0, 0, 0, 0], ripple: [0.02, 0],
          };
          img.setPipeline(ACTOR_LIGHT);
          (img as unknown as { lightParams: ActorLightParams }).lightParams = lp;
        }
        this.dancers.push({ img, halo, key, phase: i * Math.PI + this.rng() * 0.5, speed: 0.32 + this.rng() * 0.06, spin: this.rng() * 6 });
      }
    }
    if (has("rain") && !this.opts.calm) {
      const n = this.opts.lowFx ? 34 : 90;
      for (let i = 0; i < n; i += 1) {
        const front = this.rng() < 0.55;
        const img = this.scene.add.image(this.rng() * W, this.rng() * H, "streak").setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(front ? 1450 : -845).setAlpha(front ? 0.14 + this.rng() * 0.12 : 0.1).setRotation(-0.12)
          .setScale(front ? 1.3 : 0.8, front ? 1.3 + this.rng() * 0.8 : 0.7 + this.rng() * 0.4);
        this.rain.push({ img, vy: (front ? 1500 : 850) * (0.8 + this.rng() * 0.4) });
      }
    }
    const every = (a: number, b: number, run: () => void, first?: number) =>
      this.timers.push({ at: first ?? a * 0.4 + this.rng() * (b - a), every: [a, b], run });
    if (has("bats") && !this.opts.calm) every(14, 34, () => this.bat());
    if (has("spider")) every(22, 50, () => this.spider());
    if (has("mouse")) every(18, 45, () => this.mouse());
    if (has("wisps") && this.life.wisps && !this.opts.lowFx) every(9, 22, () => this.wisp(), 2 + this.rng() * 4);
    for (const d of this.life.drips ?? []) every(1.2, 3.6, () => this.drip(d.from, d.to));
    for (const s of this.life.steam ?? []) every(0.35, 0.9, () => this.puff(s));
  }

  private bat(): void {
    const win = this.life.windows[Math.floor(this.rng() * this.life.windows.length)];
    const b = win ? bbox(win) : { x0: 0.1, y0: 0.05, x1: 0.9, y1: 0.25 };
    const ltr = this.rng() < 0.5;
    const y = (b.y0 + (b.y1 - b.y0) * (0.2 + this.rng() * 0.5)) * H;
    const x0 = ltr ? b.x0 * W - 80 : b.x1 * W + 80;
    const x1 = ltr ? b.x1 * W + 80 : b.x0 * W - 80;
    const scale = win ? 0.45 + this.rng() * 0.3 : 0.7 + this.rng() * 0.4;
    const bat = this.scene.add.image(x0, y, "bat", 0).setScale(ltr ? scale : -scale, scale).setDepth(win ? -895 : -860).setAlpha(0.95);
    let frame = 0;
    const flap = this.scene.time.addEvent({ delay: 70, loop: true, callback: () => bat.setFrame((frame = 1 - frame)) });
    const dur = 1800 + this.rng() * 1600;
    this.scene.tweens.add({
      targets: bat, x: x1, duration: dur, ease: "Sine.easeInOut",
      onUpdate: (tw) => { bat.y = y + Math.sin(tw.progress * Math.PI * 5) * 14; },
      onComplete: () => {
        flap.remove();
        bat.destroy();
      },
    });
  }

  private spider(): void {
    const x = (0.12 + this.rng() * 0.76) * W;
    const drop = (0.1 + this.rng() * 0.18) * H;
    const g = this.scene.add.graphics().setDepth(-860);
    const state = { y: 0 };
    const draw = () => {
      g.clear();
      g.lineStyle(1.5, 0xc8d0dc, 0.35).lineBetween(x, 0, x, state.y);
      g.fillStyle(0x0c0a0a, 0.95).fillCircle(x, state.y + 6, 6).fillCircle(x, state.y - 1, 4);
      g.lineStyle(1.5, 0x0c0a0a, 0.9);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i += 1) {
        const a = -0.6 + i * 0.4;
        g.lineBetween(x, state.y + 5, x + s * 11 * Math.cos(a), state.y + 5 + 9 * Math.sin(a) + i);
      }
    };
    this.scene.tweens.chain({
      targets: state,
      tweens: [
        { y: drop, duration: 2600 + this.rng() * 1500, ease: "Sine.easeOut", onUpdate: draw },
        { y: drop + 6, duration: 1400, yoyo: true, repeat: 1, onUpdate: draw },
        { y: -20, duration: 2200, ease: "Sine.easeIn", onUpdate: draw },
      ],
      onComplete: () => g.destroy(),
    });
  }

  private mouse(): void {
    const y = (0.86 + this.rng() * 0.1) * H;
    const ltr = this.rng() < 0.5;
    const len = 0.13 * this.proj.ppm(y);
    const m = this.scene.add.image(ltr ? -40 : W + 40, y, "mouse").setDisplaySize(len * 1.6, len * 0.66).setDepth(y);
    if (!ltr) m.setFlipX(true);
    else m.setFlipX(false);
    const stop = (0.3 + this.rng() * 0.4) * W;
    const speed = 900 + this.rng() * 400;
    const mid = ltr ? stop : W - stop;
    this.scene.tweens.chain({
      targets: m,
      tweens: [
        { x: mid, duration: (Math.abs(mid - m.x) / speed) * 1000, ease: "Linear", onUpdate: () => (m.y = y - Math.abs(Math.sin(m.x * 0.12)) * 2) },
        { x: mid + (ltr ? 3 : -3), duration: 120, yoyo: true, repeat: 2 },
        { x: ltr ? W + 60 : -60, duration: (W * 0.8 / speed) * 1000, ease: "Linear", onUpdate: () => (m.y = y - Math.abs(Math.sin(m.x * 0.12)) * 2) },
      ],
      onComplete: () => m.destroy(),
    });
  }

  private wisp(): void {
    const b = bbox(this.life.wisps!);
    const keys = this.scene.textures.getTextureKeys().filter((k) => k.startsWith("ghost-"));
    if (!keys.length) return;
    const ltr = this.rng() < 0.5;
    const y = (b.y0 + (b.y1 - b.y0) * this.rng()) * H;
    const h = 60 + this.rng() * 50;
    const img = this.scene.add.image(ltr ? b.x0 * W : b.x1 * W, y, keys[Math.floor(this.rng() * keys.length)])
      .setDisplaySize(h * 0.75, h).setAlpha(0).setTint(0xbfd4ff).setDepth(-860).setBlendMode(Phaser.BlendModes.ADD);
    if (!ltr) img.setFlipX(true);
    const dur = 7000 + this.rng() * 4000;
    this.scene.tweens.add({ targets: img, x: ltr ? b.x1 * W : b.x0 * W, duration: dur, ease: "Sine.easeInOut",
      onUpdate: (tw) => { img.y = y + Math.sin(tw.progress * Math.PI * 3) * 10; }, onComplete: () => img.destroy() });
    this.scene.tweens.chain({ targets: img, tweens: [{ alpha: 0.32, duration: dur * 0.35 }, { alpha: 0.32, duration: dur * 0.3 }, { alpha: 0, duration: dur * 0.35 }] });
  }

  private drip(from: readonly [number, number], to: number): void {
    const x = from[0] * W + (this.rng() - 0.5) * 30;
    const y0 = from[1] * H;
    const y1 = to * H;
    const d = this.scene.add.image(x, y0, "halo").setScale(0.022, 0.034).setTint(0xcfe0ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(y1);
    this.scene.tweens.add({
      targets: d, y: y1, duration: 380 + Math.sqrt(Math.max(1, y1 - y0)) * 22, ease: "Quad.easeIn",
      onComplete: () => {
        d.destroy();
        const ring = this.scene.add.ellipse(x, y1, 8, 3).setStrokeStyle(2, 0xcfe0ff, 0.6).setDepth(y1);
        this.scene.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 700, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
      },
    });
  }

  private puff(at: readonly [number, number]): void {
    const p = px(at[0], at[1]);
    const s = this.scene.add.image(p.x, p.y, "puff").setScale(0.12).setAlpha(0.22).setDepth(-880);
    this.scene.tweens.add({
      targets: s, y: p.y - 70 - this.rng() * 60, x: p.x + (this.rng() - 0.5) * 50, scale: 0.55 + this.rng() * 0.3, alpha: 0,
      duration: 2200 + this.rng() * 1200, ease: "Sine.easeOut", onComplete: () => s.destroy(),
    });
  }
}
