/**
 * Piezas de interfaz compartidas (botones, paneles), dibujadas en la
 * resolución lógica 1920×1080 para que escalen igual en tablet y móvil.
 * Los botones reaccionan al soltar (como los nativos) y se ven pulsados al tocar.
 */
import Phaser from "phaser";
import { sound } from "../audio/sound";
import { COLORS, CSS, FONT_UI, GAME_H, GAME_W } from "../config";

export interface ButtonOptions {
  fontSize?: number;
  /** Relleno normal y pulsado. */
  fill?: number;
  pressedFill?: number;
  edge?: number;
  color?: string;
  radius?: number;
  align?: "center" | "left";
}

export interface Button {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setEnabled(on: boolean): void;
  setStyle(fill: number, edge?: number): void;
}

export function makeButton(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string,
  onTap: () => void, opts: ButtonOptions = {},
): Button {
  const radius = opts.radius ?? 20;
  let fill = opts.fill ?? COLORS.panel;
  let edge = opts.edge ?? COLORS.copper;
  const pressedFill = opts.pressedFill ?? 0x3a2716;
  let enabled = true;
  const bg = scene.add.graphics();
  const draw = (pressed: boolean) => {
    bg.clear();
    bg.fillStyle(0x000000, 0.3).fillRoundedRect(4, 6, w, h, radius);
    bg.fillStyle(pressed ? pressedFill : fill, enabled ? 0.97 : 0.5).fillRoundedRect(0, 0, w, h, radius);
    bg.lineStyle(3, edge, enabled ? (pressed ? 1 : 0.75) : 0.3).strokeRoundedRect(0, 0, w, h, radius);
  };
  draw(false);
  const label = scene.add.text(opts.align === "left" ? 28 : w / 2, h / 2, text, {
    fontFamily: FONT_UI, fontSize: `${opts.fontSize ?? 34}px`, color: opts.color ?? CSS.ivory, align: "center",
    wordWrap: { width: w - 40, useAdvancedWrap: true },
  }).setOrigin(opts.align === "left" ? 0 : 0.5, 0.5);
  const hit = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  let down = false;
  hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
    if (!enabled) return;
    down = true;
    draw(true);
  });
  hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
    down = false;
    draw(false);
  });
  hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    if (!enabled || !down) return;
    down = false;
    draw(false);
    sound.play("tap");
    onTap();
  });
  const container = scene.add.container(x, y, [bg, label, hit]);
  return {
    container,
    label,
    setEnabled(on: boolean) {
      enabled = on;
      label.setAlpha(on ? 1 : 0.45);
      draw(false);
    },
    setStyle(f: number, e?: number) {
      fill = f;
      if (e !== undefined) edge = e;
      draw(false);
    },
  };
}

/** Panel de fondo con sombra y borde cobre. */
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, radius = 28): void {
  g.fillStyle(0x000000, 0.4).fillRoundedRect(x + 8, y + 12, w, h, radius);
  g.fillStyle(COLORS.panel, 0.97).fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(3, COLORS.panelEdge, 0.7).strokeRoundedRect(x, y, w, h, radius);
}

/** Velo oscuro a pantalla completa que además se traga los toques. */
export function addScrim(scene: Phaser.Scene, alpha = 0.72): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x020304, alpha).setOrigin(0).setInteractive();
}
