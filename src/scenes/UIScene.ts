import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W, fs } from "../config";
import type { DialogueRunner, Line, Step } from "../core/dialogue";
import type { Notice } from "../core/rules";
import { fill } from "../core/text";
import { matchChoice } from "../core/speech";
import { listenErrorText, voice } from "../audio/voice";
import { ITEMS } from "../content/items";
import { speakerFor } from "../content/speakers";
import { SPRITES, type SpriteKey } from "../content/sprites";
import { session } from "../game/session";
import { pushBackHandler } from "../platform";
import { MODAL_EVENT, setModal } from "../ui/modal";
import { makeButton, type Button } from "../ui/widgets";

export interface Speaker {
  /** Quién es en el mundo («paula», «gafe», id de personaje): el bocadillo sale de su cabeza. */
  id?: string;
  name: string;
  role?: string;
  portrait?: SpriteKey;
}

/**
 * Frases sin opciones (examinar objetos, avisos, escenas). Las frases sueltas
 * las dice `speaker`; `{ by, text }` las dice otro (p. ej. Gafe o Inés).
 */
export interface DialogueRequest {
  speaker: string;
  speakerId?: string;
  role?: string;
  portrait?: SpriteKey;
  lines: Line[];
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
  modal: MODAL_EVENT,
  /** La interfaz pide usar un objeto (o dejar de usarlo, con null). */
  use: "ui:use",
  /** El mundo avisa de qué objeto tiene Paula en la mano (o null). */
  using: "ui:using",
} as const;

/** Bocadillo de diálogo (escena lógica 1920×1080): pequeño y junto a quien habla. */
const BUBBLE = { maxW: 780, pad: 22, portraitR: 40, gapHead: 22, margin: 18 };
const CHARS_PER_SECOND = 48;
/** Opciones: botones compactos y numerados, abajo a la derecha. */
const CHOICE = { w: 700, h: 62, gap: 10, right: GAME_W - 20, bottom: GAME_H - 16 };

/** Posición de la cabeza de un personaje presente en la sala (la da el mundo). */
export type SpeakerAnchor = (id: string) => { x: number; y: number } | null;

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
  /** El bocadillo abierto (se llama «panel» por compatibilidad con las pruebas). */
  private panel?: Phaser.GameObjects.Container;
  private bubbleBg?: Phaser.GameObjects.Graphics;
  private portraitMask?: Phaser.GameObjects.Graphics;
  private speaker?: Speaker;
  private bubbleSize = { w: 0, h: 0 };
  /** El texto de la frase ya partido en líneas (así no saltan palabras al escribirse). */
  private wrapped = "";
  private choiceTop = GAME_H;
  /** Cambia con cada frase: así una voz que termina tarde no pasa la frase siguiente. */
  private lineToken = 0;
  private micButton?: Button;
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
  private hud?: Phaser.GameObjects.Container;
  private usingChip?: Button;

  constructor() {
    super("ui");
  }

  create(): void {
    this.registry.set("modal", false);
    this.registry.set("modalOwners", []);
    const ev = this.game.events;
    ev.on(UI_EVENTS.dialogue, this.openSimple, this);
    ev.on(UI_EVENTS.conversation, this.openConversation, this);
    ev.on(UI_EVENTS.zone, this.showZoneTitle, this);
    ev.on(UI_EVENTS.toast, this.showToast, this);
    ev.on(UI_EVENTS.modal, this.onModal, this);
    ev.on(UI_EVENTS.using, this.showUsing, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off(UI_EVENTS.dialogue, this.openSimple, this);
      ev.off(UI_EVENTS.conversation, this.openConversation, this);
      ev.off(UI_EVENTS.zone, this.showZoneTitle, this);
      ev.off(UI_EVENTS.toast, this.showToast, this);
      ev.off(UI_EVENTS.modal, this.onModal, this);
      ev.off(UI_EVENTS.using, this.showUsing, this);
    });
    this.buildHud();
    // Un toque en cualquier parte avanza el texto (salvo si hay que elegir).
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.advance());
  }

  update(_time: number, delta: number): void {
    if (!this.panel) return;
    this.placeBubble();
    if (!this.bodyText || this.shown >= this.fullText.length) return;
    this.shown = Math.min(this.fullText.length, this.shown + (CHARS_PER_SECOND * delta) / 1000);
    this.bodyText.setText(this.visibleText());
    if (this.shown >= this.fullText.length) this.lineFinished();
  }

  /** Lo escrito hasta ahora, sobre el texto ya partido en líneas. */
  private visibleText(): string {
    let left = Math.floor(this.shown);
    let out = "";
    for (const ch of this.wrapped) {
      if (ch === "\n") {
        out += ch;
        continue;
      }
      if (left <= 0) break;
      out += ch;
      left -= 1;
    }
    return out;
  }

  // ------------------------------------------------------------ apertura

  private openSimple(req: DialogueRequest): void {
    const id = req.speakerId ?? (req.speaker === "Paula" ? "paula" : req.speaker === "Gafe" ? "gafe" : undefined);
    const speaker: Speaker = { id, name: req.speaker, role: req.role, portrait: req.portrait };
    this.begin(req.onClose);
    this.queue = req.lines.map((l) => (typeof l === "string" ? { speaker, text: l } : { speaker: speakerFor(l.by), text: l.text }));
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

  // ------------------------------------------------------------ bocadillo

  private buildPanel(): void {
    const c = this.add.container(0, 0).setDepth(100);
    this.bubbleBg = this.add.graphics();
    const r = BUBBLE.portraitR;
    const tx = BUBBLE.pad + r * 2 + 16;
    this.nameText = this.add.text(tx, BUBBLE.pad - 6, "", { fontFamily: FONT_TITLE, fontSize: fs(26), color: CSS.copper });
    this.roleText = this.add.text(tx, BUBBLE.pad, "", { fontFamily: FONT_UI, fontSize: fs(16), color: CSS.muted, letterSpacing: 2 });
    this.bodyText = this.add.text(tx, BUBBLE.pad + 30, "", {
      fontFamily: FONT_UI, fontSize: fs(30), color: CSS.ivory, lineSpacing: 6,
    });
    this.hint = this.add.text(0, 0, "▸", { fontFamily: FONT_UI, fontSize: fs(26), color: CSS.copper }).setOrigin(1, 1).setVisible(false);
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    c.add([this.bubbleBg, this.nameText, this.roleText, this.bodyText, this.hint]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 140 });
    this.panel = c;
  }

  private setSpeaker(s: Speaker): void {
    if (!this.panel || !this.nameText || !this.roleText) return;
    this.speaker = s;
    this.nameText.setText(s.name);
    this.roleText.setText(s.role ? s.role.toUpperCase() : "").setX(this.nameText.x + this.nameText.width + 12).setY(this.nameText.y + 9);
    if (s.portrait === this.portraitKey) return;
    this.portrait?.destroy();
    this.portraitMask?.destroy();
    this.portrait = undefined;
    this.portraitMask = undefined;
    this.portraitKey = s.portrait;
    if (!s.portrait) return;
    const meta = SPRITES[s.portrait];
    const r = BUBBLE.portraitR;
    // Encuadre de cara: cabeza en la mitad superior del círculo, centrada en el
    // eje del cuerpo (ancla de los pies), no en el lienzo.
    const frame = meta.portrait ?? { top: 0, height: meta.realHeightM < 0.5 ? 0.42 : 0.2 };
    const faceH = meta.frameHeight * frame.height;
    const img = this.add.image(0, 0, s.portrait, 0).setOrigin(meta.originX, frame.top).setScale((r * 2) / faceH);
    this.portraitMask = this.make.graphics({}, false);
    img.setMask(this.portraitMask.createGeometryMask());
    this.panel.addAt(img, 1);
    this.portrait = img;
  }

  /** Prepara el bocadillo para la frase: tamaño a medida del texto. */
  private layoutLine(): void {
    if (!this.bodyText || !this.nameText || !this.roleText) return;
    const r = BUBBLE.portraitR;
    const tx = BUBBLE.pad + r * 2 + 16;
    const maxText = BUBBLE.maxW - tx - BUBBLE.pad;
    this.bodyText.setWordWrapWidth(maxText, true);
    this.wrapped = voice.mode === "voz" ? "🔊  · · ·" : this.bodyText.getWrappedText(this.fullText).join("\n");
    this.bodyText.setWordWrapWidth(0).setText(this.wrapped);
    const textW = Math.max(this.bodyText.width, this.nameText.width + (this.roleText.text ? this.roleText.width + 12 : 0));
    const w = Math.min(BUBBLE.maxW, tx + textW + BUBBLE.pad + 18);
    const h = Math.max(BUBBLE.pad * 2 + r * 2, BUBBLE.pad + 30 + this.bodyText.height + BUBBLE.pad);
    this.bodyText.setText("");
    this.bubbleSize = { w, h };
    this.hint?.setPosition(w - 12, h - 6);
    this.placeBubble();
  }

  /**
   * Sobre la cabeza de quien habla (y le sigue si se mueve). Si no está en la
   * sala, subtítulo pequeño abajo. Nunca tapa las opciones.
   */
  private placeBubble(): void {
    if (!this.panel || !this.bubbleBg) return;
    const { w, h } = this.bubbleSize;
    const anchorOf = this.registry.get("speakerAnchor") as SpeakerAnchor | null;
    const a = this.speaker?.id && anchorOf ? anchorOf(this.speaker.id) : null;
    const m = BUBBLE.margin;
    let x: number;
    let y: number;
    let tip: { x: number; y: number } | null = null;
    if (a) {
      tip = { x: a.x, y: a.y - BUBBLE.gapHead };
      x = Phaser.Math.Clamp(tip.x - w / 2, m, GAME_W - w - m);
      y = Math.max(m, tip.y - h - 20);
    } else {
      x = this.choiceBox ? m * 2 : (GAME_W - w) / 2;
      y = GAME_H - h - 26;
    }
    if (this.choiceBox && x + w > CHOICE.right - CHOICE.w && y + h > this.choiceTop - 10) y = Math.max(m, this.choiceTop - h - 16);
    this.panel.setPosition(x, y);
    const g = this.bubbleBg;
    g.clear();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(4, 6, w, h, 20);
    g.fillStyle(COLORS.panel, 0.9).fillRoundedRect(0, 0, w, h, 20);
    g.lineStyle(2, COLORS.panelEdge, 0.55).strokeRoundedRect(0, 0, w, h, 20);
    if (tip && tip.y - y > h + 4) {
      const bx = Phaser.Math.Clamp(tip.x - x, 34, w - 34);
      g.fillStyle(COLORS.panel, 0.9).fillTriangle(bx - 13, h - 1, bx + 13, h - 1, tip.x - x, Math.min(tip.y - y, h + 20));
    }
    const r = BUBBLE.portraitR;
    const pcx = BUBBLE.pad + r;
    const pcy = BUBBLE.pad + r;
    g.fillStyle(0x16242a, 1).fillCircle(pcx, pcy, r);
    g.lineStyle(3, COLORS.copper, 0.85).strokeCircle(pcx, pcy, r);
    if (this.portrait) this.portrait.setPosition(pcx, pcy - r + 4);
    if (this.portraitMask) this.portraitMask.clear().fillCircle(x + pcx, y + pcy, r - 3);
  }

  private nextLine(): void {
    const line = this.queue.shift();
    if (!line) {
      if (this.choices.length) this.showChoices();
      else this.close(true);
      return;
    }
    this.setSpeaker(line.speaker);
    this.fullText = fill(line.text, session.state);
    this.shown = 0;
    this.hint?.setVisible(false);
    this.lineToken += 1;
    const token = this.lineToken;
    voice.stop();
    this.layoutLine();
    if (voice.mode === "texto") return;
    if (voice.mode === "voz") {
      // Solo voz: el bocadillo dice quién habla, sin texto que leer.
      this.shown = this.fullText.length;
      this.bodyText?.setText("🔊  · · ·");
    }
    void voice.speak(this.fullText, line.speaker.id ?? "narrador").then(() => {
      if (token !== this.lineToken || !this.panel) return;
      // Al acabar de hablar, sigue sola (tocar la pantalla adelanta igualmente).
      this.time.delayedCall(voice.mode === "voz" ? 450 : 750, () => {
        if (token !== this.lineToken || !this.panel || this.choiceBox) return;
        if (this.shown < this.fullText.length) {
          this.shown = this.fullText.length;
          this.bodyText?.setText(this.wrapped);
        }
        if (this.queue.length || !this.choices.length) this.nextLine();
        else this.showChoices();
      });
    });
  }

  /** Terminó de escribirse la frase: si es la última y hay opciones, se muestran ya. */
  private lineFinished(): void {
    if (!this.queue.length && this.choices.length) this.showChoices();
    else this.hint?.setVisible(true);
  }

  private advance(): void {
    if (!this.panel || !this.bodyText || this.choiceBox) return;
    if (voice.mode === "voz") {
      this.nextLine();
      return;
    }
    if (this.shown < this.fullText.length) {
      // Primer toque: muestra la frase entera; el siguiente pasa a la próxima.
      this.shown = this.fullText.length;
      this.bodyText.setText(this.wrapped);
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
    let y = CHOICE.bottom;
    const x = CHOICE.right - CHOICE.w;
    // De abajo arriba: la última opción («Hasta luego») queda junto al borde.
    [...this.choices].reverse().forEach((choice, ri) => {
      const i = this.choices.length - 1 - ri;
      const label = this.add.text(x + 58, 0, choice.text, {
        fontFamily: FONT_UI, fontSize: fs(28), color: CSS.ivory,
        wordWrap: { width: CHOICE.w - 80, useAdvancedWrap: true },
      }).setOrigin(0, 0.5);
      const h = Math.max(CHOICE.h, label.height + 22);
      y -= h;
      label.setY(y + h / 2);
      const num = this.add.text(x + 30, y + h / 2, `${i + 1}`, { fontFamily: FONT_TITLE, fontSize: fs(26), color: CSS.copper }).setOrigin(0.5);
      const bg = this.add.graphics();
      const draw = (hover: boolean) => {
        bg.clear();
        bg.fillStyle(hover ? 0x3a2716 : COLORS.panel, hover ? 0.97 : 0.88).fillRoundedRect(x, y, CHOICE.w, h, 18);
        bg.lineStyle(2, COLORS.copper, hover ? 1 : 0.55).strokeRoundedRect(x, y, CHOICE.w, h, 18);
      };
      draw(false);
      const top = y;
      const hit = this.add.zone(x, top, CHOICE.w, h).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => draw(true));
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => draw(false));
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pick(choice.id));
      box.add([bg, num, label, hit]);
      y -= CHOICE.gap;
    });
    if (voice.mic && voice.canListen) {
      const mh = 62;
      y -= mh;
      this.micButton = makeButton(this, CHOICE.right - 250, y, 250, mh, "🎤  Dilo", () => void this.listenChoice(), {
        fontSize: 28, fill: 0x1d3a2a, edge: 0x8fd6a0, radius: 18,
      });
      box.add(this.micButton.container);
      y -= CHOICE.gap;
    }
    this.choiceTop = y;
    box.setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 150 });
    this.choiceBox = box;
    this.placeBubble();
    if (voice.mode === "voz") {
      const said = this.choices.map((c, i) => `${i + 1}: ${c.text}`).join(". ");
      void voice.speak(`Puedes elegir. ${said}`, "narrador");
    }
  }

  /** Paula dice la opción en voz alta (por su número o con sus palabras). */
  private async listenChoice(): Promise<void> {
    if (!this.choiceBox || !this.micButton) return;
    const btn = this.micButton;
    btn.label.setText("👂  Te escucho…");
    const { alts, error } = await voice.listen();
    if (!this.choiceBox || this.micButton !== btn) return;
    btn.label.setText("🎤  Dilo");
    const idx = alts ? matchChoice(alts, this.choices.map((c) => c.text)) : null;
    if (idx !== null) {
      this.pick(this.choices[idx].id);
      return;
    }
    const msg = alts ? listenErrorText("no-entendido") : listenErrorText(error);
    this.showToast(msg);
    if (voice.mode !== "texto") void voice.speak(msg, "narrador");
  }

  private pick(id: string): void {
    if (!this.runner || !this.choiceBox) return;
    this.choiceBox.destroy();
    this.choiceBox = undefined;
    this.micButton = undefined;
    voice.cancelListening();
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
    setModal(this, "dialogue", on);
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
    this.micButton = undefined;
    this.choiceTop = GAME_H;
    this.lineToken += 1;
    voice.stop();
    voice.cancelListening();
    this.portraitMask?.destroy();
    this.portraitMask = undefined;
    this.bubbleBg = undefined;
    this.speaker = undefined;
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
    this.time.delayedCall(80, () => {
      if (!this.panel) this.setModal(false);
    });
    if (notify) onClose?.();
  }

  // ------------------------------------------------------------ HUD

  /** Botones fijos: mochila y cuaderno (arriba a la derecha, grandes para el dedo). */
  private buildHud(): void {
    const open = (tab: "mochila" | "cuaderno") => {
      if (this.registry.get("modal")) return;
      this.scene.launch("bag", {
        tab,
        onUse: (item: string) => this.game.events.emit(UI_EVENTS.use, item),
      });
    };
    const bag = makeButton(this, GAME_W - 30 - 124, 26, 124, 112, "🎒", () => open("mochila"), { fontSize: 60, radius: 28 });
    const book = makeButton(this, GAME_W - 30 - 124 - 20 - 124, 26, 124, 112, "📖", () => open("cuaderno"), { fontSize: 60, radius: 28 });
    for (const b of [bag, book]) b.label.setPadding(0, 8, 0, 4);
    this.hud = this.add.container(0, 0, [book.container, bag.container]).setDepth(80);
  }

  private onModal(on: boolean): void {
    this.hud?.setVisible(!on);
    this.usingChip?.container.setVisible(!on);
  }

  /** Aviso de «Paula tiene X en la mano»; tocarlo lo guarda otra vez. */
  private showUsing(item: string | null): void {
    this.usingChip?.container.destroy();
    this.usingChip = undefined;
    const def = item ? ITEMS[item] : undefined;
    if (!def) return;
    // Abajo a la izquierda: arriba están el nombre de la sala y los avisos.
    const chip = makeButton(this, 30, GAME_H - 30 - 104, 700, 104, `${def.icon}  Usando: ${def.name}   ✕`, () => this.game.events.emit(UI_EVENTS.use, null), {
      fontSize: 32, fill: 0x1d3a2a, edge: 0x8fd6a0, align: "left", radius: 28,
    });
    chip.container.setDepth(80);
    this.usingChip = chip;
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
      fontFamily: FONT_UI, fontSize: fs(30), color: CSS.ivory,
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
