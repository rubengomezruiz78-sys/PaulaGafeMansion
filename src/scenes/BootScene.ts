import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, GAME_H, GAME_W } from "../config";
import { SPRITES, SPRITE_KEYS, spritePath } from "../content/sprites";
import { NPCS } from "../content/npcs";
import { ZONES } from "../content/zones";
import { makeGhostTexture } from "../world/ghostArt";

/** Carga de recursos + texturas procedurales. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    const w = 720;
    const x = (GAME_W - w) / 2;
    const y = GAME_H / 2 + 60;
    this.add.text(GAME_W / 2, GAME_H / 2 - 40, "Paula & Gafe", {
      fontFamily: FONT_TITLE, fontSize: "72px", color: CSS.ivory,
    }).setOrigin(0.5);
    this.add.rectangle(x, y, w, 6, 0x2a2f33).setOrigin(0, 0.5);
    const bar = this.add.rectangle(x, y, 1, 6, COLORS.copper).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => bar.setSize(Math.max(1, w * p), 6));

    this.load.image("cover", "cover.webp");
    for (const zone of Object.values(ZONES)) {
      if (zone) this.load.image(`zone-${zone.id}`, zone.image);
    }
    for (const key of SPRITE_KEYS) {
      const meta = SPRITES[key];
      if (meta.frames > 1) {
        this.load.spritesheet(key, spritePath(key), { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
      } else {
        this.load.image(key, spritePath(key));
      }
    }
  }

  create(): void {
    this.makeShadowTexture();
    this.makeRingTexture();
    this.makeGlintTexture();
    this.makeVignetteTexture();
    // Los criados fantasma se dibujan por código una sola vez.
    for (const npc of NPCS) if (npc.art) makeGhostTexture(this, npc.sprite, npc.art);
    this.scene.start("title");
  }

  /** Sombra de contacto: elipse con degradado radial suave (se escala por perspectiva). */
  private makeShadowTexture(): void {
    const size = 256;
    const tex = this.textures.createCanvas("shadow", size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.72)");
    g.addColorStop(0.45, "rgba(0,0,0,0.42)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  /** Anillo para marcar dónde se ha tocado el suelo. */
  private makeRingTexture(): void {
    const size = 256;
    const tex = this.textures.createCanvas("ring", size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.strokeStyle = "rgba(240,210,150,0.95)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
  }

  /** Viñeta: transparente en el centro, oscura en los bordes (profundidad de cuadro). */
  private makeVignetteTexture(): void {
    const w = 480;
    const h = 270;
    const tex = this.textures.createCanvas("vignette", w, h);
    if (!tex) return;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.35, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, "rgba(2,3,5,0)");
    g.addColorStop(0.6, "rgba(2,3,5,0.25)");
    g.addColorStop(1, "rgba(2,3,5,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  /** Destello para señalar lo que se puede tocar. */
  private makeGlintTexture(): void {
    const size = 128;
    const tex = this.textures.createCanvas("glint", size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255,244,214,1)");
    g.addColorStop(0.18, "rgba(255,226,160,0.55)");
    g.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(255,248,230,0.9)";
    for (const [w, h] of [[size * 0.9, 3], [3, size * 0.9]]) ctx.fillRect(c - w / 2, c - h / 2, w, h);
    tex.refresh();
  }
}
