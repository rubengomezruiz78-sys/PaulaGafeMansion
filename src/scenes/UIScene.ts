import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_W } from "../config";
import { SPRITES, type SpriteKey } from "../content/sprites";
import { pushBackHandler } from "../platform";

export interface DialogueRequest {
  speaker: string;
  role?: string;
  portrait?: SpriteKey;
  lines: string[];
  onClose?: () => void;
}

/** Eventos entre escenas (en game.events). */
export const UI_EVENTS = {
  dialogue: "ui:dialogue",
  zone: "ui:zone",
  toast: "ui:toast",
  modal: "ui:modal",
} as const;

const PANEL = { x: 150, y: 770, w: GAME_W - 300, h: 285 };
const PORTRAIT_R = 108;
const CHARS_PER_SECOND = 48;

/**
 * Capa de interfaz. Vive en la misma resolución lógica que el mundo, así que
 * escala igual en tablet y móvil. Mientras hay un diálogo abierto, el mundo
 * no recibe toques (registry "modal").
 */
export class UIScene extends Phaser.Scene {
  private dialogue?: Phaser.GameObjects.Container;
  private queue: string[] = [];
  private current?: DialogueRequest;
  private textObj?: Phaser.GameObjects.Text;
  private hint?: Phaser.GameObjects.Text;
  private fullText = "";
  private shown = 0;
  private releaseBack?: () => void;
  private zoneTitle?: Phaser.GameObjects.Text;
  private toastObj?: Phaser.GameObjects.Container;

  constructor() {
    super("ui");
  }

  create(): void {
    this.registry.set("modal", false);
    this.game.events.on(UI_EVENTS.dialogue, this.openDialogue, this);
    this.game.events.on(UI_EVENTS.zone, this.showZoneTitle, this);
    this.game.events.on(UI_EVENTS.toast, this.showToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(UI_EVENTS.dialogue, this.openDialogue, this);
      this.game.events.off(UI_EVENTS.zone, this.showZoneTitle, this);
      this.game.events.off(UI_EVENTS.toast, this.showToast, this);
    });
    // Cualquier toque avanza el diálogo abierto.
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.advance());
  }

  update(_time: number, delta: number): void {
    if (!this.textObj || this.shown >= this.fullText.length) return;
    this.shown = Math.min(this.fullText.length, this.shown + (CHARS_PER_SECOND * delta) / 1000);
    this.textObj.setText(this.fullText.slice(0, Math.floor(this.shown)));
    if (this.shown >= this.fullText.length) this.hint?.setVisible(true);
  }

  private setModal(on: boolean): void {
    this.registry.set("modal", on);
    this.game.events.emit(UI_EVENTS.modal, on);
  }

  private openDialogue(req: DialogueRequest): void {
    this.closeDialogue(false);
    this.current = req;
    this.queue = [...req.lines];
    this.setModal(true);
    this.releaseBack = pushBackHandler(() => {
      this.closeDialogue(true);
      return true;
    });

    const c = this.add.container(0, 0).setDepth(100);
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.35).fillRoundedRect(PANEL.x + 6, PANEL.y + 10, PANEL.w, PANEL.h, 26);
    panel.fillStyle(COLORS.panel, 0.95).fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
    panel.lineStyle(3, COLORS.panelEdge, 0.7).strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
    c.add(panel);

    const cx = PANEL.x + 40 + PORTRAIT_R;
    const cy = PANEL.y + PANEL.h / 2;
    const ring = this.add.graphics();
    ring.fillStyle(0x16242a, 1).fillCircle(cx, cy, PORTRAIT_R);
    c.add(ring);
    if (req.portrait) {
      const meta = SPRITES[req.portrait];
      // Encuadre de cara: la cabeza (arriba del todo del sprite) queda en la
      // mitad superior del círculo y los hombros abajo. Centrado en el eje del
      // cuerpo (ancla de los pies), no en el lienzo.
      const img = this.add.image(cx, cy, req.portrait, 0);
      const faceH = meta.frameHeight * (meta.realHeightM < 0.5 ? 0.42 : 0.2);
      const s = (PORTRAIT_R * 2) / faceH;
      img.setScale(s).setOrigin(meta.originX, 0);
      img.setPosition(cx, cy - PORTRAIT_R + 8);
      const maskShape = this.make.graphics({}, false).fillCircle(cx, cy, PORTRAIT_R - 4);
      img.setMask(maskShape.createGeometryMask());
      c.add(img);
    }
    const edge = this.add.graphics();
    edge.lineStyle(4, COLORS.copper, 0.9).strokeCircle(cx, cy, PORTRAIT_R);
    c.add(edge);

    const tx = cx + PORTRAIT_R + 44;
    const name = this.add.text(tx, PANEL.y + 30, req.speaker, {
      fontFamily: FONT_TITLE, fontSize: "40px", color: CSS.copper,
    });
    c.add(name);
    if (req.role) {
      c.add(this.add.text(tx + name.width + 22, PANEL.y + 42, req.role.toUpperCase(), {
        fontFamily: FONT_UI, fontSize: "22px", color: CSS.muted, letterSpacing: 2,
      }));
    }
    this.textObj = this.add.text(tx, PANEL.y + 92, "", {
      fontFamily: FONT_UI, fontSize: "36px", color: CSS.ivory, lineSpacing: 10,
      wordWrap: { width: PANEL.x + PANEL.w - tx - 60, useAdvancedWrap: true },
    });
    c.add(this.textObj);
    this.hint = this.add.text(PANEL.x + PANEL.w - 40, PANEL.y + PANEL.h - 26, "toca para seguir  ▸", {
      fontFamily: FONT_UI, fontSize: "24px", color: CSS.copper,
    }).setOrigin(1, 1).setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    c.add(this.hint);

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.dialogue = c;
    this.nextLine();
  }

  private nextLine(): void {
    const line = this.queue.shift();
    if (line === undefined) {
      this.closeDialogue(true);
      return;
    }
    this.fullText = line;
    this.shown = 0;
    this.textObj?.setText("");
    this.hint?.setVisible(false);
  }

  private advance(): void {
    if (!this.dialogue || !this.textObj) return;
    if (this.shown < this.fullText.length) {
      // Primer toque: muestra la frase entera; el siguiente pasa a la próxima.
      this.shown = this.fullText.length;
      this.textObj.setText(this.fullText);
      this.hint?.setVisible(true);
      return;
    }
    this.nextLine();
  }

  private closeDialogue(notify: boolean): void {
    if (!this.dialogue) return;
    const d = this.dialogue;
    this.dialogue = undefined;
    this.textObj = undefined;
    this.hint = undefined;
    this.releaseBack?.();
    this.releaseBack = undefined;
    this.tweens.add({ targets: d, alpha: 0, duration: 140, onComplete: () => d.destroy() });
    const req = this.current;
    this.current = undefined;
    // El mundo vuelve a aceptar toques en el fotograma siguiente (el toque que
    // cierra el diálogo no debe mandar a Paula a caminar).
    this.time.delayedCall(60, () => this.setModal(false));
    if (notify) req?.onClose?.();
  }

  private showZoneTitle(name: string): void {
    this.zoneTitle?.destroy();
    const t = this.add.text(GAME_W / 2, 70, name, {
      fontFamily: FONT_TITLE, fontSize: "56px", color: CSS.ivory,
      shadow: { offsetX: 0, offsetY: 4, color: "#000", blur: 18, fill: true },
    }).setOrigin(0.5, 0).setAlpha(0).setDepth(90);
    this.zoneTitle = t;
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, duration: 600, ease: "Sine.easeOut" },
        { alpha: 1, duration: 1600 },
        { alpha: 0, duration: 900, ease: "Sine.easeIn" },
      ],
    });
  }

  private showToast(text: string): void {
    this.toastObj?.destroy();
    const label = this.add.text(0, 0, text, {
      fontFamily: FONT_UI, fontSize: "30px", color: CSS.ivory,
      wordWrap: { width: 1200, useAdvancedWrap: true }, align: "center",
    }).setOrigin(0.5);
    const bg = this.add.graphics();
    const w = label.width + 70;
    const h = label.height + 36;
    bg.fillStyle(COLORS.panel, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(2, COLORS.panelEdge, 0.55).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    const c = this.add.container(GAME_W / 2, 170, [bg, label]).setDepth(95).setAlpha(0);
    this.toastObj = c;
    this.tweens.chain({
      targets: c,
      tweens: [
        { alpha: 1, duration: 200 },
        { alpha: 1, duration: 1800 + text.length * 30 },
        { alpha: 0, duration: 400, onComplete: () => c.destroy() },
      ],
    });
  }
}

