import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W } from "../config";
import { heardFlag } from "../core/chat";
import { check } from "../core/rules";
import { fill } from "../core/text";
import { CHATS } from "../content/chats";
import { ITEMS, MEMORIES } from "../content/items";
import { MAIN_GOALS, QUESTS, questStageText } from "../content/quests";
import { session } from "../game/session";
import { pushBackHandler } from "../platform";
import { setModal } from "../ui/modal";
import { addScrim, drawPanel, makeButton, type Button } from "../ui/widgets";
import { UI_EVENTS } from "./UIScene";

export type BagTab = "mochila" | "cuaderno";

export interface BagRequest {
  tab: BagTab;
  /** Paula elige un objeto para usarlo en la sala. */
  onUse?: (item: string) => void;
}

const CARD = { x: 110, y: 40, w: GAME_W - 220, h: GAME_H - 80 };
const INNER = { x: CARD.x + 70, y: CARD.y + 150, w: CARD.w - 140 };
const CELL = { w: 236, h: 200, gap: 22, cols: 6 };

/**
 * Mochila y cuaderno. La mochila muestra los objetos (tocar uno lo describe y
 * permite usarlo en la sala); el cuaderno, los objetivos, los encargos, los
 * recuerdos de Inés y lo que Paula ha oído.
 */
export class BagScene extends Phaser.Scene {
  private req!: BagRequest;
  private tab: BagTab = "mochila";
  private body: Phaser.GameObjects.GameObject[] = [];
  private tabs: Record<BagTab, Button | undefined> = { mochila: undefined, cuaderno: undefined };
  private selected?: string;
  private releaseBack?: () => void;

  constructor() {
    super("bag");
  }

  create(req: BagRequest): void {
    this.req = req;
    this.tab = req.tab;
    this.selected = undefined;
    this.body = [];
    setModal(this, "bag", true);

    addScrim(this, 0.74);
    const g = this.add.graphics();
    drawPanel(g, CARD.x, CARD.y, CARD.w, CARD.h, 34);
    this.tabs.mochila = makeButton(this, INNER.x, CARD.y + 34, 340, 90, "🎒  Mochila", () => this.show("mochila"), { fontSize: 36 });
    this.tabs.cuaderno = makeButton(this, INNER.x + 370, CARD.y + 34, 340, 90, "📖  Cuaderno", () => this.show("cuaderno"), { fontSize: 36 });
    makeButton(this, CARD.x + CARD.w - 70 - 110, CARD.y + 34, 110, 90, "✕", () => this.close(), { fontSize: 44 });

    this.releaseBack = pushBackHandler(() => {
      this.close();
      return true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseBack?.());
    this.cameras.main.fadeIn(160, 2, 3, 4);
    this.show(this.tab);
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.body.push(o);
    return o;
  }

  show(tab: BagTab): void {
    this.tab = tab;
    for (const o of this.body) o.destroy();
    this.body = [];
    for (const t of ["mochila", "cuaderno"] as const) this.tabs[t]?.setStyle(t === tab ? 0x3a2716 : COLORS.panel);
    if (tab === "mochila") this.showBag();
    else this.showJournal();
  }

  // ---------------------------------------------------------------- mochila

  private showBag(): void {
    const items = session.state.inventory.filter((id) => ITEMS[id]);
    if (!items.length) {
      this.keep(this.add.text(GAME_W / 2, GAME_H / 2, "La mochila está vacía.\nToca las cosas de la casa: algunas se pueden guardar.", {
        fontFamily: FONT_UI, fontSize: "36px", color: CSS.muted, align: "center", lineSpacing: 10,
      }).setOrigin(0.5));
      return;
    }
    if (!this.selected || !items.includes(this.selected)) this.selected = items[0];
    items.forEach((id, i) => {
      const x = INNER.x + (i % CELL.cols) * (CELL.w + CELL.gap);
      const y = INNER.y + Math.floor(i / CELL.cols) * (CELL.h + CELL.gap);
      const item = ITEMS[id];
      const b = makeButton(this, x, y, CELL.w, CELL.h, "", () => {
        this.selected = id;
        this.show("mochila");
      }, { fill: id === this.selected ? 0x3a2716 : 0x121a1e, edge: item.memory ? 0xf0c860 : COLORS.copper });
      this.keep(b.container);
      this.keep(this.add.text(x + CELL.w / 2, y + 78, item.icon, { fontSize: "84px", padding: { top: 10, bottom: 6 } }).setOrigin(0.5));
      this.keep(this.add.text(x + CELL.w / 2, y + 162, item.name, {
        fontFamily: FONT_UI, fontSize: "24px", color: CSS.ivory, align: "center", wordWrap: { width: CELL.w - 24, useAdvancedWrap: true },
      }).setOrigin(0.5));
    });
    const sel = this.selected ? ITEMS[this.selected] : undefined;
    if (!sel || !this.selected) return;
    const y = INNER.y + 2 * (CELL.h + CELL.gap) + 18;
    const g = this.keep(this.add.graphics());
    g.fillStyle(0x16242a, 1).fillRoundedRect(INNER.x, y, INNER.w, 250, 24);
    this.keep(this.add.text(INNER.x + 110, y + 125, sel.icon, { fontSize: "120px", padding: { top: 14, bottom: 8 } }).setOrigin(0.5));
    this.keep(this.add.text(INNER.x + 220, y + 30, sel.name, { fontFamily: FONT_TITLE, fontSize: "44px", color: CSS.copper }));
    this.keep(this.add.text(INNER.x + 220, y + 92, (sel.memory ? "★ Recuerdo de Inés. " : "") + sel.description, {
      fontFamily: FONT_UI, fontSize: "32px", color: CSS.ivory, lineSpacing: 6, wordWrap: { width: INNER.w - 220 - 380, useAdvancedWrap: true },
    }));
    const id = this.selected;
    const use = makeButton(this, INNER.x + INNER.w - 340, y + 80, 310, 100, "Usar aquí", () => {
      this.close();
      this.req.onUse?.(id);
    }, { fontSize: 36, fill: 0x1d3a2a, edge: 0x8fd6a0 });
    this.keep(use.container);
  }

  // ---------------------------------------------------------------- cuaderno

  private showJournal(): void {
    const s = session.state;
    const colW = (INNER.w - 60) / 2;
    const text = (x: number, y: number, t: string, size: number, color: string, w = colW) =>
      this.keep(this.add.text(x, y, t, { fontFamily: FONT_UI, fontSize: `${size}px`, color, lineSpacing: 6, wordWrap: { width: w, useAdvancedWrap: true } }));
    const title = (x: number, y: number, t: string) => this.keep(this.add.text(x, y, t, { fontFamily: FONT_TITLE, fontSize: "36px", color: CSS.copper }));

    // Columna izquierda: la historia y los encargos.
    let y = INNER.y;
    title(INNER.x, y, "La historia");
    y += 58;
    for (const goal of MAIN_GOALS) {
      if (goal.show && !check(goal.show, s)) continue;
      const done = check(goal.done, s);
      const t = text(INNER.x, y, `${done ? "☑" : "☐"}  ${fill(goal.text, s)}`, 32, done ? CSS.muted : CSS.ivory);
      y += t.height + 12;
    }
    y += 22;
    title(INNER.x, y, "Encargos");
    y += 58;
    const quests = Object.entries(s.quests).filter(([id, q]) => QUESTS[id] && id !== "trece" && q.stage > 0);
    if (!quests.length) {
      const t = text(INNER.x, y, "Todavía nadie te ha pedido nada. Habla con la gente de la casa.", 30, CSS.muted);
      y += t.height;
    }
    for (const [id, q] of quests.sort((a, b) => Number(a[1].done) - Number(b[1].done))) {
      const stage = questStageText(id, q.stage);
      const t = text(INNER.x, y, q.done ? `✓  ${QUESTS[id].title}` : `•  ${QUESTS[id].title}: ${stage ? fill(stage, s) : ""}`, 30, q.done ? CSS.muted : CSS.ivory);
      y += t.height + 12;
      if (y > CARD.y + CARD.h - 80) break;
    }

    // Columna derecha: recuerdos de Inés y lo que Paula ha oído.
    const rx = INNER.x + colW + 60;
    y = INNER.y;
    title(rx, y, "Recuerdos de Inés");
    y += 64;
    MEMORIES.forEach((id, i) => {
      const has = s.inventory.includes(id) || s.flags.final === true;
      const cx = rx + 60 + i * 130;
      const g = this.keep(this.add.graphics());
      g.fillStyle(has ? 0x3a2716 : 0x121a1e, 1).fillCircle(cx, y + 56, 56);
      g.lineStyle(3, has ? 0xf0c860 : 0x3a4448, 1).strokeCircle(cx, y + 56, 56);
      this.keep(this.add.text(cx, y + 56, has ? ITEMS[id].icon : "?", {
        fontFamily: FONT_UI, fontSize: has ? "60px" : "48px", color: CSS.muted, padding: { top: 8, bottom: 6 },
      }).setOrigin(0.5));
    });
    y += 150;
    title(rx, y, "Lo que has oído");
    y += 58;
    const notes = CHATS.filter((c) => c.note && s.flags[heardFlag(c.id)]).map((c) => c.note!);
    if (!notes.length) text(rx, y, "Cuando los de la casa charlen entre ellos, acércate a escuchar: a veces se les escapan secretos.", 30, CSS.muted);
    for (const note of notes) {
      const t = text(rx, y, `✎ ${note}`, 28, CSS.ivory);
      y += t.height + 12;
      if (y > CARD.y + CARD.h - 80) break;
    }
  }

  private close(): void {
    if (!this.scene.isActive()) return;
    this.releaseBack?.();
    this.releaseBack = undefined;
    this.scene.stop();
    setModal(this, "bag", false);
  }
}
