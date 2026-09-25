import Phaser from "phaser";
import { COLORS, CSS, FONT_UI, PHONE, fs } from "../config";
import type { Actor } from "./Actor";

const MAX_W = PHONE ? 740 : 620;

/**
 * Bocadillo sobre la cabeza de un personaje (saludos, comentarios que Paula
 * oye al pasar). Tamaño fijo en la escena lógica para que siempre se lea; se
 * mantiene dentro de la pantalla y dura según la longitud del texto.
 */
export class Bubble {
  private readonly c: Phaser.GameObjects.Container;
  private readonly w: number;
  private readonly h: number;
  private dead = false;

  constructor(private readonly scene: Phaser.Scene, private readonly owner: Actor, text: string) {
    const label = scene.add.text(0, 0, text, {
      fontFamily: FONT_UI, fontSize: fs(30), color: CSS.ink, align: "center",
      wordWrap: { width: MAX_W - 48, useAdvancedWrap: true }, lineSpacing: 4,
    }).setOrigin(0.5);
    this.w = Math.min(MAX_W, label.width + 48);
    this.h = label.height + 30;
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(-this.w / 2 + 4, -this.h + 6, this.w, this.h, 22);
    g.fillStyle(0xf4ecdc, 0.97).fillRoundedRect(-this.w / 2, -this.h, this.w, this.h, 22);
    g.lineStyle(3, COLORS.panelEdge, 0.9).strokeRoundedRect(-this.w / 2, -this.h, this.w, this.h, 22);
    g.fillStyle(0xf4ecdc, 0.97).fillTriangle(-14, -2, 14, -2, 0, 22);
    label.setY(-this.h / 2);
    this.c = scene.add.container(0, 0, [g, label]).setDepth(5000).setAlpha(0).setScale(0.85);
    scene.tweens.add({ targets: this.c, alpha: 1, scale: 1, duration: 180, ease: "Back.easeOut" });
    const life = 2200 + text.length * 55;
    scene.time.delayedCall(life, () => this.destroy());
    this.follow();
  }

  get alive(): boolean {
    return !this.dead;
  }

  follow(): void {
    if (this.dead) return;
    const x = Phaser.Math.Clamp(this.owner.pos.x, this.w / 2 + 16, this.scene.scale.gameSize.width - this.w / 2 - 16);
    const y = Math.max(this.h + 24, this.owner.headY() - 26);
    this.c.setPosition(x, y);
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 220, onComplete: () => this.c.destroy() });
  }
}
