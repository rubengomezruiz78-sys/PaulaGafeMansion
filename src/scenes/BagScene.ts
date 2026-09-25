import Phaser from "phaser";
import { COLORS, CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W } from "../config";
import { heardFlag } from "../core/chat";
import { check } from "../core/rules";
import { fill } from "../core/text";
import { CHATS } from "../content/chats";
import { npcById } from "../content/npcs";
import { ZONES, zoneLinks } from "../content/zones";
import { worldSim } from "../game/world";
import { ITEMS, MEMORIES } from "../content/items";
import { MAIN_GOALS, QUESTS, questStageText } from "../content/quests";
import { session } from "../game/session";
import { pushBackHandler } from "../platform";
import { setModal } from "../ui/modal";
import { addScrim, drawPanel, makeButton, type Button } from "../ui/widgets";
import { UI_EVENTS } from "./UIScene";

export type BagTab = "mochila" | "cuaderno" | "mapa";

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
  private tabs: Record<BagTab, Button | undefined> = { mochila: undefined, cuaderno: undefined, mapa: undefined };
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
    this.tabs.mapa = makeButton(this, INNER.x + 740, CARD.y + 34, 300, 90, "🗺️  Mapa", () => this.show("mapa"), { fontSize: 36 });
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
    for (const t of ["mochila", "cuaderno", "mapa"] as const) this.tabs[t]?.setStyle(t === tab ? 0x3a2716 : COLORS.panel);
    if (tab === "mochila") this.showBag();
    else if (tab === "cuaderno") this.showJournal();
    else this.showMap();
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

  // ------------------------------------------------------------------ mapa

  /**
   * Esquema de la casa por plantas. Se ven las salas visitadas y sus puertas
   * (las cerradas, en rojo discontinuo). Con el plano de Inés se ve la casa
   * entera… y quién anda ahora por cada sala.
   */
  private showMap(): void {
    const s = session.state;
    const plano = s.inventory.includes("plano-ines");
    const known = (z: string) => plano || s.visited.includes(z);
    const N = { w: 300, h: 120 };
    const g = this.keep(this.add.graphics());

    for (const [label, y] of [["Planta alta", 320], ["Planta baja", 655], ["Sótano", 880]] as const) {
      this.keep(this.add.text(INNER.x, y, label, { fontFamily: FONT_TITLE, fontSize: "30px", color: CSS.muted }).setOrigin(0, 0.5));
    }

    // Puertas: una línea por pareja de salas (abierta si se puede cruzar en algún sentido).
    const done = new Set<string>();
    for (const l of zoneLinks()) {
      const key = [l.from, l.to].sort().join("|");
      if (done.has(key)) continue;
      done.add(key);
      if (!known(l.from) && !known(l.to)) continue;
      const a = MAP_POS[l.from];
      const b = MAP_POS[l.to];
      if (!a || !b) continue;
      const open = zoneLinks().some((x) => [x.from, x.to].sort().join("|") === key
        && check((ZONES as Record<string, { exits: { id: string; requires?: Parameters<typeof check>[0] }[] }>)[x.from]?.exits.find((e) => e.id === x.exitId)?.requires, s));
      const pts = key === "torre|tuneles" ? [a, { x: 1765, y: a.y }, { x: 1765, y: b.y }, b] : [a, b];
      g.lineStyle(open ? 6 : 4, open ? 0x8c7a5c : 0xb0544a, open ? 0.9 : 0.8);
      for (let i = 0; i < pts.length - 1; i += 1) dashedLine(g, pts[i], pts[i + 1], open ? 0 : 16);
    }

    // Salas.
    for (const [id, p] of Object.entries(MAP_POS)) {
      const zone = (ZONES as Record<string, { name: string } | undefined>)[id];
      if (!zone) continue;
      const here = s.zone === id;
      const seen = known(id);
      const x = p.x - N.w / 2;
      const y = p.y - N.h / 2;
      g.fillStyle(here ? 0x1d3a2a : seen ? 0x1a2328 : 0x0e1316, 1).fillRoundedRect(x, y, N.w, N.h, 18);
      g.lineStyle(here ? 5 : 3, here ? 0x8fd6a0 : seen ? COLORS.copper : 0x2c3438, 1).strokeRoundedRect(x, y, N.w, N.h, 18);
      this.keep(this.add.text(p.x, y + (plano ? 30 : N.h / 2), seen ? zone.name : "?", {
        fontFamily: FONT_UI, fontSize: "25px", color: seen ? CSS.ivory : CSS.muted, align: "center",
        wordWrap: { width: N.w - 24, useAdvancedWrap: true },
      }).setOrigin(0.5));
      if (here) this.keep(this.add.text(p.x, y - 6, "Estás aquí", { fontFamily: FONT_UI, fontSize: "22px", color: "#a8e6b4" }).setOrigin(0.5, 1));
      if (plano) {
        const names = worldSim.presentIn(id).map((n) => shortName(npcById(n.id)?.name ?? n.id));
        const shown = names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ");
        this.keep(this.add.text(p.x, y + 84, shown || "(nadie)", {
          fontFamily: FONT_UI, fontSize: "20px", color: shown ? CSS.copper : CSS.muted, align: "center",
          wordWrap: { width: N.w - 20, useAdvancedWrap: true },
        }).setOrigin(0.5));
      }
    }
    this.keep(this.add.text(GAME_W / 2, CARD.y + CARD.h - 34, plano
      ? "El plano de Inés muestra dónde está cada uno ahora mismo."
      : "Las salas que aún no has visitado salen con «?». Quizá alguien dibujó un plano de la casa…", {
      fontFamily: FONT_UI, fontSize: "26px", color: CSS.muted, align: "center",
    }).setOrigin(0.5, 1));
  }

  private close(): void {
    if (!this.scene.isActive()) return;
    this.releaseBack?.();
    this.releaseBack = undefined;
    this.scene.stop();
    setModal(this, "bag", false);
  }
}

/** Centro de cada sala en el esquema del mapa (por plantas). */
const MAP_POS: Record<string, { x: number; y: number }> = {
  desvan: { x: 760, y: 245 },
  observatorio: { x: 1140, y: 245 },
  torre: { x: 1520, y: 245 },
  galeria: { x: 560, y: 405 },
  dormitorio: { x: 940, y: 405 },
  cocina: { x: 480, y: 590 },
  vestibulo: { x: 860, y: 590 },
  biblioteca: { x: 1240, y: 590 },
  musica: { x: 1620, y: 590 },
  invernadero: { x: 1620, y: 740 },
  archivo: { x: 860, y: 880 },
  tuneles: { x: 1240, y: 880 },
};

/** Nombre corto para el mapa: sin tratamiento («Don», «Doña»…) y sin apellido. */
const shortName = (name: string): string => name.replace(/^(Don|Doña|Señora|Señor|La señora|El señor)\s+/i, "").split(" ")[0];

function dashedLine(g: Phaser.GameObjects.Graphics, a: { x: number; y: number }, b: { x: number; y: number }, dash: number): void {
  if (!dash) {
    g.lineBetween(a.x, a.y, b.x, b.y);
    return;
  }
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  for (let d = 0; d < len; d += dash * 2) {
    const e = Math.min(len, d + dash);
    g.lineBetween(a.x + ux * d, a.y + uy * d, a.x + ux * e, a.y + uy * e);
  }
}
