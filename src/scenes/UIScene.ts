import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_W } from "../config";
import type { DialogueRunner, Step } from "../core/dialogue";
import type { Notice } from "../core/rules";
import { SPRITES, type SpriteKey } from "../content/sprites";
import { pushBackHandler } from "../platform";

export interface Speaker {
  name: string;
  role?: string;
  portrait?: SpriteKey;
}

/** Frases de un solo hablante (examinar objetos, avisos narrativos). */
export interface DialogueRequest {
  speaker: string;
  role?: string;
  portrait?: SpriteKey;
  lines: string[];
  onClose?: () => void;
}

/** Conversación ramificada llevada por el motor de diálogo. */
export interface ConversationRequest {
  runner: DialogueRunner;
  speaker: (id: string) => Speaker;
  notice: (n: Notice) => string | null;
  /** Tras cada elección (p. ej. para guardar sin esperar al final). */
  onChange?: () => void;
  onEnd?: () => void;
}

/** Eventos entre escenas (en game.events). */
export const UI_EVENTS = {
  dialogue: "ui:dialogue",
  conversation: "ui:conversation",
  zone: "ui:zone",
  toast: "ui:toast",
  modal: "ui:modal",
} as const;

const PANEL = { x: 150, y: 770, w: GAME_W - 300, h: 285 };
const PORTRAIT_R = 108;
const CHARS_PER_SECOND = 48;
const CHOICE = { w: 860, h: 78, gap: 14, right: PANEL.x + PANEL.w, bottom: PANEL.y - 18 };

interface QueuedLine {
  speaker: Speaker;
  text: string;
}

/**
 * Capa de interfaz. Vive en la misma resolución lógica que el mundo, así que
 * escala igual en tablet y móvil. Mientras hay un diálogo abierto, el mundo
 * no recibe toques (registry "modal").
 */
export class UIScene extends Phaser.Scene {
  private panel?: Phaser.GameObjects.Container;
  private portrait?: Phaser.GameObjects.Image;
  private portraitKey?: SpriteKey;
  private nameText?: Phaser.GameObjects.Text;
  private roleText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private hint?: Phaser.GameObjects.Text;
  private choiceBox?: Phaser.GameObjects.Container;

  private queue: QueuedLine[] = [];
  private choices: { id: string; text: string }[] = [];
  private fullText = "";
  private shown = 0;
  private runner?: DialogueRunner;
  private speakerOf?: (id: string) => Speaker;
  private describeNotice?: (n: Notice) => string | null;
  private onChange?: () => void;
  private onClose?: () => void;
  private releaseBack?: () => void;
  private zoneTitle?: Phaser.GameObjects.Text;
  private toasts: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("ui");
  }

  create(): void {
    this.registry.set("modal", false);
    const ev = this.game.events;
    ev.on(UI_EVENTS.dialogue, this.openSimple, this);
    ev.on(UI_EVENTS.conversation, this.openConversation, this);
    ev.on(UI_EVENTS.zone, this.showZoneTitle, this);
    ev.on(UI_EVENTS.toast, this.showToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off(UI_EVENTS.dialogue, this.openSimple, this);
      ev.off(UI_EVENTS.conversation, this.openConversation, this);
      ev.off(UI_EVENTS.zone, this.showZoneTitle, this);
      ev.off(UI_EVENTS.toast, this.showToast, this);
    });
    // Un toque en cualquier parte avanza el texto (salvo si hay que elegir).
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.advance());
  }

  update(_time: number, delta: number): void {
    if (!this.bodyText || this.shown >= this.fullText.length) return;
    this.shown = Math.min(this.fullText.length, this.shown + (CHARS_PER_SECOND * delta) / 1000);
    this.bodyText.setText(this.fullText.slice(0, Math.floor(this.shown)));
    if (this.shown >= this.fullText.length) this.lineFinished();
  }

  // ------------------------------------------------------------ apertura

  private openSimple(req: DialogueRequest): void {
    const speaker: Speaker = { name: req.speaker, role: req.role, portrait: req.portrait };
    this.begin(req.onClose);
    this.queue = req.lines.map((text) => ({ speaker, text }));
    this.choices = [];
    this.nextLine();
  }

  private openConversation(req: ConversationRequest): void {
    this.begin(req.onEnd);
    this.runner = req.runner;
    this.speakerOf = req.speaker;
    this.describeNotice = req.notice;
    this.onChange = req.onChange;
    const step = req.runner.start();
    this.onChange?.();
    if (!step) {
      this.close(true);
      return;
    }
    this.showStep(step);
  }

  private begin(onClose?: () => void): void {
    this.close(false);
    this.onClose = onClose;
    this.setModal(true);
    this.releaseBack = pushBackHandler(() => {
      this.close(true);
      return true;
    });
    this.buildPanel();
  }

  private showStep(step: Step): void {
    for (const n of step.notices) {
      const text = this.describeNotice?.(n);
      if (text) this.showToast(text);
    }
    const resolve = this.speakerOf ?? ((id: string) => ({ name: id }));
    this.queue = step.lines.map((l) => ({ speaker: resolve(l.by), text: l.text }));
    this.choices = step.choices;
    if (!this.queue.length) {
      if (this.choices.length) this.showChoices();
      else this.close(true);
      return;
    }
    this.nextLine();
  }

  // ------------------------------------------------------------ panel

  private buildPanel(): void {
    const c = this.add.container(0, 0).setDepth(100);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(PANEL.x + 6, PANEL.y + 10, PANEL.w, PANEL.h, 26);
    g.fillStyle(COLORS.panel, 0.95).fillRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
    g.lineStyle(3, COLORS.panelEdge, 0.7).strokeRoundedRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 26);
    const cx = PANEL.x + 40 + PORTRAIT_R;
    const cy = PANEL.y + PANEL.h / 2;
    g.fillStyle(0x16242a, 1).fillCircle(cx, cy, PORTRAIT_R);
    c.add(g);
    const edge = this.add.graphics().lineStyle(4, COLORS.copper, 0.9).strokeCircle(cx, cy, PORTRAIT_R);
    const tx = cx + PORTRAIT_R + 44;
    this.nameText = this.add.text(tx, PANEL.y + 30, "", { fontFamily: FONT_TITLE, fontSize: "40px", color: CSS.copper });
    this.roleText = this.add.text(tx, PANEL.y + 42, "", { fontFamily: FONT_UI, fontSize: "22px", color: CSS.muted, letterSpacing: 2 });
    this.bodyText = this.add.text(tx, PANEL.y + 92, "", {
      fontFamily: FONT_UI, fontSize: "36px", color: CSS.ivory, lineSpacing: 10,
      wordWrap: { width: PANEL.x + PANEL.w - tx - 60, useAdvancedWrap: true },
    });
    this.hint = this.add.text(PANEL.x + PANEL.w - 40, PANEL.y + PANEL.h - 26, "toca para seguir  ▸", {
      fontFamily: FONT_UI, fontSize: "24px", color: CSS.copper,
    }).setOrigin(1, 1).setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    c.add([this.nameText, this.roleText, this.bodyText, this.hint]);
    c.add(edge); // el aro por encima del retrato
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.panel = c;
  }

  private setSpeaker(s: Speaker): void {
    if (!this.panel || !this.nameText || !this.roleText) return;
    this.nameText.setText(s.name);
    this.roleText.setText(s.role ? s.role.toUpperCase() : "").setX(this.nameText.x + this.nameText.width + 22);
    if (s.portrait === this.portraitKey) return;
    this.portrait?.destroy();
    this.portrait = undefined;
    this.portraitKey = s.portrait;
    if (!s.portrait) return;
    const meta = SPRITES[s.portrait];
    const cx = PANEL.x + 40 + PORTRAIT_R;
    const cy = PANEL.y + PANEL.h / 2;
    // Encuadre de cara: cabeza en la mitad superior del círculo, centrada en el
    // eje del cuerpo (ancla de los pies), no en el lienzo.
    const faceH = meta.frameHeight * (meta.realHeightM < 0.5 ? 0.42 : 0.2);
    const img = this.add.image(cx, cy - PORTRAIT_R + 8, s.portrait, 0)
      .setOrigin(meta.originX, 0)
      .setScale((PORTRAIT_R * 2) / faceH);
    const mask = this.make.graphics({}, false).fillCircle(cx, cy, PORTRAIT_R - 4);
    img.setMask(mask.createGeometryMask());
    this.panel.addAt(img, 1);
    this.portrait = img;
  }

  private nextLine(): void {
    const line = this.queue.shift();
    if (!line) {
      if (this.choices.length) this.showChoices();
      else this.close(true);
      return;
    }
    this.setSpeaker(line.speaker);
    this.fullText = line.text;
    this.shown = 0;
    this.bodyText?.setText("");
    this.hint?.setVisible(false);
  }

  /** Terminó de escribirse la frase: si es la última y hay opciones, se muestran ya. */
  private lineFinished(): void {
    if (!this.queue.length && this.choices.length) this.showChoices();
    else this.hint?.setVisible(true);
  }

  private advance(): void {
    if (!this.panel || !this.bodyText || this.choiceBox) return;
    if (this.shown < this.fullText.length) {
      // Primer toque: muestra la frase entera; el siguiente pasa a la próxima.
      this.shown = this.fullText.length;
      this.bodyText.setText(this.fullText);
      this.lineFinished();
      return;
    }
    this.nextLine();
  }

  // ------------------------------------------------------------ opciones

  private showChoices(): void {
    if (this.choiceBox || !this.choices.length) return;
    this.hint?.setVisible(false);
    const box = this.add.container(0, 0).setDepth(110);
    const n = this.choices.length;
    this.choices.forEach((choice, i) => {
      const y = CHOICE.bottom - (n - i) * (CHOICE.h + CHOICE.gap) + CHOICE.gap;
      const x = CHOICE.right - CHOICE.w;
      const bg = this.add.graphics();
      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x3a2716 : COLORS.panel, 0.96).fillRoundedRect(x, y, CHOICE.w, CHOICE.h, 20);
        bg.lineStyle(3, COLORS.copper, hover ? 1 : 0.65).strokeRoundedRect(x, y, CHOICE.w, CHOICE.h, 20);
      };
      draw(false);
      const label = this.add.text(x + 30, y + CHOICE.h / 2, `▸  ${choice.text}`, {
        fontFamily: FONT_UI, fontSize: "32px", color: CSS.ivory,
        wordWrap: { width: CHOICE.w - 60, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);
      const hit = this.add.zone(x, y, CHOICE.w, CHOICE.h).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => draw(true));
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => draw(false));
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pick(choice.id));
      box.add([bg, label, hit]);
    });
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 150 });
    this.choiceBox = box;
  }

  private pick(id: string): void {
    if (!this.runner || !this.choiceBox) return;
    this.choiceBox.destroy();
    this.choiceBox = undefined;
    this.choices = [];
    const step = this.runner.choose(id);
    this.onChange?.();
    if (!step) {
      this.close(true);
      return;
    }
    this.showStep(step);
  }

  // ------------------------------------------------------------ cierre

  private setModal(on: boolean): void {
    this.registry.set("modal", on);
    this.game.events.emit(UI_EVENTS.modal, on);
  }

  private close(notify: boolean): void {
    if (!this.panel) return;
    const panel = this.panel;
    this.panel = undefined;
    this.portrait = undefined;
    this.portraitKey = undefined;
    this.bodyText = undefined;
    this.hint = undefined;
    this.choiceBox?.destroy();
    this.choiceBox = undefined;
    this.queue = [];
    this.choices = [];
    this.runner = undefined;
    this.onChange = undefined;
    this.releaseBack?.();
    this.releaseBack = undefined;
    this.tweens.add({ targets: panel, alpha: 0, duration: 140, onComplete: () => panel.destroy() });
    const onClose = this.onClose;
    this.onClose = undefined;
    // El mundo vuelve a aceptar toques un instante después: el toque que cierra
    // la conversación no debe mandar a Paula a caminar.
    this.time.delayedCall(80, () => this.setModal(false));
    if (notify) onClose?.();
  }

  // ------------------------------------------------------------ avisos

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

  /** Avisos apilados arriba (objetos conseguidos, misiones), sin taparse entre sí. */
  private showToast(text: string): void {
    const label = this.add.text(0, 0, text, {
      fontFamily: FONT_UI, fontSize: "30px", color: CSS.ivory,
      wordWrap: { width: 1200, useAdvancedWrap: true }, align: "center",
    }).setOrigin(0.5);
    const bg = this.add.graphics();
    const w = label.width + 70;
    const h = label.height + 36;
    bg.fillStyle(COLORS.panel, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(2, COLORS.panelEdge, 0.55).strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    const c = this.add.container(GAME_W / 2, 170 + this.toasts.length * 92, [bg, label]).setDepth(95).setAlpha(0);
    this.toasts.push(c);
    this.tweens.chain({
      targets: c,
      tweens: [
        { alpha: 1, duration: 200 },
        { alpha: 1, duration: 1800 + text.length * 30 },
        {
          alpha: 0, duration: 400,
          onComplete: () => {
            this.toasts = this.toasts.filter((t) => t !== c);
            c.destroy();
          },
        },
      ],
    });
  }
}
