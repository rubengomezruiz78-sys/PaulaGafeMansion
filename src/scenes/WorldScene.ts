import Phaser from "phaser";
import { DEBUG, GAME_H, GAME_W } from "../config";
import { NavGrid } from "../core/navmesh";
import { NpcBrain, type Intent } from "../core/npcBrain";
import { Projection, type Pt } from "../core/perspective";
import { Rng } from "../core/rng";
import { NPCS_BY_ZONE, type NpcDef } from "../content/npcs";
import { polyPx, toPx, walkAreaPx, zone as getZone, ZONES, type ExitDef, type PropDef, type ZoneDef, type ZoneId } from "../content/zones";
import { pushBackHandler } from "../platform";
import { Bubble } from "../world/Bubble";
import { Gafe, Ghost, Paula } from "../world/characters";
import { drawDebug } from "../world/debug";
import { UI_EVENTS, type DialogueRequest } from "./UIScene";

interface WorldData {
  zone: ZoneId;
  /** Salida de esta zona por la que se entra (si se viene de otra). */
  entry?: string;
}

interface NpcRuntime {
  def: NpcDef;
  actor: Ghost;
  brain: NpcBrain;
  thinkIn: number;
  bubble?: Bubble;
  barkIndex: number;
}

type Pending =
  | { kind: "exit"; exit: ExitDef }
  | { kind: "prop"; prop: PropDef }
  | { kind: "npc"; npc: NpcRuntime };

const TAP_MAX_MOVE = 28;
const DOUBLE_TAP_MS = 330;

export class WorldScene extends Phaser.Scene {
  private zoneDef!: ZoneDef;
  private proj!: Projection;
  private nav!: NavGrid;
  private paula!: Paula;
  private gafe!: Gafe;
  private npcs: NpcRuntime[] = [];
  private pending?: Pending;
  private transitioning = false;
  private lastFloorTap = { t: -1e9, x: 0, y: 0 };
  private rng = new Rng(20260924);
  private clock = 0;
  private releaseBack?: () => void;
  private backArmedUntil = 0;

  constructor() {
    super("world");
  }

  create(data: WorldData): void {
    this.zoneDef = getZone(data.zone);
    this.proj = new Projection(this.zoneDef.perspective, GAME_W, GAME_H);
    this.nav = new NavGrid(walkAreaPx(this.zoneDef), this.proj);
    this.npcs = [];
    this.pending = undefined;
    this.transitioning = false;

    this.add.image(0, 0, `zone-${this.zoneDef.id}`).setOrigin(0).setDisplaySize(GAME_W, GAME_H).setDepth(-1000);
    this.addGlints();

    const tint = this.zoneDef.actorTint ?? 0xd2cfcc;
    const entryExit = data.entry ? this.zoneDef.exits.find((e) => e.id === data.entry) : undefined;
    const inside = this.nav.nearestWalkable(toPx(this.zoneDef.spawn));
    const start = this.nav.nearestWalkable(toPx(entryExit ? entryExit.approach : this.zoneDef.spawn));
    this.paula = new Paula(this, this.proj, start, tint);
    this.paula.walker.face(inside);
    if (entryExit) {
      // Entra por la puerta: aparece en el umbral y da unos pasos hacia dentro;
      // Gafe cruza la misma puerta detrás de ella.
      this.gafe = new Gafe(this, this.proj, start, tint);
      const sf = this.proj.toFloor(start);
      const cf = this.proj.toFloor(inside);
      const d = Math.hypot(cf.X - sf.X, cf.Z - sf.Z);
      const step = Math.min(1.2, d);
      if (step > 0.2) {
        const t = step / d;
        const into = this.nav.nearestWalkable(this.proj.fromFloor({ X: sf.X + (cf.X - sf.X) * t, Z: sf.Z + (cf.Z - sf.Z) * t }));
        this.paula.walker.setPath(this.nav.findPath(start, into));
      }
    } else {
      const pf = this.proj.toFloor(start);
      this.gafe = new Gafe(this, this.proj, this.nav.nearestWalkable(this.proj.fromFloor({ X: pf.X - this.paula.walker.facing * 0.7, Z: Math.max(0.6, pf.Z - 0.3) })), tint);
      this.gafe.walker.face(inside);
    }

    for (const def of NPCS_BY_ZONE[this.zoneDef.id] ?? []) this.spawnNpc(def, tint);

    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (this.registry.get("modal") || this.transitioning) return;
      if (p.getDistance() > TAP_MAX_MOVE) return;
      this.onTap({ x: p.worldX, y: p.worldY });
    });

    this.releaseBack = pushBackHandler(() => this.onBack());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseBack?.());

    if (DEBUG) drawDebug(this, this.zoneDef, this.proj);
    this.cameras.main.fadeIn(360, 5, 6, 8);
    this.game.events.emit(UI_EVENTS.zone, this.zoneDef.name);
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.clock += dt;
    this.paula.update(dt);
    this.gafe.follow(dt, this.paula, this.nav);
    this.gafe.update(dt);
    for (const npc of this.npcs) this.updateNpc(npc, dt);
    this.resolvePending();
  }

  // ---------------------------------------------------------------- toques

  private onTap(pt: Pt): void {
    // 1) Personajes (el de delante primero).
    const npc = [...this.npcs]
      .sort((a, b) => b.actor.pos.y - a.actor.pos.y)
      .find((n) => n.actor.hitRect().contains(pt.x, pt.y));
    if (npc) return this.walkToNpc(npc);

    // 2) Objetos y salidas.
    const prop = this.zoneDef.props.find((p) => Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(polyPx(p.hotspot)), pt.x, pt.y));
    if (prop) {
      this.pending = { kind: "prop", prop };
      return this.walkTo(toPx(prop.approach));
    }
    const exit = this.zoneDef.exits.find((e) => Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(polyPx(e.hotspot)), pt.x, pt.y));
    if (exit) {
      this.pending = { kind: "exit", exit };
      this.game.events.emit(UI_EVENTS.toast, `→ ${exit.label}`);
      return this.walkTo(toPx(exit.approach));
    }

    // 3) Suelo: doble toque = correr.
    const now = this.time.now;
    const run = now - this.lastFloorTap.t < DOUBLE_TAP_MS && Math.hypot(pt.x - this.lastFloorTap.x, pt.y - this.lastFloorTap.y) < 110;
    this.lastFloorTap = { t: now, x: pt.x, y: pt.y };
    this.pending = undefined;
    this.walkTo(pt, run);
  }

  private walkTo(target: Pt, run = false): void {
    const path = this.nav.findPath(this.paula.pos, target);
    this.paula.walker.setPath(path, run);
    const dest = path.length ? path[path.length - 1] : this.paula.pos;
    this.showRing(dest);
  }

  private walkToNpc(npc: NpcRuntime): void {
    npc.brain.beginTalk();
    npc.actor.walker.stop();
    // Se acerca hasta ~0,9 m de él, por el lado en que está Paula.
    const nf = this.proj.toFloor(npc.actor.pos);
    const pf = this.proj.toFloor(this.paula.pos);
    const d = Math.hypot(pf.X - nf.X, pf.Z - nf.Z) || 1;
    const spot = this.proj.fromFloor({ X: nf.X + ((pf.X - nf.X) / d) * 0.9, Z: Math.max(0.6, nf.Z + ((pf.Z - nf.Z) / d) * 0.9) });
    this.pending = { kind: "npc", npc };
    this.walkTo(spot);
  }

  private resolvePending(): void {
    if (!this.pending || this.paula.walker.moving) return;
    const pending = this.pending;
    this.pending = undefined;
    switch (pending.kind) {
      case "exit":
        this.travel(pending.exit);
        break;
      case "prop": {
        const c = polyPx(pending.prop.hotspot);
        this.paula.walker.face({ x: c.reduce((s, p) => s + p.x, 0) / c.length, y: 0 });
        this.say({ speaker: "Paula", portrait: "paula-idle", lines: PROP_TEXT[pending.prop.id] ?? [pending.prop.label] });
        break;
      }
      case "npc": {
        const { npc } = pending;
        this.paula.walker.face(npc.actor.pos);
        npc.actor.walker.face(this.paula.pos);
        npc.bubble?.destroy();
        this.say({
          speaker: npc.def.name, role: npc.def.role, portrait: npc.def.sprite, lines: npc.def.talk,
          onClose: () => npc.brain.endTalk(this.clock),
        });
        break;
      }
    }
  }

  private say(req: DialogueRequest): void {
    this.game.events.emit(UI_EVENTS.dialogue, req);
  }

  // -------------------------------------------------------------- zonas

  private travel(exit: ExitDef): void {
    if (!ZONES[exit.to]) {
      this.game.events.emit(UI_EVENTS.toast, `${exit.label}: zona en construcción`);
      return;
    }
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 5, 6, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ zone: exit.to, entry: exit.toExit } satisfies WorldData);
    });
  }

  private onBack(): boolean {
    if (this.paula.walker.moving) {
      this.paula.walker.stop();
      this.pending = undefined;
      return true;
    }
    // Atrás dos veces seguidas para salir: un toque sin querer no cierra el juego.
    if (this.time.now < this.backArmedUntil) return false;
    this.backArmedUntil = this.time.now + 2200;
    this.game.events.emit(UI_EVENTS.toast, "Pulsa Atrás otra vez para salir");
    return true;
  }

  // ----------------------------------------------------------------- NPC

  private spawnNpc(def: NpcDef, tint: number): void {
    const pos = this.nav.nearestWalkable(toPx(def.start));
    const actor = new Ghost(this, this.proj, pos, def.sprite, {
      floatM: def.floatM, alpha: def.alpha, tint: def.tint ?? tint,
    });
    actor.walker.face(this.nav.nearestWalkable(toPx(this.zoneDef.spawn)));
    const pois = this.zoneDef.poi.map((p) => this.nav.nearestWalkable(toPx(p)));
    const brain = new NpcBrain(new Rng(this.rng.int(1, 1e9)), def.personality, pois);
    this.npcs.push({ def, actor, brain, thinkIn: this.rng.range(0, 0.3), barkIndex: 0 });
  }

  private updateNpc(npc: NpcRuntime, dt: number): void {
    npc.thinkIn -= dt;
    if (npc.thinkIn <= 0) {
      npc.thinkIn = 0.25;
      const intents = npc.brain.think({
        now: this.clock,
        self: npc.actor.pos,
        selfMoving: npc.actor.walker.moving,
        player: this.paula.pos,
        playerDistM: this.proj.floorDistance(npc.actor.pos, this.paula.pos),
      });
      for (const intent of intents) this.applyIntent(npc, intent);
    }
    npc.actor.update(dt);
    npc.bubble?.follow();
  }

  private applyIntent(npc: NpcRuntime, intent: Intent): void {
    switch (intent.type) {
      case "moveTo":
        npc.actor.walker.setPath(this.nav.findPath(npc.actor.pos, intent.target));
        break;
      case "stop":
        npc.actor.walker.stop();
        break;
      case "face":
        if (!npc.actor.walker.moving) npc.actor.walker.face(intent.target);
        break;
      case "bark": {
        if (this.registry.get("modal")) break;
        const lines = intent.kind === "greet" ? npc.def.greet : npc.def.ambient;
        if (!lines.length) break;
        const line = lines[npc.barkIndex % lines.length];
        npc.barkIndex += 1;
        npc.bubble?.destroy();
        npc.bubble = new Bubble(this, npc.actor, line);
        break;
      }
    }
  }

  // ------------------------------------------------------------- efectos

  private showRing(at: Pt): void {
    const ppm = this.proj.ppm(at.y);
    const w = 0.55 * ppm;
    const flatten = Math.min(0.55, Math.max(0.1, this.proj.cameraHeight / this.proj.toFloor(at).Z));
    const ring = this.add.image(at.x, at.y, "ring").setDepth(at.y - 1).setAlpha(0.9).setDisplaySize(w * 0.4, w * 0.4 * flatten);
    this.tweens.add({
      targets: ring, displayWidth: w, displayHeight: w * flatten, alpha: 0, duration: 520, ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  /** Destellos suaves en lo que se puede tocar (cada uno a su ritmo). */
  private addGlints(): void {
    const spots: { pts: Pt[]; tint: number }[] = [
      ...this.zoneDef.props.map((p) => ({ pts: polyPx(p.hotspot), tint: 0xffe2a0 })),
      ...this.zoneDef.exits.map((e) => ({ pts: polyPx(e.hotspot), tint: 0xa8e4ff })),
    ];
    for (const { pts, tint } of spots) {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const g = this.add.image(cx, cy, "glint").setTint(tint).setAlpha(0).setScale(0.35).setDepth(cy).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: g, alpha: { from: 0, to: 0.75 }, scale: { from: 0.28, to: 0.52 },
        duration: 900, yoyo: true, repeat: -1, repeatDelay: this.rng.range(1800, 4200), delay: this.rng.range(0, 3000),
        ease: "Sine.easeInOut",
      });
    }
  }
}

/** Lo que Paula piensa al examinar cada objeto (provisional: se moverá al motor de diálogo). */
const PROP_TEXT: Record<string, string[]> = {
  "retrato-aurelia": ["Es la bisabuela Aurelia. Sostiene una llave pintada…", "El marco tiene polvo por todas partes menos en el borde de abajo. Alguien lo ha movido."],
  "carta-mojada": ["Media carta empapada. El sello roto tiene el mismo dibujo que mi brújula."],
  "campanilla": ["Una campanilla de latón en mitad de la alfombra. Está demasiado limpia para llevar años aquí."],
  "baul-ines": ["Un baúl de viaje con las iniciales I. V.", "La cerradura está forzada… desde dentro."],
  "paraguero": ["Tres paraguas secos y una tiza azul húmeda. Alguien la ha usado esta misma noche."],
  "reloj-aritmetico": ["Este reloj no da la hora: cuenta algo. Tiene tres discos llenos de números."],
  "libro-abierto": ["Un libro de cuentas abierto. Alguien ha subrayado dos veces «7 × 9»."],
};

