/**
 * Tableros de las pruebas que son un juego (no una cuenta): piano, tarjetas
 * para ordenar, parejas, laberinto y mezcla de pinturas. Cada tablero valida
 * lo que hace Paula y entrega al puzzle una respuesta codificada (un número,
 * ver `expectedAnswer`), así la lógica, el guardado y los tests son los mismos
 * que para las cuentas. Todo se toca con el dedo, con piezas grandes.
 */
import Phaser from "phaser";
import { sound } from "../audio/sound";
import { COLORS, CSS, FONT_TITLE, FONT_UI } from "../config";
import { encodeMix, encodeSeq, expectedAnswer, mazeFind, mazeOpen, NOTES, type PuzzleStep } from "../core/puzzle";
import { matchChoice, matchTwo, parseDirections, parseNotes, type Dir } from "../core/speech";
import { makeButton } from "./widgets";

export interface BoardHost {
  scene: Phaser.Scene;
  /** Zona libre para el tablero (coordenadas lógicas). */
  area: { x: number; y: number; w: number; h: number };
  keep<T extends Phaser.GameObjects.GameObject>(o: T): T;
  /** Entrega una respuesta: la escena la comprueba, avisa y cuenta los fallos. */
  submit(value: number): void;
  /** Un aviso corto (sin contar como fallo). */
  say(text: string, color?: string): void;
}

export interface Board {
  /** Empieza (cuando ya se ha leído el enunciado): p. ej. suena la melodía. */
  start(): void;
  /** Lo resuelve solo (partida automática y pruebas). */
  solve(): void;
  /** Respuesta hablada; true si se entendió algo útil. */
  hear?(alts: readonly string[]): boolean;
  /** La escena avisa de que la respuesta entregada no era la buena. */
  wrong?(): void;
  destroy(): void;
}

type Step<K extends PuzzleStep["kind"]> = Extract<PuzzleStep, { kind: K }>;

/** Colores de las notas (do rojo … si violeta): ayudan a recordar la melodía. */
export const NOTE_COLORS = [0xe0605a, 0xe89a4a, 0xe8d05a, 0x7cc46a, 0x5ac0d8, 0x5a86e0, 0xa87ae0];

export function makeBoard(host: BoardHost, step: PuzzleStep): Board | null {
  switch (step.kind) {
    case "melody": return new MelodyBoard(host, step);
    case "order": return new OrderBoard(host, step);
    case "pairs": return new PairsBoard(host, step);
    case "maze": return new MazeBoard(host, step);
    case "mix": return new MixBoard(host, step);
    default: return null;
  }
}

/** Base: temporizadores que se cancelan al cambiar de paso. */
abstract class BaseBoard implements Board {
  private timers: Phaser.Time.TimerEvent[] = [];
  protected done = false;

  constructor(protected readonly host: BoardHost) {}

  protected get scene(): Phaser.Scene {
    return this.host.scene;
  }

  protected later(ms: number, fn: () => void): void {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  protected text(x: number, y: number, s: string, size: number, color: string = CSS.ivory, origin = 0.5): Phaser.GameObjects.Text {
    return this.host.keep(this.scene.add.text(x, y, s, {
      fontFamily: FONT_UI, fontSize: `${size}px`, color, align: "center",
    }).setOrigin(origin, 0.5));
  }

  abstract start(): void;
  abstract solve(): void;

  destroy(): void {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
  }
}

// ------------------------------------------------------------------ piano

class MelodyBoard extends BaseBoard {
  private keys: { g: Phaser.GameObjects.Graphics; x: number; y: number; w: number; h: number }[] = [];
  private dots: Phaser.GameObjects.Graphics;
  private entered: number[] = [];
  private playing = false;
  private readonly dotY: number;

  constructor(host: BoardHost, private readonly step: Step<"melody">) {
    super(host);
    const { x, y, w, h } = host.area;
    const gap = 14;
    const keyW = Math.min(190, (w - gap * 6) / 7);
    const keyH = Math.min(340, h - 120);
    const x0 = x + (w - (keyW * 7 + gap * 6)) / 2;
    const ky = y + h - keyH;
    this.dotY = ky - 50;
    this.dots = host.keep(this.scene.add.graphics());
    NOTES.forEach((name, i) => {
      const kx = x0 + i * (keyW + gap);
      const g = host.keep(this.scene.add.graphics());
      this.keys.push({ g, x: kx, y: ky, w: keyW, h: keyH });
      this.drawKey(i, false);
      this.text(kx + keyW / 2, ky + keyH - 46, name.toUpperCase(), 40, "#2a2118").setFontStyle("bold");
      const zone = host.keep(this.scene.add.zone(kx, ky, keyW, keyH).setOrigin(0).setInteractive({ useHandCursor: true }));
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.tap(i));
    });
    const listen = makeButton(this.scene, x, this.dotY - 40, 330, 80, "▶  Escuchar", () => this.play(), { fontSize: 32 });
    host.keep(listen.container);
    this.drawDots();
  }

  private drawKey(i: number, lit: boolean): void {
    const k = this.keys[i];
    const g = k.g;
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(k.x + 4, k.y + 8, k.w, k.h, 18);
    g.fillStyle(lit ? NOTE_COLORS[i] : 0xf1e8d8, 1).fillRoundedRect(k.x, k.y, k.w, k.h, 18);
    g.fillStyle(NOTE_COLORS[i], lit ? 1 : 0.85).fillCircle(k.x + k.w / 2, k.y + 44, 22);
    g.lineStyle(4, lit ? 0xffffff : 0x6b5a45, lit ? 1 : 0.6).strokeRoundedRect(k.x, k.y, k.w, k.h, 18);
  }

  /** Una bolita por nota: se colorea al acertarla. */
  private drawDots(): void {
    const n = this.step.notes.length;
    const gap = 64;
    const cx = this.host.area.x + this.host.area.w / 2 + 120;
    this.dots.clear();
    for (let i = 0; i < n; i += 1) {
      const dx = cx + (i - (n - 1) / 2) * gap;
      const hit = this.entered[i];
      if (hit === undefined) this.dots.lineStyle(4, COLORS.copper, 0.8).strokeCircle(dx, this.dotY, 20);
      else this.dots.fillStyle(NOTE_COLORS[hit], 1).fillCircle(dx, this.dotY, 22);
    }
  }

  private flash(i: number, ms = 260): void {
    this.drawKey(i, true);
    this.later(ms, () => this.drawKey(i, false));
  }

  start(): void {
    this.later(500, () => this.play());
  }

  /** Suena la melodía (y se iluminan las teclas); mientras, no se puede tocar. */
  play(): void {
    if (this.playing || this.done) return;
    this.playing = true;
    this.entered = [];
    this.drawDots();
    this.step.notes.forEach((n, k) => this.later(k * 620, () => {
      sound.piano(n);
      this.flash(n, 420);
    }));
    this.later(this.step.notes.length * 620 + 200, () => {
      this.playing = false;
    });
  }

  private tap(i: number): void {
    if (this.playing || this.done) return;
    sound.piano(i);
    this.flash(i);
    this.entered.push(i);
    this.drawDots();
    const pos = this.entered.length - 1;
    if (i !== this.step.notes[pos]) {
      this.done = true;
      this.later(350, () => this.host.submit(encodeSeq(this.entered)));
      return;
    }
    if (this.entered.length === this.step.notes.length) {
      this.done = true;
      this.later(350, () => this.host.submit(encodeSeq(this.entered)));
    }
  }

  wrong(): void {
    this.later(1300, () => {
      this.done = false;
      this.play();
    });
  }

  hear(alts: readonly string[]): boolean {
    const notes = parseNotes(alts, this.step.notes.length);
    if (!notes || this.playing || this.done) return false;
    this.done = true;
    this.entered = [];
    notes.forEach((n, k) => this.later(k * 380, () => {
      sound.piano(n);
      this.flash(n);
      this.entered.push(n);
      this.drawDots();
    }));
    this.later(notes.length * 380 + 250, () => this.host.submit(encodeSeq(notes)));
    return true;
  }

  solve(): void {
    this.host.submit(expectedAnswer(this.step));
  }
}

// ---------------------------------------------------------- ordenar tarjetas

class OrderBoard extends BaseBoard {
  private cards: { box: Phaser.GameObjects.Container; item: number; placed: boolean }[] = [];
  private placed: number[] = [];
  private slots: { x: number; y: number }[] = [];

  constructor(host: BoardHost, private readonly step: Step<"order">) {
    super(host);
    const { x, y, w, h } = host.area;
    const n = step.items.length;
    const gap = 22;
    const cw = Math.min(290, (w - gap * (n - 1)) / n);
    const ch = Math.min(170, (h - 90) / 2);
    const x0 = x + (w - (cw * n + gap * (n - 1))) / 2;
    const topY = y + 10;
    const slotY = y + h - ch - 10;
    // Huecos numerados abajo.
    const g = host.keep(this.scene.add.graphics());
    for (let i = 0; i < n; i += 1) {
      const sx = x0 + i * (cw + gap);
      this.slots.push({ x: sx, y: slotY });
      g.lineStyle(3, COLORS.copper, 0.55).strokeRoundedRect(sx, slotY, cw, ch, 20);
      this.text(sx + cw / 2, slotY + ch / 2, String(i + 1), 64, "#5d5446").setFontFamily(FONT_TITLE);
    }
    this.text(x + w / 2, (topY + ch + slotY) / 2, "▼  Toca las tarjetas en orden  ▼", 28, CSS.muted);
    // Tarjetas barajadas arriba (nunca en el orden bueno).
    const order = shuffled(n);
    order.forEach((item, i) => {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.3).fillRoundedRect(4, 8, cw, ch, 20);
      bg.fillStyle(0x223038, 1).fillRoundedRect(0, 0, cw, ch, 20);
      bg.lineStyle(3, COLORS.panelEdge, 0.8).strokeRoundedRect(0, 0, cw, ch, 20);
      const label = this.scene.add.text(cw / 2, ch / 2, step.items[item], {
        fontFamily: FONT_UI, fontSize: "30px", color: CSS.ivory, align: "center", lineSpacing: 4,
        wordWrap: { width: cw - 28, useAdvancedWrap: true },
      }).setOrigin(0.5);
      const hit = this.scene.add.zone(0, 0, cw, ch).setOrigin(0).setInteractive({ useHandCursor: true });
      const box = host.keep(this.scene.add.container(x0 + i * (cw + gap), topY, [bg, label, hit]));
      const card = { box, item, placed: false };
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pick(card));
      this.cards.push(card);
    });
  }

  start(): void {}

  private pick(card: { box: Phaser.GameObjects.Container; item: number; placed: boolean }): void {
    if (this.done || card.placed) return;
    const next = this.placed.length;
    if (card.item !== next) {
      // El sonido de fallo lo pone la pantalla del puzzle (aquí sonaría dos veces).
      this.scene.tweens.add({ targets: card.box, x: card.box.x + 14, duration: 50, yoyo: true, repeat: 3 });
      this.host.submit(-1);
      return;
    }
    sound.play("tap");
    card.placed = true;
    this.placed.push(card.item);
    const slot = this.slots[next];
    this.scene.tweens.add({ targets: card.box, x: slot.x, y: slot.y, duration: 260, ease: "Cubic.easeOut" });
    if (this.placed.length === this.step.items.length) {
      this.done = true;
      this.later(420, () => this.host.submit(encodeSeq(this.placed)));
    }
  }

  hear(alts: readonly string[]): boolean {
    const i = matchChoice(alts, this.step.items);
    const card = this.cards.find((c) => c.item === i);
    if (i === null || !card) return false;
    this.pick(card);
    return true;
  }

  solve(): void {
    this.host.submit(expectedAnswer(this.step));
  }
}

// ------------------------------------------------------------------ parejas

class PairsBoard extends BaseBoard {
  private cards: { box: Phaser.GameObjects.Container; face: Phaser.GameObjects.Text; back: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Graphics; icon: string; up: boolean; matched: boolean }[] = [];
  private open: number[] = [];
  private matched = 0;
  private size = 0;

  constructor(host: BoardHost, private readonly step: Step<"pairs">) {
    super(host);
    const { x, y, w, h } = host.area;
    const deck = shuffledCopy([...step.icons, ...step.icons]);
    const cols = Math.min(8, Math.max(3, step.icons.length));
    const rows = Math.ceil(deck.length / cols);
    const gap = 18;
    const s = Math.min(170, (w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows);
    this.size = s;
    const x0 = x + (w - (s * cols + gap * (cols - 1))) / 2;
    const y0 = y + (h - (s * rows + gap * (rows - 1))) / 2;
    deck.forEach((icon, i) => {
      const bg = this.scene.add.graphics();
      const face = this.scene.add.text(0, 0, icon, { fontFamily: FONT_UI, fontSize: `${Math.round(s * 0.55)}px` }).setOrigin(0.5).setVisible(false);
      const back = this.scene.add.text(0, 0, "✦", { fontFamily: FONT_UI, fontSize: `${Math.round(s * 0.34)}px`, color: CSS.copper }).setOrigin(0.5);
      const hit = this.scene.add.zone(0, 0, s, s).setInteractive({ useHandCursor: true });
      const box = host.keep(this.scene.add.container(x0 + (i % cols) * (s + gap) + s / 2, y0 + Math.floor(i / cols) * (s + gap) + s / 2, [bg, face, back, hit]));
      const card = { box, face, back, bg, icon, up: false, matched: false };
      this.cards.push(card);
      this.drawCard(card);
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.flip(i));
    });
  }

  private drawCard(c: (typeof this.cards)[number]): void {
    const s = this.size;
    c.bg.clear();
    c.bg.fillStyle(0x000000, 0.3).fillRoundedRect(-s / 2 + 4, -s / 2 + 7, s, s, 18);
    c.bg.fillStyle(c.up ? 0xf1e8d8 : 0x223038, 1).fillRoundedRect(-s / 2, -s / 2, s, s, 18);
    c.bg.lineStyle(c.matched ? 6 : 3, c.matched ? 0x8fd6a0 : COLORS.panelEdge, c.matched ? 1 : 0.8).strokeRoundedRect(-s / 2, -s / 2, s, s, 18);
    c.face.setVisible(c.up);
    c.back.setVisible(!c.up);
  }

  /** Dar la vuelta con un medio giro (como una carta de verdad). */
  private turn(c: (typeof this.cards)[number], up: boolean): void {
    this.scene.tweens.add({
      targets: c.box, scaleX: 0, duration: 110, ease: "Sine.easeIn",
      onComplete: () => {
        c.up = up;
        this.drawCard(c);
        this.scene.tweens.add({ targets: c.box, scaleX: 1, duration: 110, ease: "Sine.easeOut" });
      },
    });
  }

  start(): void {}

  private flip(i: number): void {
    const c = this.cards[i];
    if (this.done || c.up || c.matched || this.open.length >= 2) return;
    sound.play("tap");
    this.turn(c, true);
    this.open.push(i);
    if (this.open.length < 2) return;
    const [a, b] = this.open.map((k) => this.cards[k]);
    if (a.icon === b.icon) {
      this.later(300, () => {
        a.matched = b.matched = true;
        this.drawCard(a);
        this.drawCard(b);
        this.open = [];
        this.matched += 1;
        sound.play("correct");
        if (this.matched === this.step.icons.length) {
          this.done = true;
          this.later(500, () => this.host.submit(this.matched));
        }
      });
    } else {
      this.later(900, () => {
        this.turn(a, false);
        this.turn(b, false);
        this.open = [];
      });
    }
  }

  solve(): void {
    this.host.submit(expectedAnswer(this.step));
  }
}

// ---------------------------------------------------------------- laberinto

class MazeBoard extends BaseBoard {
  private at: { r: number; c: number };
  private readonly cell: number;
  private readonly ox: number;
  private readonly oy: number;
  private readonly light: Phaser.GameObjects.Container;
  private moving = false;
  private readonly onKey = (e: KeyboardEvent) => {
    const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as Record<string, Dir>)[e.key];
    if (dir) this.move(dir);
  };

  constructor(host: BoardHost, private readonly step: Step<"maze">) {
    super(host);
    const { x, y, w, h } = host.area;
    const grid = step.grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const padW = 380;
    this.cell = Math.floor(Math.min(96, (w - padW - 30) / cols, h / rows));
    this.ox = x + (w - padW - this.cell * cols) / 2;
    this.oy = y + (h - this.cell * rows) / 2;
    const g = host.keep(this.scene.add.graphics());
    g.fillStyle(0x0b1210, 1).fillRoundedRect(this.ox - 14, this.oy - 14, this.cell * cols + 28, this.cell * rows + 28, 22);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const cx = this.ox + c * this.cell;
        const cy = this.oy + r * this.cell;
        if (grid[r][c] === "#") {
          // Seto continuo: base oscura sin huecos y hojas encima.
          const cs = this.cell;
          g.fillStyle(0x17301c, 1).fillRect(cx, cy, cs, cs);
          g.fillStyle(0x234a29, 1).fillRect(cx + 2, cy + 2, cs - 4, cs - 6);
          const leaf = (fx: number, fy: number, fr: number, col: number) => g.fillStyle(col, 1).fillCircle(cx + cs * fx, cy + cs * fy, cs * fr);
          leaf(0.28, 0.3, 0.16, 0x2f5d34);
          leaf(0.7, 0.36, 0.15, 0x2f5d34);
          leaf(0.45, 0.66, 0.17, 0x2a5530);
          leaf(0.36, 0.26, 0.07, 0x4a8a50);
          leaf(0.74, 0.3, 0.06, 0x4a8a50);
        } else {
          g.fillStyle(0x4a4032, 1).fillRect(cx, cy, this.cell, this.cell);
          g.fillStyle(0x5a4e3c, 1).fillCircle(cx + this.cell * 0.3, cy + this.cell * 0.7, 3).fillCircle(cx + this.cell * 0.7, cy + this.cell * 0.3, 2);
        }
      }
    }
    const end = mazeFind(grid, "E")!;
    this.text(this.ox + (end.c + 0.5) * this.cell, this.oy + (end.r + 0.5) * this.cell, "🏮", Math.round(this.cell * 0.62));
    const start = mazeFind(grid, "S")!;
    this.at = { ...start };
    const glow = this.scene.add.image(0, 0, "glint").setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0).setScale(this.cell / 110);
    const dot = this.scene.add.circle(0, 0, this.cell * 0.16, 0xfff6c8);
    this.light = host.keep(this.scene.add.container(this.cellX(start.c), this.cellY(start.r), [glow, dot]));
    this.scene.tweens.add({ targets: glow, alpha: { from: 0.7, to: 1 }, scale: glow.scale * 1.15, duration: 700, yoyo: true, repeat: -1 });
    // Cruceta de flechas a la derecha.
    const px = x + w - padW + 40;
    const pcy = y + h / 2;
    const b = 110;
    const arrows: [string, Dir, number, number][] = [["▲", "up", 1, 0], ["◀", "left", 0, 1], ["▶", "right", 2, 1], ["▼", "down", 1, 2]];
    for (const [label, dir, gx, gy] of arrows) {
      host.keep(makeButton(this.scene, px + gx * (b + 8), pcy - b * 1.5 - 8 + gy * (b + 8), b, b, label, () => this.move(dir), { fontSize: 50, radius: 24 }).container);
    }
    // También se puede tocar una casilla de al lado.
    const zone = host.keep(this.scene.add.zone(this.ox, this.oy, this.cell * cols, this.cell * rows).setOrigin(0).setInteractive());
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (p: Phaser.Input.Pointer) => {
      const c = Math.floor((p.worldX - this.ox) / this.cell);
      const r = Math.floor((p.worldY - this.oy) / this.cell);
      const dr = r - this.at.r;
      const dc = c - this.at.c;
      if (Math.abs(dr) + Math.abs(dc) !== 1) return;
      this.move(dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right");
    });
    this.scene.input.keyboard?.on("keydown", this.onKey);
  }

  private cellX(c: number): number {
    return this.ox + (c + 0.5) * this.cell;
  }

  private cellY(r: number): number {
    return this.oy + (r + 0.5) * this.cell;
  }

  start(): void {}

  move(dir: Dir): void {
    if (this.done || this.moving) return;
    const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
    const r = this.at.r + dr;
    const c = this.at.c + dc;
    if (!mazeOpen(this.step.grid, r, c)) {
      sound.play("tap");
      this.scene.tweens.add({ targets: this.light, x: this.light.x + dc * 8, y: this.light.y + dr * 8, duration: 60, yoyo: true });
      return;
    }
    this.moving = true;
    this.at = { r, c };
    sound.play("note");
    this.scene.tweens.add({
      targets: this.light, x: this.cellX(c), y: this.cellY(r), duration: 150, ease: "Sine.easeOut",
      onComplete: () => {
        this.moving = false;
        if (this.step.grid[r][c] === "E") {
          this.done = true;
          this.later(250, () => this.host.submit(1));
        }
      },
    });
  }

  hear(alts: readonly string[]): boolean {
    const dirs = parseDirections(alts);
    if (!dirs.length) return false;
    dirs.forEach((d, i) => this.later(i * 200, () => this.move(d)));
    return true;
  }

  solve(): void {
    this.host.submit(expectedAnswer(this.step));
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKey);
    super.destroy();
  }
}

// ----------------------------------------------------------------- pinturas

class MixBoard extends BaseBoard {
  private picked: number[] = [];
  private bowl: Phaser.GameObjects.Graphics;
  private readonly bowlAt: { x: number; y: number; r: number };
  private pots: Phaser.GameObjects.Container[] = [];

  constructor(host: BoardHost, private readonly step: Step<"mix">) {
    super(host);
    const { x, y, w, h } = host.area;
    // A la izquierda, el color que hay que conseguir; en el centro, el cuenco.
    const r = Math.min(80, h * 0.18);
    const g = host.keep(this.scene.add.graphics());
    const tx = x + 130;
    const ty = y + r + 10;
    g.fillStyle(0x000000, 0.35).fillCircle(tx + 4, ty + 8, r);
    g.fillStyle(step.target.color, 1).fillCircle(tx, ty, r);
    g.lineStyle(5, 0xf1e8d8, 0.8).strokeCircle(tx, ty, r);
    this.text(tx, ty + r + 36, `Hace falta: ${step.target.name}`, 30, CSS.copper);
    this.bowlAt = { x: x + w * 0.5, y: ty, r: r * 1.1 };
    this.text(this.bowlAt.x - this.bowlAt.r - 70, this.bowlAt.y, "=", 70, CSS.muted);
    this.bowl = host.keep(this.scene.add.graphics());
    this.drawBowl(null);
    this.text(this.bowlAt.x + this.bowlAt.r + 40, this.bowlAt.y, "◀ Toca dos botes para mezclarlos aquí", 28, CSS.muted, 0);
    // Botes de pintura abajo.
    const n = step.paints.length;
    const gap = 26;
    const pw = Math.min(200, (w - gap * (n - 1)) / n);
    const x0 = x + (w - (pw * n + gap * (n - 1))) / 2;
    const py = Math.max(ty + r + 110, y + h - 95);
    step.paints.forEach((p, i) => {
      const pg = this.scene.add.graphics();
      pg.fillStyle(0x000000, 0.35).fillRoundedRect(-pw / 2 + 4, -60 + 8, pw, 150, 22);
      pg.fillStyle(0x2a2622, 1).fillRoundedRect(-pw / 2, -60, pw, 150, 22);
      pg.fillStyle(p.color, 1).fillEllipse(0, -10, pw * 0.7, 70);
      pg.lineStyle(3, COLORS.panelEdge, 0.7).strokeRoundedRect(-pw / 2, -60, pw, 150, 22);
      const label = this.scene.add.text(0, 58, p.name, { fontFamily: FONT_UI, fontSize: "28px", color: CSS.ivory }).setOrigin(0.5);
      const hit = this.scene.add.zone(0, 15, pw, 150).setInteractive({ useHandCursor: true });
      const box = host.keep(this.scene.add.container(x0 + i * (pw + gap) + pw / 2, py, [pg, label, hit]));
      hit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pick(i));
      this.pots.push(box);
    });
  }

  private drawBowl(color: number | null, half?: number): void {
    const { x, y, r } = this.bowlAt;
    const g = this.bowl;
    g.clear();
    g.fillStyle(0x000000, 0.35).fillCircle(x + 4, y + 8, r);
    g.fillStyle(0x1a1714, 1).fillCircle(x, y, r);
    if (color !== null) g.fillStyle(color, 1).fillCircle(x, y, r * 0.86);
    else if (half !== undefined) g.fillStyle(half, 1).fillCircle(x, y, r * 0.5);
    g.lineStyle(5, 0x8a7a64, 0.9).strokeCircle(x, y, r);
  }

  start(): void {}

  private pick(i: number): void {
    if (this.done || this.picked.includes(i) || this.picked.length >= 2) return;
    sound.play("tap");
    this.picked.push(i);
    const pot = this.pots[i];
    this.scene.tweens.add({ targets: pot, y: pot.y - 26, duration: 140, yoyo: true });
    if (this.picked.length === 1) {
      this.drawBowl(null, this.step.paints[i].color);
      return;
    }
    const [a, b] = this.picked;
    const good = encodeMix(a, b) === expectedAnswer(this.step);
    this.drawBowl(good ? this.step.target.color : muddy(this.step.paints[a].color, this.step.paints[b].color));
    this.done = true;
    this.later(600, () => this.host.submit(encodeMix(a, b)));
  }

  wrong(): void {
    this.later(1100, () => {
      this.picked = [];
      this.done = false;
      this.drawBowl(null);
    });
  }

  hear(alts: readonly string[]): boolean {
    const two = matchTwo(alts, this.step.paints.map((p) => p.name));
    if (!two || this.done) return false;
    this.picked = [];
    this.pick(two[0]);
    this.later(350, () => this.pick(two[1]));
    return true;
  }

  solve(): void {
    this.host.submit(expectedAnswer(this.step));
  }
}

// ------------------------------------------------------------------ ayudas

/** Mezcla «de verdad» de dos pinturas equivocadas: un color apagado. */
function muddy(a: number, b: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const mix = (s: number) => Math.round(((ch(a, s) + ch(b, s)) / 2) * 0.72 + 30);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** 0..n-1 barajado, nunca en su orden. */
function shuffled(n: number): number[] {
  const base = [...Array(n).keys()];
  for (let tries = 0; tries < 20; tries += 1) {
    const s = shuffledCopy(base);
    if (s.some((v, i) => v !== i)) return s;
  }
  return base.reverse();
}

function shuffledCopy<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
