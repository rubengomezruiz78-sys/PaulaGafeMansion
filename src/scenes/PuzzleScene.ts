import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W } from "../config";
import { MAX_DIGITS, PuzzleRun } from "../core/puzzle";
import { PUZZLES } from "../content/puzzles";
import { describeNotice } from "../content/speakers";
import { session } from "../game/session";
import { pushBackHandler } from "../platform";
import { setModal } from "../ui/modal";
import { addScrim, drawPanel, makeButton, type Button } from "../ui/widgets";
import { UI_EVENTS } from "./UIScene";

export interface PuzzleRequest {
  id: string;
  onClose?: (solved: boolean) => void;
}

const CARD = { x: 130, y: 50, w: GAME_W - 260, h: GAME_H - 100 };
const LEFT = { x: CARD.x + 70, w: 930 };
const RIGHT = { x: CARD.x + CARD.w - 70 - 500, w: 500, y: 250 };
const KEY = { w: 152, h: 120, gap: 22 };

/**
 * Pantalla de puzzle, encima de todo. Teclado numérico propio (sin teclado
 * del sistema, que en la tablet taparía media pantalla) o botones de
 * respuesta. Fallar no cuesta nada: tras dos fallos Gafe da la pista solo.
 */
export class PuzzleScene extends Phaser.Scene {
  private run!: PuzzleRun;
  private req!: PuzzleRequest;
  private typed = "";
  private stepObjs: Phaser.GameObjects.GameObject[] = [];
  private field?: Phaser.GameObjects.Text;
  private fieldBg?: Phaser.GameObjects.Graphics;
  private feedback?: Phaser.GameObjects.Text;
  private busy = false;
  private releaseBack?: () => void;
  private hintButton?: Button;

  constructor() {
    super("puzzle");
  }

  create(req: PuzzleRequest): void {
    const def = PUZZLES[req.id];
    if (!def) throw new Error(`Puzzle inexistente: ${req.id}`);
    this.req = req;
    this.run = new PuzzleRun(def, session.state);
    this.typed = "";
    this.busy = false;
    this.stepObjs = [];
    setModal(this, "puzzle", true);

    addScrim(this, 0.78);
    const g = this.add.graphics();
    drawPanel(g, CARD.x, CARD.y, CARD.w, CARD.h, 34);
    this.add.text(LEFT.x, CARD.y + 44, def.title, { fontFamily: FONT_TITLE, fontSize: "50px", color: CSS.copper });

    this.hintButton = makeButton(this, LEFT.x, CARD.y + CARD.h - 120, 440, 90, "🐾  Pista de Gafe", () => this.showHint(), { fontSize: 34 });
    makeButton(this, LEFT.x + 470, CARD.y + CARD.h - 120, 260, 90, "Salir", () => this.close(false), { fontSize: 34 });

    this.releaseBack = pushBackHandler(() => {
      this.close(false);
      return true;
    });
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) this.press(e.key);
      else if (e.key === "Backspace") this.press("⌫");
      else if (e.key === "Enter") this.press("OK");
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseBack?.());
    this.cameras.main.fadeIn(180, 2, 3, 4);
    this.showStep();
  }

  // ------------------------------------------------------------- un paso

  private showStep(): void {
    for (const o of this.stepObjs) o.destroy();
    this.stepObjs = [];
    this.typed = "";
    const step = this.run.step;
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.stepObjs.push(o);
      return o;
    };

    keep(this.add.text(LEFT.x, CARD.y + 118, `PASO ${this.run.index + 1} DE ${this.run.total}`, {
      fontFamily: FONT_UI, fontSize: "26px", color: CSS.muted, letterSpacing: 3,
    }));
    let y = CARD.y + 170;
    const story = keep(this.add.text(LEFT.x, y, this.run.def.story, {
      fontFamily: FONT_UI, fontSize: "30px", color: CSS.muted, lineSpacing: 6, wordWrap: { width: LEFT.w, useAdvancedWrap: true },
    }));
    y += story.height + 18;
    for (const clue of this.run.clues()) {
      const t = keep(this.add.text(LEFT.x, y, `✎ ${clue}`, {
        fontFamily: FONT_UI, fontSize: "28px", color: CSS.copper, fontStyle: "italic", lineSpacing: 4,
        wordWrap: { width: LEFT.w, useAdvancedWrap: true },
      }));
      y += t.height + 10;
    }

    // Enunciado en su recuadro.
    y = Math.max(y + 16, CARD.y + 400);
    const prompt = this.add.text(LEFT.x + 34, y + 28, step.prompt, {
      fontFamily: FONT_UI, fontSize: "40px", color: CSS.ivory, lineSpacing: 8, wordWrap: { width: LEFT.w - 68, useAdvancedWrap: true },
    });
    const boxH = prompt.height + 56;
    const box = keep(this.add.graphics());
    box.fillStyle(0x16242a, 1).fillRoundedRect(LEFT.x, y, LEFT.w, boxH, 22);
    box.lineStyle(2, COLORS.panelEdge, 0.35).strokeRoundedRect(LEFT.x, y, LEFT.w, boxH, 22);
    keep(prompt).setDepth(1);
    y += boxH + 26;

    if (step.kind === "number") {
      // Casilla de la respuesta.
      this.fieldBg = keep(this.add.graphics());
      this.drawField(0x0b1013, COLORS.copper, LEFT.x, y);
      this.field = keep(this.add.text(LEFT.x + 230, y + 62, "?", { fontFamily: FONT_UI, fontSize: "80px", color: CSS.ivory, fontStyle: "bold" }).setOrigin(0.5));
      this.fieldBg.setData("y", y);
      y += 150;
      this.buildKeypad(keep);
    } else {
      this.field = undefined;
      this.fieldBg = undefined;
      this.buildChoices(step.options, keep);
    }
    this.feedback = keep(this.add.text(LEFT.x, Math.min(y, CARD.y + CARD.h - 250), "", {
      fontFamily: FONT_UI, fontSize: "32px", color: CSS.ivory, lineSpacing: 6, wordWrap: { width: LEFT.w, useAdvancedWrap: true },
    }));
  }

  private drawField(fill: number, edge: number, x = LEFT.x, y = this.fieldBg?.getData("y") as number): void {
    if (!this.fieldBg) return;
    this.fieldBg.clear();
    this.fieldBg.fillStyle(fill, 1).fillRoundedRect(x, y, 460, 124, 22);
    this.fieldBg.lineStyle(4, edge, 0.9).strokeRoundedRect(x, y, 460, 124, 22);
  }

  private buildKeypad(keep: <T extends Phaser.GameObjects.GameObject>(o: T) => T): void {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];
    keys.forEach((k, i) => {
      const x = RIGHT.x + (i % 3) * (KEY.w + KEY.gap);
      const y = RIGHT.y + Math.floor(i / 3) * (KEY.h + KEY.gap);
      const b = makeButton(this, x, y, KEY.w, KEY.h, k, () => this.press(k), {
        fontSize: k === "OK" ? 40 : 52,
        fill: k === "OK" ? 0x1d3a2a : undefined,
        edge: k === "OK" ? 0x8fd6a0 : undefined,
      });
      keep(b.container);
    });
  }

  private buildChoices(options: string[], keep: <T extends Phaser.GameObjects.GameObject>(o: T) => T): void {
    const cols = options.length > 3 ? 2 : 1;
    const w = cols === 1 ? RIGHT.w : (RIGHT.w - KEY.gap) / 2;
    const h = 120;
    options.forEach((opt, i) => {
      const x = RIGHT.x + (i % cols) * (w + KEY.gap);
      const y = RIGHT.y + Math.floor(i / cols) * (h + KEY.gap);
      keep(makeButton(this, x, y, w, h, opt, () => this.choose(i), { fontSize: 38 }).container);
    });
  }

  // ------------------------------------------------------------ respuestas

  /** Tecla del teclado numérico (también desde el teclado físico). */
  press(key: string): void {
    if (this.busy || this.run.step.kind !== "number") return;
    if (key === "⌫") this.typed = this.typed.slice(0, -1);
    else if (key === "OK") {
      if (this.typed) this.submit(Number(this.typed));
      return;
    } else if (this.typed.length < MAX_DIGITS) this.typed = (this.typed === "0" ? "" : this.typed) + key;
    this.field?.setText(this.typed || "?");
  }

  choose(index: number): void {
    if (this.busy || this.run.step.kind !== "choice") return;
    this.submit(index);
  }

  private submit(value: number): void {
    const r = this.run.answer(value);
    session.save();
    if (!r.correct) {
      this.drawField(0x2a1212, 0xe07a6a);
      this.cameras.main.shake(160, 0.004);
      const n = this.run.mistakes;
      this.feedback?.setColor("#f0b0a0").setText(n >= 2 ? `Mmm… no. 🐾 Gafe: ${this.run.step.hint}` : "Mmm… no es eso. Revisa la cuenta con calma.");
      this.typed = "";
      this.time.delayedCall(700, () => {
        this.drawField(0x0b1013, COLORS.copper);
        this.field?.setText("?");
      });
      return;
    }
    this.busy = true;
    this.drawField(0x12301c, 0x8fd6a0);
    this.feedback?.setColor("#a8e6b4").setText(r.solved ? "¡Resuelto!" : "¡Correcto!");
    for (const n of r.notices) {
      const text = describeNotice(n, session.state);
      if (text) this.game.events.emit(UI_EVENTS.toast, text);
    }
    this.time.delayedCall(r.solved ? 1300 : 800, () => {
      this.busy = false;
      if (r.solved) this.close(true);
      else this.showStep();
    });
  }

  private showHint(): void {
    if (this.busy) return;
    this.feedback?.setColor(CSS.copper).setText(`🐾 Gafe: ${this.run.step.hint}`);
  }

  private close(solved: boolean): void {
    if (!this.scene.isActive()) return;
    this.releaseBack?.();
    this.releaseBack = undefined;
    const done = this.req.onClose;
    this.scene.stop();
    // El toque que cierra lo ha atrapado un botón de esta escena, así que el
    // mundo no lo recibe: se puede liberar ya.
    setModal(this, "puzzle", false);
    done?.(solved);
  }
}
