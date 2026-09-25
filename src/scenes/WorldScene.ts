import Phaser from "phaser";
import { sound } from "../audio/sound";
import { DEBUG, GAME_H, GAME_W } from "../config";
import { heardFlag, type ChatDef } from "../core/chat";
import { DialogueRunner, type Line } from "../core/dialogue";
import { resolveProp } from "../core/interact";
import { NavGrid } from "../core/navmesh";
import { NpcBrain, type Intent } from "../core/npcBrain";
import { Projection, type Pt } from "../core/perspective";
import { apply, check, type Notice } from "../core/rules";
import { Rng } from "../core/rng";
import type { SimEvent, SimNpc } from "../core/worldSim";
import { ambienceFor, type ZoneAmbience } from "../content/ambience";
import { DIALOGUES } from "../content/dialogues";
import { GAFE_HINTS } from "../content/hints";
import { ITEMS, itemName } from "../content/items";
import { npcById, type NpcDef } from "../content/npcs";
import { PROPS } from "../content/props";
import { describeNotice, speakerFor } from "../content/speakers";
import { polyPx, toPx, walkAreaPx, zone as getZone, ZONES, type ExitDef, type PropDef, type ZoneDef, type ZoneId } from "../content/zones";
import { session } from "../game/session";
import { chatDirector, worldSim } from "../game/world";
import { pushBackHandler } from "../platform";
import { Bubble } from "../world/Bubble";
import { Gafe, Ghost, Paula } from "../world/characters";
import { drawDebug } from "../world/debug";
import type { PuzzleRequest } from "./PuzzleScene";
import { UI_EVENTS, type ConversationRequest, type DialogueRequest } from "./UIScene";

interface WorldData {
  zone: ZoneId;
  /** Salida de esta zona por la que se entra (si se viene de otra). */
  entry?: string;
}

/**
 * Qué está haciendo un personaje visible:
 *  free     → a su aire (su cerebro decide: deambular, saludar, comentar)
 *  leaving  → camina hacia una puerta para irse (lo manda la simulación)
 *  arriving → acaba de entrar por una puerta y camina hacia dentro
 *  talking  → hablando con Paula (la simulación le espera)
 *  chatting → charlando con otro personaje
 */
type NpcMode = "free" | "leaving" | "arriving" | "talking" | "chatting";

interface NpcRuntime {
  def: NpcDef;
  actor: Ghost;
  brain: NpcBrain;
  thinkIn: number;
  bubble?: Bubble;
  barkIndex: number;
  mode: NpcMode;
  exitId?: string;
  arriveTarget?: Pt;
  /** Modo al que vuelve tras hablar o charlar. */
  after?: "leaving" | "arriving";
  gone: boolean;
}

interface ActiveChat {
  def: ChatDef;
  a: NpcRuntime;
  b: NpcRuntime;
  started: boolean;
  heard: boolean;
  timers: Phaser.Time.TimerEvent[];
}

type Pending =
  | { kind: "exit"; exit: ExitDef }
  | { kind: "prop"; prop: PropDef }
  | { kind: "npc"; npc: NpcRuntime };

const TAP_MAX_MOVE = 28;
const DOUBLE_TAP_MS = 330;
const SIM_STEP = 0.25;
const CHAT_CHECK = 1.5;
/** Hasta dónde oye Paula una charla (m). */
const EARSHOT_M = 7;
/**
 * Salas cuya imagen se queda en memoria (la actual y las últimas visitadas).
 * La tablet tiene poca RAM: las 12 imágenes a la vez ocuparían ~100 MB.
 */
const KEEP_ZONES = 3;
const recentZones: string[] = [];
/**
 * Modo ligero: si la tablet no llega a ~36 fps en una sala, se quitan los
 * efectos decorativos (viñeta y motas) el resto de la sesión.
 */
let lowFx = false;
const LOW_FPS = 36;

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
  private releaseBack?: () => void;
  private backArmedUntil = 0;
  private simIn = 0;
  private chatIn = CHAT_CHECK;
  private lastChatAt = -Infinity;
  private chat?: ActiveChat;
  private tint = 0xd2cfcc;
  /** Comentarios en espera: salen de uno en uno para que no se pisen. */
  private barks: { rt: NpcRuntime; line: string; until: number }[] = [];
  private nextBarkAt = 0;
  /** Objeto de la mochila que Paula lleva en la mano para usarlo. */
  private using?: string;
  /** Sitios desde los que Paula usa objetos y puertas: nadie se queda parado ahí. */
  private useSpots: Pt[] = [];
  private amb!: ZoneAmbience;
  private lightningIn = 0;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private stepCount = 0;
  private fxObjects: Phaser.GameObjects.GameObject[] = [];
  private perfClock = 0;

  constructor() {
    super("world");
  }

  private get now(): number {
    return session.state.clock;
  }

  /** true cuando la sala ya está montada (para las pruebas). */
  ready = false;
  private target!: ZoneId;

  init(data: WorldData): void {
    this.ready = false;
    this.target = data.zone;
  }

  /** Solo se carga la imagen de la sala a la que se entra (durante el fundido). */
  preload(): void {
    const key = `zone-${this.target}`;
    if (!this.textures.exists(key)) this.load.image(key, getZone(this.target).image);
  }

  /** Olvida las imágenes de las salas que hace rato que no se visitan. */
  private trimZoneTextures(current: string): void {
    const i = recentZones.indexOf(current);
    if (i >= 0) recentZones.splice(i, 1);
    recentZones.unshift(current);
    for (const old of recentZones.splice(KEEP_ZONES)) {
      if (this.textures.exists(`zone-${old}`)) this.textures.remove(`zone-${old}`);
    }
  }

  create(data: WorldData): void {
    this.zoneDef = getZone(data.zone);
    this.trimZoneTextures(this.zoneDef.id);
    session.enterZone(this.zoneDef.id);
    this.proj = new Projection(this.zoneDef.perspective, GAME_W, GAME_H);
    this.nav = new NavGrid(walkAreaPx(this.zoneDef), this.proj);
    this.useSpots = [...this.zoneDef.props, ...this.zoneDef.exits].map((x) => this.nav.nearestWalkable(toPx(x.approach)));
    this.npcs = [];
    this.pending = undefined;
    this.transitioning = false;
    this.chat = undefined;
    this.barks = [];
    this.nextBarkAt = 0;
    // Al entrar, primero los saludos; las charlas empiezan un poco después.
    this.chatIn = 6;
    this.tint = this.zoneDef.actorTint ?? 0xd2cfcc;

    this.add.image(0, 0, `zone-${this.zoneDef.id}`).setOrigin(0).setDisplaySize(GAME_W, GAME_H).setDepth(-1000);
    this.addGlints();
    this.setupAmbience();
    this.placePaulaAndGafe(data);

    // Quien esté en esta zona según la simulación aparece ya dentro (o en su puerta).
    worldSim.visibleZoneChanged(this.now, this.zoneDef.id);
    const pois = this.shuffledPois();
    for (const n of worldSim.presentIn(this.zoneDef.id)) this.spawnFromSim(n, pois);

    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      if (this.registry.get("modal") || this.transitioning) return;
      if (p.getDistance() > TAP_MAX_MOVE) return;
      this.onTap({ x: p.worldX, y: p.worldY });
    });

    this.releaseBack = pushBackHandler(() => this.onBack());
    this.using = undefined;
    this.game.events.emit(UI_EVENTS.using, null);
    this.game.events.on(UI_EVENTS.use, this.setUsing, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(UI_EVENTS.use, this.setUsing, this);
      this.releaseBack?.();
      this.abortChat();
      for (const rt of this.npcs) if (worldSim.isPaused(rt.def.id)) worldSim.resume(rt.def.id, this.now, false);
    });

    if (DEBUG) drawDebug(this, this.zoneDef, this.proj);
    if (!session.state.flags["intro-visto"] && this.zoneDef.id === "vestibulo") this.time.delayedCall(1500, () => this.playIntro());
    this.cameras.main.fadeIn(360, 5, 6, 8);
    this.game.events.emit(UI_EVENTS.zone, this.zoneDef.name);
    this.ready = true;
  }

  private placePaulaAndGafe(data: WorldData): void {
    const entryExit = data.entry ? this.zoneDef.exits.find((e) => e.id === data.entry) : undefined;
    const inside = this.nav.nearestWalkable(toPx(this.zoneDef.spawn));
    const start = this.nav.nearestWalkable(toPx(entryExit ? entryExit.approach : this.zoneDef.spawn));
    this.paula = new Paula(this, this.proj, start, this.tint);
    this.paula.walker.face(inside);
    if (entryExit) {
      // Entra por la puerta: aparece en el umbral y da unos pasos hacia dentro;
      // Gafe cruza la misma puerta detrás de ella.
      this.gafe = new Gafe(this, this.proj, start, this.tint);
      const into = this.stepInside(start, 1.2);
      if (into) this.paula.walker.setPath(this.nav.findPath(start, into));
    } else {
      const pf = this.proj.toFloor(start);
      this.gafe = new Gafe(this, this.proj, this.nav.nearestWalkable(this.proj.fromFloor({ X: pf.X - this.paula.walker.facing * 0.7, Z: Math.max(0.6, pf.Z - 0.3) })), this.tint);
      this.gafe.walker.face(inside);
    }
  }

  /** Punto a `meters` desde `from` hacia el centro de la habitación (o null si ya está dentro). */
  private stepInside(from: Pt, meters: number): Pt | null {
    const inside = this.nav.nearestWalkable(toPx(this.zoneDef.spawn));
    const sf = this.proj.toFloor(from);
    const cf = this.proj.toFloor(inside);
    const d = Math.hypot(cf.X - sf.X, cf.Z - sf.Z);
    const step = Math.min(meters, d);
    if (step < 0.2) return null;
    const t = step / d;
    return this.nav.nearestWalkable(this.proj.fromFloor({ X: sf.X + (cf.X - sf.X) * t, Z: sf.Z + (cf.Z - sf.Z) * t }));
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    session.state.clock += dt;

    this.simIn -= dt;
    if (this.simIn <= 0) {
      this.simIn = SIM_STEP;
      this.handleSim(worldSim.tick(this.now, this.zoneDef.id));
    }

    this.watchPerformance(dt);
    this.paula.update(dt);
    this.footsteps();
    this.updateLightning(dt);
    this.gafe.follow(dt, this.paula, this.nav);
    this.gafe.update(dt);
    for (const rt of [...this.npcs]) this.updateNpc(rt, dt);

    this.chatIn -= dt;
    if (this.chatIn <= 0) {
      this.chatIn = CHAT_CHECK;
      this.tryStartChat();
    }
    if (this.chat && !this.chat.started) this.maybeBeginChatLines();
    this.flushBarks();
    this.resolvePending();
  }

  // ---------------------------------------------------------------- toques

  private onTap(pt: Pt): void {
    // 1) Personajes (el de delante primero).
    const npc = [...this.npcs]
      .filter((n) => !n.gone)
      .sort((a, b) => b.actor.pos.y - a.actor.pos.y)
      .find((n) => n.actor.hitRect().contains(pt.x, pt.y));
    if (npc) return this.walkToNpc(npc);
    if (this.gafe.hitRect().contains(pt.x, pt.y)) return this.askGafe();

    // 2) Objetos y salidas.
    const prop = this.zoneDef.props.find((p) => Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(polyPx(p.hotspot)), pt.x, pt.y));
    if (prop) {
      this.pending = { kind: "prop", prop };
      return this.walkTo(toPx(prop.approach));
    }
    const exit = this.zoneDef.exits.find((e) => Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(polyPx(e.hotspot)), pt.x, pt.y));
    if (exit) {
      this.setUsing(null);
      this.pending = { kind: "exit", exit };
      if (check(exit.requires, session.state)) this.game.events.emit(UI_EVENTS.toast, `→ ${exit.label}`);
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

  private walkToNpc(rt: NpcRuntime): void {
    if (this.chat && (this.chat.a === rt || this.chat.b === rt)) this.abortChat();
    if (rt.mode !== "talking") {
      rt.after = rt.mode === "leaving" || rt.mode === "arriving" ? rt.mode : undefined;
      rt.mode = "talking";
      worldSim.pause(rt.def.id);
    }
    rt.brain.beginTalk();
    rt.actor.walker.stop();
    // Se pone a su lado, a ~0,9 m y a su misma profundidad (así ninguno tapa
    // al otro); si ese lado está ocupado por un mueble, por el otro; y si no,
    // de frente, por donde viene Paula.
    const nf = this.proj.toFloor(rt.actor.pos);
    const pf = this.proj.toFloor(this.paula.pos);
    const side = Math.sign(pf.X - nf.X) || 1;
    const beside = [side, -side]
      .map((s) => this.proj.fromFloor({ X: nf.X + s * 0.9, Z: nf.Z }))
      .find((p) => this.nav.isWalkable(p) && this.npcs.every((o) => o === rt || o.gone || this.proj.floorDistance(o.actor.pos, p) > 0.6));
    const d = Math.hypot(pf.X - nf.X, pf.Z - nf.Z) || 1;
    const spot = beside ?? this.proj.fromFloor({ X: nf.X + ((pf.X - nf.X) / d) * 0.9, Z: Math.max(0.6, nf.Z + ((pf.Z - nf.Z) / d) * 0.9) });
    this.pending = { kind: "npc", npc: rt };
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
        this.interactProp(pending.prop);
        break;
      }
      case "npc":
        this.talkTo(pending.npc);
        break;
    }
  }

  /** Examinar un objeto (o usar en él lo que Paula lleva en la mano). */
  private interactProp(prop: PropDef): void {
    const using = this.using;
    if (using) this.setUsing(null);
    const action = resolveProp(PROPS[prop.id] ?? [], session.state, using);
    if (!action) {
      this.say({ speaker: "Paula", portrait: "paula-idle", lines: [using ? `¿${itemName(using)}? No, aquí no sirve.` : prop.label] });
      return;
    }
    const notices = apply([...(action.effects ?? []), { examine: prop.id }], session.state);
    session.save();
    this.toastNotices(notices);
    const puzzle = action.puzzle;
    this.say({
      speaker: "Paula", portrait: "paula-idle", lines: action.lines,
      onClose: puzzle ? () => this.openPuzzle(puzzle) : undefined,
    });
  }

  private toastNotices(notices: Notice[]): void {
    if (notices.some((n) => n.type === "item")) sound.play("pickup");
    else if (notices.some((n) => n.type === "questDone")) sound.play("solved");
    for (const n of notices) {
      const text = describeNotice(n, session.state);
      if (text) this.game.events.emit(UI_EVENTS.toast, text);
    }
  }

  private openPuzzle(id: string): void {
    this.scene.launch("puzzle", {
      id,
      onClose: (solved) => {
        session.save();
        if (solved && session.state.flags.final) this.playEnding();
      },
    } satisfies PuzzleRequest);
  }

  /** Paula coge (o suelta, con null) un objeto de la mochila para usarlo. */
  private setUsing(item: string | null): void {
    this.using = item && ITEMS[item] && session.state.inventory.includes(item) ? item : undefined;
    this.game.events.emit(UI_EVENTS.using, this.using ?? null);
  }

  /** Tocar a Gafe: dice (a su manera) qué se podría hacer ahora. */
  private askGafe(): void {
    this.pending = undefined;
    this.paula.walker.stop();
    this.paula.walker.face(this.gafe.pos);
    const hint = GAFE_HINTS.find((h) => check(h.if, session.state));
    this.say({ speaker: "Gafe", role: "Gato negro", portrait: "gafe-sit", lines: [hint?.text ?? "Miau."] });
  }

  /** Al empezar: dónde está Paula y cómo se juega, dicho por ella y por Gafe. */
  private playIntro(): void {
    if (session.state.flags["intro-visto"] || this.registry.get("modal")) return;
    session.state.flags["intro-visto"] = true;
    session.save();
    this.say({
      speaker: "Paula", portrait: "paula-idle",
      lines: [
        "¿Hola? La puerta estaba abierta… y fuera no para de llover.",
        { by: "gafe", text: "Miau. (Gafe se sacude la lluvia encima de la alfombra.)" },
        "Vale, Gafe. Toco el suelo para ir a los sitios, y dos veces rápido para correr.",
        "Si toco a alguien, hablo con él. Si toco algo, lo miro de cerca.",
        "En la mochila guardo lo que encuentre, y en el cuaderno apunto lo importante.",
        { by: "gafe", text: "Miau. (Si no sabes qué hacer, tócame a mí.)" },
      ],
    });
  }

  /** La decimotercera campanada: Inés recuerda y amanece. */
  private playEnding(): void {
    const lines: Line[] = [
      "Cinco recuerdos… y trece campanadas contadas sin dar un solo golpe.",
      { by: "ines", text: "¡Me acuerdo! Me acuerdo de todo: de mi casa, de mi cinta, de mi canción." },
      { by: "ines", text: "Y de tu voz, Paula. Gracias por no irte." },
      { by: "basilio", text: "Señorita… ha dejado de llover. Por primera vez en cien años, en esta casa amanece." },
      { by: "gafe", text: "Prrr. (Gafe ronronea tan fuerte que tiembla la torre.)" },
      "Vamos, Gafe. Hay que contarle a todo el mundo que esta casa ya no da miedo.",
    ];
    this.say({
      speaker: "Paula", portrait: "paula-idle", lines,
      onClose: () => {
        this.amb = ambienceFor(this.zoneDef.id, true);
        sound.setAmbience(this.amb);
        this.scene.launch("end");
      },
    });
  }

  private talkTo(rt: NpcRuntime): void {
    if (rt.gone) return;
    this.paula.walker.face(rt.actor.pos);
    rt.actor.walker.face(this.paula.pos);
    rt.bubble?.destroy();
    const end = () => {
      rt.brain.endTalk(this.now);
      worldSim.resume(rt.def.id, this.now, true);
      this.resumeAfterPause(rt);
      session.save();
    };
    const tree = DIALOGUES[rt.def.id];
    if (!tree) {
      this.say({ speaker: rt.def.name, role: rt.def.role, portrait: rt.def.sprite, lines: rt.def.greet, onClose: end });
      return;
    }
    this.game.events.emit(UI_EVENTS.conversation, {
      runner: new DialogueRunner(tree, session.state),
      speaker: speakerFor,
      notice: describeNotice,
      onChange: () => session.save(),
      onEnd: end,
    } satisfies ConversationRequest);
  }

  private say(req: DialogueRequest): void {
    this.game.events.emit(UI_EVENTS.dialogue, req);
  }

  // -------------------------------------------------------------- zonas

  private travel(exit: ExitDef): void {
    if (!ZONES[exit.to]) throw new Error(`Salida ${exit.id} hacia una zona inexistente: ${exit.to}`);
    if (!check(exit.requires, session.state)) {
      // Cerrada por la historia: Paula mira la puerta y dice por qué no puede pasar.
      this.say({ speaker: "Paula", portrait: "paula-idle", lines: [exit.lockedText ?? "Por aquí no se puede pasar todavía."] });
      return;
    }
    this.toastNotices(apply(exit.onUse, session.state));
    sound.play("door");
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 5, 6, 8);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ zone: exit.to, entry: exit.toExit } satisfies WorldData);
    });
  }

  private onBack(): boolean {
    if (this.using) {
      this.setUsing(null);
      return true;
    }
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

  // ------------------------------------------------ personajes y simulación

  private shuffledPois(): Pt[] {
    const pois = this.zoneDef.poi.map((p) => this.nav.nearestWalkable(toPx(p)));
    for (let i = pois.length - 1; i > 0; i -= 1) {
      const j = this.rng.int(0, i);
      [pois[i], pois[j]] = [pois[j], pois[i]];
    }
    return pois;
  }

  /** Un punto de interés libre, lejos de Paula si se puede. */
  private freePoi(pool: Pt[]): Pt {
    const far = pool.findIndex((p) => this.proj.floorDistance(p, this.paula.pos) > 1.6);
    const i = far >= 0 ? far : 0;
    const p = pool.length ? pool.splice(i, 1)[0] : this.nav.nearestWalkable(toPx(this.zoneDef.spawn));
    return this.clearOfSpots(p);
  }

  private spawnFromSim(n: SimNpc, pois: Pt[]): void {
    const def = npcById(n.id);
    if (!def) return;
    switch (n.phase.kind) {
      case "stay":
        this.spawnActor(def, this.freePoi(pois), false);
        break;
      case "leaving": {
        const rt = this.spawnActor(def, this.freePoi(pois), false);
        this.startLeaving(rt, n.phase.exitId);
        break;
      }
      case "arriving": {
        const entry = this.zoneDef.exits.find((e) => e.id === (n.phase as { entryExit: string }).entryExit);
        const at = entry ? this.nav.nearestWalkable(toPx(entry.approach)) : this.freePoi(pois);
        const rt = this.spawnActor(def, at, true);
        this.startArriving(rt, n.route.length > 0);
        break;
      }
      case "away":
        break;
    }
  }

  private spawnActor(def: NpcDef, pos: Pt, fadeIn: boolean): NpcRuntime {
    const actor = new Ghost(this, this.proj, pos, def.sprite, { floatM: def.floatM, alpha: def.alpha, tint: def.tint ?? this.tint });
    actor.walker.face(this.nav.nearestWalkable(toPx(this.zoneDef.spawn)));
    if (fadeIn) {
      actor.container.setAlpha(0);
      this.tweens.add({ targets: actor.container, alpha: 1, duration: 420 });
    }
    const brain = new NpcBrain(new Rng(this.rng.int(1, 1e9)), def.personality, this.zoneDef.poi.map((p) => this.nav.nearestWalkable(toPx(p))));
    const rt: NpcRuntime = { def, actor, brain, thinkIn: this.rng.range(0, 0.3), barkIndex: 0, mode: "free", gone: false };
    this.npcs.push(rt);
    return rt;
  }

  private despawn(rt: NpcRuntime): void {
    if (rt.gone) return;
    rt.gone = true;
    rt.bubble?.destroy();
    this.npcs = this.npcs.filter((x) => x !== rt);
    this.tweens.add({ targets: rt.actor.container, alpha: 0, duration: 380, onComplete: () => rt.actor.container.destroy() });
  }

  private startLeaving(rt: NpcRuntime, exitId: string): void {
    const exit = this.zoneDef.exits.find((e) => e.id === exitId);
    rt.mode = "leaving";
    rt.exitId = exitId;
    if (!exit) return;
    rt.actor.walker.setPath(this.nav.findPath(rt.actor.pos, toPx(exit.approach)));
  }

  private startArriving(rt: NpcRuntime, passingThrough: boolean): void {
    rt.mode = "arriving";
    rt.arriveTarget = passingThrough
      ? this.stepInside(rt.actor.pos, 1.0) ?? rt.actor.pos
      : this.freePoi(this.shuffledPois());
    rt.actor.walker.setPath(this.nav.findPath(rt.actor.pos, rt.arriveTarget));
  }

  /** Tras hablar o charlar, sigue con lo que estaba haciendo. */
  private resumeAfterPause(rt: NpcRuntime): void {
    if (rt.gone) return;
    const after = rt.after;
    rt.after = undefined;
    if (after === "leaving" && rt.exitId) this.startLeaving(rt, rt.exitId);
    else if (after === "arriving" && rt.arriveTarget) {
      rt.mode = "arriving";
      rt.actor.walker.setPath(this.nav.findPath(rt.actor.pos, rt.arriveTarget));
    } else rt.mode = "free";
  }

  private handleSim(events: SimEvent[]): void {
    for (const ev of events) {
      const rt = this.npcs.find((x) => x.def.id === ev.npc && !x.gone);
      switch (ev.type) {
        case "leave":
          if (ev.zone === this.zoneDef.id && rt && rt.mode !== "talking" && rt.mode !== "chatting") this.startLeaving(rt, ev.exitId);
          break;
        case "gone":
          if (rt) this.despawn(rt);
          break;
        case "arrive": {
          if (ev.zone !== this.zoneDef.id || rt) break;
          const def = npcById(ev.npc);
          const entry = this.zoneDef.exits.find((e) => e.id === ev.entryExit);
          if (!def || !entry) break;
          const spawned = this.spawnActor(def, this.nav.nearestWalkable(toPx(entry.approach)), true);
          this.startArriving(spawned, ev.passingThrough);
          break;
        }
      }
    }
  }

  private updateNpc(rt: NpcRuntime, dt: number): void {
    if (rt.gone) return;
    if (rt.mode === "leaving" && !rt.actor.walker.moving) {
      // Llegó a la puerta: se desvanece por ella.
      this.despawn(rt);
      this.handleSim(worldSim.reachedExit(rt.def.id, this.now));
      return;
    }
    if (rt.mode === "arriving" && !rt.actor.walker.moving) {
      rt.mode = "free";
      this.handleSim(worldSim.settled(rt.def.id, this.now, this.zoneDef.id));
    }
    // Si Paula se para encima de alguien, ese alguien se aparta un paso.
    if (rt.mode === "free" && !rt.actor.walker.moving && !this.paula.walker.moving
      && this.proj.floorDistance(rt.actor.pos, this.paula.pos) < 0.5) {
      rt.actor.walker.setPath(this.nav.findPath(rt.actor.pos, this.clearOfPaula(rt.actor.pos)));
    }
    if (rt.mode === "free" || rt.mode === "talking") {
      rt.thinkIn -= dt;
      if (rt.thinkIn <= 0) {
        rt.thinkIn = 0.25;
        const intents = rt.brain.think({
          now: this.now,
          self: rt.actor.pos,
          selfMoving: rt.actor.walker.moving,
          player: this.paula.pos,
          playerDistM: this.proj.floorDistance(rt.actor.pos, this.paula.pos),
        });
        for (const intent of intents) this.applyIntent(rt, intent);
      }
    }
    rt.actor.update(dt);
    // Quien está delante de Paula y la tapa se vuelve translúcido.
    const pr = this.paula.hitRect();
    const cut = Phaser.Geom.Rectangle.Intersection(pr, rt.actor.hitRect());
    rt.actor.updateSeeThrough(rt.actor.pos.y > this.paula.pos.y && cut.width * cut.height > 0.25 * pr.width * pr.height, dt);
    rt.bubble?.follow();
  }

  /**
   * Si un destino cae justo donde Paula tiene que ponerse para usar un objeto o
   * una puerta, lo corre ~1 m: así nadie le tapa las cosas ni le corta el paso.
   */
  private clearOfSpots(target: Pt): Pt {
    const near = this.useSpots.find((sp) => this.proj.floorDistance(sp, target) < 0.7);
    if (!near) return target;
    const nf = this.proj.toFloor(near);
    const tf = this.proj.toFloor(target);
    const d = Math.hypot(tf.X - nf.X, tf.Z - nf.Z);
    const base = d > 0.05 ? Math.atan2(tf.Z - nf.Z, tf.X - nf.X) : 0;
    for (const turn of [0, 0.8, -0.8, 1.6, -1.6, Math.PI]) {
      const a = base + turn;
      const p = this.proj.fromFloor({ X: nf.X + Math.cos(a) * 1.0, Z: Math.max(0.6, nf.Z + Math.sin(a) * 1.0) });
      if (this.nav.isWalkable(p) && this.useSpots.every((sp) => this.proj.floorDistance(sp, p) >= 0.7)) return p;
    }
    return target;
  }

  /**
   * Si un destino cae encima de Paula, lo cambia por un sitio a ~1 m de ella
   * donde no la tape: a un lado o detrás (nunca delante, entre ella y la cámara).
   */
  private clearOfPaula(target: Pt): Pt {
    const pf = this.proj.toFloor(this.paula.pos);
    const tf = this.proj.toFloor(target);
    if (Math.hypot(tf.X - pf.X, tf.Z - pf.Z) >= 0.9) return target;
    const side = Math.sign(tf.X - pf.X) || 1;
    const options: [number, number][] = [[side, 0], [-side, 0], [side * 0.8, 0.7], [-side * 0.8, 0.7], [0, 1.1]];
    for (const [dx, dz] of options) {
      const p = this.proj.fromFloor({ X: pf.X + dx, Z: pf.Z + dz });
      if (this.nav.isWalkable(p)) return p;
    }
    return this.nav.nearestWalkable(this.proj.fromFloor({ X: pf.X + side, Z: pf.Z + 0.7 }));
  }

  private applyIntent(rt: NpcRuntime, intent: Intent): void {
    switch (intent.type) {
      case "moveTo":
        if (rt.mode === "free") rt.actor.walker.setPath(this.nav.findPath(rt.actor.pos, this.clearOfPaula(this.clearOfSpots(intent.target))));
        break;
      case "stop":
        rt.actor.walker.stop();
        break;
      case "face":
        if (!rt.actor.walker.moving) rt.actor.walker.face(intent.target);
        break;
      case "bark": {
        if (this.registry.get("modal") || rt.mode !== "free") break;
        const lines = intent.kind === "greet" ? rt.def.greet : rt.def.ambient;
        if (!lines.length) break;
        if (this.barks.some((b) => b.rt === rt)) break;
        const line = lines[rt.barkIndex % lines.length];
        rt.barkIndex += 1;
        this.barks.push({ rt, line, until: this.time.now + 6000 });
        break;
      }
    }
  }

  /** Saca el siguiente comentario en espera si nadie más está hablando. */
  private flushBarks(): void {
    const now = this.time.now;
    this.barks = this.barks.filter((b) => b.until > now && !b.rt.gone && b.rt.mode === "free");
    if (!this.barks.length || now < this.nextBarkAt || this.chat?.started || this.registry.get("modal")) return;
    const { rt, line } = this.barks.shift()!;
    rt.bubble?.destroy();
    rt.bubble = new Bubble(this, rt.actor, line);
    this.nextBarkAt = now + Math.min(2800, 1100 + line.length * 30);
  }

  // ---------------------------------------------------------------- charlas

  private tryStartChat(): void {
    if (this.chat || this.registry.get("modal")) return;
    const idle = this.npcs
      .filter((rt) => !rt.gone && rt.mode === "free" && !worldSim.isPaused(rt.def.id) && worldSim.npcs.get(rt.def.id)?.phase.kind === "stay")
      .filter((rt) => this.proj.floorDistance(rt.actor.pos, this.paula.pos) < 10)
      .map((rt) => rt.def.id);
    const def = chatDirector.pick(idle, session.state, this.now, this.lastChatAt);
    if (!def) return;
    const a = this.npcs.find((x) => x.def.id === def.between[0]);
    const b = this.npcs.find((x) => x.def.id === def.between[1]);
    if (!a || !b) return;
    this.lastChatAt = this.now;
    for (const rt of [a, b]) {
      rt.mode = "chatting";
      worldSim.pause(rt.def.id);
      rt.actor.walker.stop();
      rt.bubble?.destroy();
    }
    // Se juntan uno al lado del otro (a 1,2 m, a la misma profundidad) para
    // que desde la cámara se vea a los dos de perfil y ninguno tape al otro.
    const [left, right] = a.actor.pos.x <= b.actor.pos.x ? [a, b] : [b, a];
    const lf = this.proj.toFloor(left.actor.pos);
    const rf = this.proj.toFloor(right.actor.pos);
    const mid = { X: (lf.X + rf.X) / 2, Z: (lf.Z + rf.Z) / 2 };
    const pf = this.proj.toFloor(this.paula.pos);
    // El sitio de la charla no puede quedar encima de Paula: si le pilla en
    // medio, se corre hacia el fondo o hacia un lado.
    const spots = [
      mid,
      { X: mid.X, Z: mid.Z + 1.4 },
      { X: mid.X + 1.6, Z: mid.Z },
      { X: mid.X - 1.6, Z: mid.Z },
      { X: mid.X, Z: mid.Z - 1.2 },
    ]
      .filter((m) => m.Z > 0.8 && Math.hypot(m.X - pf.X, m.Z - pf.Z) > 1.4)
      .map((m) => [-0.6, 0.6].map((dx) => this.proj.fromFloor({ X: m.X + dx, Z: m.Z })))
      .find(([l, r]) => this.nav.isWalkable(l) && this.nav.isWalkable(r)
        && this.useSpots.every((sp) => this.proj.floorDistance(sp, l) >= 0.6 && this.proj.floorDistance(sp, r) >= 0.6));
    if (spots) {
      left.actor.walker.setPath(this.nav.findPath(left.actor.pos, spots[0]));
      right.actor.walker.setPath(this.nav.findPath(right.actor.pos, spots[1]));
    }
    this.chat = { def, a, b, started: false, heard: true, timers: [] };
  }

  private maybeBeginChatLines(): void {
    const c = this.chat;
    if (!c || c.a.actor.walker.moving || c.b.actor.walker.moving) return;
    c.started = true;
    c.a.actor.walker.face(c.b.actor.pos);
    c.b.actor.walker.face(c.a.actor.pos);
    let delay = 200;
    c.def.lines.forEach(([who, text], i) => {
      c.timers.push(this.time.delayedCall(delay, () => {
        const speaker = who === c.a.def.id ? c.a : c.b;
        if (speaker.gone) return;
        if (this.proj.floorDistance(speaker.actor.pos, this.paula.pos) > EARSHOT_M || this.registry.get("modal")) c.heard = false;
        // Solo un bocadillo a la vez en la charla: el del que habla.
        c.a.bubble?.destroy();
        c.b.bubble?.destroy();
        speaker.bubble = new Bubble(this, speaker.actor, text);
        if (i === c.def.lines.length - 1) {
          c.timers.push(this.time.delayedCall(1300 + text.length * 45, () => this.finishChat()));
        }
      }));
      delay += 1300 + text.length * 45;
    });
  }

  private finishChat(): void {
    const c = this.chat;
    if (!c) return;
    this.chat = undefined;
    for (const rt of [c.a, c.b]) {
      if (rt.gone) continue;
      worldSim.resume(rt.def.id, this.now, true);
      if (rt.mode === "chatting") rt.mode = "free";
    }
    if (c.heard && !c.def.repeatable && !session.state.flags[heardFlag(c.def.id)]) {
      session.state.flags[heardFlag(c.def.id)] = true;
      apply(c.def.effects, session.state);
      session.save();
      sound.play("pickup");
      this.game.events.emit(UI_EVENTS.toast, "✎ Paula apunta lo que ha oído en su cuaderno");
    }
  }

  private abortChat(): void {
    const c = this.chat;
    if (!c) return;
    this.chat = undefined;
    for (const t of c.timers) t.remove(false);
    for (const rt of [c.a, c.b]) {
      rt.bubble?.destroy();
      if (rt.gone) continue;
      worldSim.resume(rt.def.id, this.now, true);
      if (rt.mode === "chatting") rt.mode = "free";
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

  // ------------------------------------------------------------- ambiente

  /** Lluvia/viento/goteo de la sala, relámpagos, viñeta y motas de polvo. */
  private setupAmbience(): void {
    this.amb = ambienceFor(this.zoneDef.id, session.state.flags.final === true);
    sound.setAmbience(this.amb);
    this.lightningIn = this.rng.range(6, 18);
    this.stepCount = 0;
    this.perfClock = 0;
    this.fxObjects = [];
    this.flashRect = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xdde8ff, 0).setOrigin(0).setDepth(4500)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (lowFx) return;
    // Viñeta: oscurece los bordes y da profundidad al cuadro.
    this.fxObjects.push(this.add.image(0, 0, "vignette").setOrigin(0).setDisplaySize(GAME_W, GAME_H).setDepth(4400).setAlpha(0.6));
    for (let i = 0; i < 14; i += 1) {
      const x = this.rng.range(0, GAME_W);
      const y = this.rng.range(120, GAME_H * 0.8);
      const m = this.add.image(x, y, "glint").setTint(0xd8e6ff).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(this.rng.range(0.04, 0.09)).setAlpha(0).setDepth(4300);
      this.fxObjects.push(m);
      this.tweens.add({
        targets: m, x: x + this.rng.range(-80, 80), y: y - this.rng.range(40, 140),
        alpha: { from: 0, to: this.rng.range(0.15, 0.4) },
        duration: this.rng.range(6000, 11000), yoyo: true, repeat: -1, delay: this.rng.range(0, 6000), ease: "Sine.easeInOut",
      });
    }
  }

  /** Si va a tirones, pasa a modo ligero (se mide tras unos segundos en la sala). */
  private watchPerformance(dt: number): void {
    if (lowFx) return;
    this.perfClock += dt;
    if (this.perfClock < 6 || this.perfClock % 3 > dt) return;
    if (this.game.loop.actualFps >= LOW_FPS) return;
    lowFx = true;
    for (const o of this.fxObjects) {
      this.tweens.killTweensOf(o);
      o.destroy();
    }
    this.fxObjects = [];
  }

  /** Un relámpago cada tanto (en las salas con ventanas) y su trueno después. */
  private updateLightning(dt: number): void {
    if (!this.amb.lightning) return;
    this.lightningIn -= dt;
    if (this.lightningIn > 0) return;
    this.lightningIn = this.rng.range(22, 55);
    const power = this.rng.range(0.5, 1);
    this.tweens.chain({
      targets: this.flashRect,
      tweens: [
        { alpha: 0.3 * power, duration: 60 },
        { alpha: 0.04, duration: 90 },
        { alpha: 0.2 * power, duration: 60 },
        { alpha: 0, duration: 520, ease: "Sine.easeOut" },
      ],
    });
    this.time.delayedCall(this.rng.range(500, 2200), () => sound.thunder(power));
  }

  /** Pisadas de Paula al ritmo real de su zancada (dos por ciclo). */
  private footsteps(): void {
    const w = this.paula.walker;
    const n = Math.floor(w.distance / (w.gait.strideCycleM / 2));
    if (n !== this.stepCount) {
      this.stepCount = n;
      if (w.moving) sound.step(0.6 + 0.4 * Math.min(1, w.speedRatio()), this.amb.floor);
    }
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
