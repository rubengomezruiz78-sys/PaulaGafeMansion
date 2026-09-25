/**
 * Grabación de un vídeo de demostración (solo en desarrollo).
 *
 * Juega una partida guionizada a 30 fps exactos de tiempo de juego y manda
 * cada fotograma (1280×720, como la tablet) a `tools/video_server.py`. El
 * sonido se apunta mientras tanto y al final se genera sin tiempo real, así
 * que queda perfectamente sincronizado. Los toques se ven como un círculo.
 */
import Phaser from "phaser";
import { audioBufferToWav, renderTimeline, sound } from "./audio/sound";
import { worldSim } from "./game/world";
import { session } from "./game/session";
import { ZONES, polyPx, type PropDef } from "./content/zones";

type Any = Record<string, any>;

export interface DemoApi {
  step(seconds: number): void;
  world(): Any;
  ui(): Any;
  puzzle(): Any;
  tapPointFor(prop: PropDef): { x: number; y: number };
}

const FPS = 30;

export function makeDemoRecorder(game: Phaser.Game, api: DemoApi) {
  const url = "http://127.0.0.1:8765";
  const shot = document.createElement("canvas");
  shot.width = 1280;
  shot.height = 720;
  const cx = shot.getContext("2d")!;
  let n = 0;
  const inflight = new Set<Promise<void>>();
  const log: string[] = [];
  /** Fotogramas ya codificados, a la espera de mandarse en un solo envío. */
  let batch: string[] = [];
  let batchStart = 0;

  function send(): void {
    if (!batch.length) return;
    const body = JSON.stringify({ start: batchStart, frames: batch });
    batch = [];
    const p = fetch(`${url}/frames`, { method: "POST", body }).then(() => undefined, () => undefined);
    inflight.add(p);
    void p.then(() => inflight.delete(p));
  }

  /**
   * Un fotograma: avanza 1/30 s de juego, lo copia y lo codifica al momento
   * (síncrono). Se mandan de 30 en 30: con el panel del navegador oculto,
   * cada espera asíncrona cuesta mucho, así que se hacen las menos posibles.
   */
  async function frame(): Promise<void> {
    api.step(1 / FPS);
    cx.drawImage(game.canvas, 0, 0, shot.width, shot.height);
    if (!batch.length) batchStart = n;
    batch.push(shot.toDataURL("image/jpeg", 0.88).slice("data:image/jpeg;base64,".length));
    n += 1;
    if (batch.length >= 30) {
      send();
      if (inflight.size >= 3) await Promise.race(inflight);
      else await Promise.resolve();
    }
  }

  async function wait(seconds: number): Promise<void> {
    for (let i = 0; i < Math.round(seconds * FPS); i += 1) await frame();
  }

  async function until(cond: () => boolean, maxSeconds: number): Promise<boolean> {
    for (let i = 0; i < maxSeconds * FPS; i += 1) {
      if (cond()) return true;
      await frame();
    }
    return cond();
  }

  /** Círculo de «dedo» donde se toca (en la capa de interfaz, por encima de todo). */
  function ripple(x: number, y: number): void {
    const top = game.scene.getScenes(true).slice(-1)[0] as Phaser.Scene;
    const c = top.add.circle(x, y, 34, 0xffffff, 0.35).setStrokeStyle(5, 0xffffff, 0.9).setDepth(99999);
    top.tweens.add({ targets: c, scale: 1.8, alpha: 0, duration: 450, ease: "Cubic.easeOut", onComplete: () => c.destroy() });
  }

  async function touch(x: number, y: number, then: () => void): Promise<void> {
    ripple(x, y);
    await wait(0.2);
    then();
  }

  const ui = () => api.ui();

  /** Lee el diálogo abierto a ritmo de lectura (se para si hay que elegir). */
  async function read(maxLines = 40): Promise<void> {
    for (let i = 0; i < maxLines; i += 1) {
      if (!ui().panel || ui().choiceBox) return;
      await until(() => !ui().panel || ui().choiceBox || ui().shown >= ui().fullText.length, 8);
      if (!ui().panel || ui().choiceBox) return;
      await wait(Math.min(3.4, 1.0 + ui().fullText.length * 0.03));
      ripple(1500, 960);
      ui().advance();
      await wait(0.12);
    }
  }

  async function choose(id: string): Promise<void> {
    await until(() => !!ui().choiceBox, 6);
    await wait(1.4);
    const i = (ui().choices as { id: string }[]).findIndex((c) => c.id === id);
    const n = ui().choices.length;
    // Botones de opción: de abajo arriba sobre el panel (como en UIScene).
    ripple(1330, 752 - (n - i) * 92 + 14 + 39);
    await wait(0.2);
    ui().pick(id);
    await read();
  }

  async function talk(npc: string): Promise<boolean> {
    const rt = api.world().npcs.find((x: Any) => x.def.id === npc && !x.gone);
    if (!rt) {
      log.push(`no está ${npc}`);
      return false;
    }
    const r = rt.actor.hitRect();
    await touch(r.centerX, r.centerY - r.height * 0.15, () => api.world().onTap({ x: r.centerX, y: r.centerY - r.height * 0.15 }));
    const ok = await until(() => !!ui().panel, 15);
    if (!ok) log.push(`no se habló con ${npc}`);
    await read();
    return ok;
  }

  async function prop(id: string): Promise<boolean> {
    const zone = (ZONES as Any)[api.world().zoneDef.id];
    const def = zone.props.find((p: PropDef) => p.id === id) as PropDef;
    const pt = api.tapPointFor(def);
    await touch(pt.x, pt.y, () => api.world().onTap(pt));
    const ok = await until(() => !!ui().panel, 20);
    if (!ok) log.push(`no se llegó a ${id}`);
    await read();
    return ok;
  }

  async function exit(id: string): Promise<boolean> {
    const w = api.world();
    const e = w.zoneDef.exits.find((x: Any) => x.id === id);
    const pts = polyPx(e.hotspot);
    const pt = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
    w.ready = false;
    await touch(pt.x, pt.y, () => w.onTap(pt));
    const ok = await until(() => api.world().ready && api.world().zoneDef.id === e.to, 25);
    if (!ok) log.push(`no se cruzó ${id}`);
    return ok;
  }

  /** Corte de montaje: aparece en otra sala (con fundido). */
  async function cut(zone: string, caption?: string): Promise<void> {
    const w = api.world();
    w.cameras.main.fadeOut(400, 0, 0, 0);
    await wait(0.5);
    w.ready = false;
    w.scene.restart({ zone });
    await until(() => api.world().ready, 20);
    if (caption) game.events.emit("ui:toast", caption);
  }

  async function walkTo(xN: number, yN: number): Promise<void> {
    const pt = { x: xN * 1920, y: yN * 1080 };
    await touch(pt.x, pt.y, () => api.world().onTap(pt));
    await until(() => !api.world().paula.walker.moving, 12);
  }

  async function typeKeys(keys: string): Promise<void> {
    for (const k of keys) {
      await wait(0.35);
      api.puzzle().press(k);
    }
  }

  async function answer(value: number | string, kind: "number" | "choice"): Promise<void> {
    if (kind === "number") {
      await typeKeys(String(value));
      await wait(0.4);
      api.puzzle().press("OK");
    } else {
      await wait(1.5);
      api.puzzle().choose(value as number);
    }
    await wait(1.8);
  }

  /** Coloca a alguien en una sala, quieto un buen rato (para el guion). */
  function place(npc: string, zone: string): void {
    const n = worldSim.npcs.get(npc);
    if (!n) return;
    n.zone = zone;
    n.route = [];
    n.phase = { kind: "stay", until: session.state.clock + 400 };
  }

  async function run(): Promise<{ frames: number; seconds: number; log: string[] }> {
    n = 0;
    game.loop.sleep(); // solo avanza lo que manda la grabación
    sound.startTimeline(() => n / FPS);

    // 1. Portada.
    await wait(5.5);
    await touch(410, 579, () => (game.scene.getScene("title") as unknown as { start(f: boolean): void }).start(true));
    await until(() => game.scene.isActive("world") && api.world().ready, 20);

    // 2. Introducción (Paula y Gafe explican cómo se juega).
    await until(() => !!ui().panel, 6);
    await read();

    // 3. La carta mojada.
    await prop("carta-mojada");
    await wait(1.2);

    // 4. Don Basilio.
    if (await talk("basilio")) {
      await choose("quien");
      await choose("adios");
    }
    await wait(0.8);

    // 5. El retrato de Aurelia, dos veces: el sello.
    await prop("retrato-aurelia");
    await wait(0.6);
    await prop("retrato-aurelia");
    await wait(1.5);

    // 6. Tocar a Gafe: pista.
    const g = api.world().gafe.hitRect();
    await touch(g.centerX, g.centerY, () => api.world().onTap({ x: g.centerX, y: g.centerY }));
    await until(() => !!ui().panel, 4);
    await read();

    // 7. A la biblioteca.
    place("elvira", "biblioteca");
    place("nicanor", "biblioteca");
    await exit("puerta-biblioteca");
    await wait(2.5);

    // 8. El reloj aritmético con el sello: un fallo, la pista y a resolver.
    await prop("reloj-aritmetico");
    await until(() => game.scene.isActive("puzzle"), 5);
    await wait(2.5);
    await answer(61, "number");
    await answer(64, "number");
    await wait(2.5);
    await answer(63, "number");
    await answer(12, "number");
    await answer(12, "number");
    await until(() => !game.scene.isActive("puzzle"), 6);
    await wait(2.5);

    // 9. Charla entre Elvira y Nicanor (Paula la apunta).
    const w = api.world();
    w.lastChatAt = -Infinity;
    w.chatIn = 0;
    await until(() => !!api.world().chat, 6);
    await until(() => !api.world().chat, 30);
    await wait(2.5);

    // 10. Mochila, cuaderno y mapa.
    await touch(1828, 82, () => game.scene.getScene("ui").scene.launch("bag", { tab: "mochila" }));
    await wait(3.5);
    const bag = () => game.scene.getScene("bag") as unknown as Any;
    await touch(720, 119, () => bag().show("cuaderno"));
    await wait(4.5);
    await touch(1070, 119, () => bag().show("mapa"));
    await wait(4);
    await touch(1685, 119, () => bag().close());
    await wait(1);

    // 11. Arriba, en el dormitorio de Inés.
    place("ines", "dormitorio");
    await cut("dormitorio", "En el piso de arriba…");
    await wait(2);
    if (await talk("ines")) {
      await choose("recuerdos");
      await choose("adios");
    }
    await wait(0.8);

    // 12. La caja de música: la canica azul.
    await prop("caja-musica");
    await until(() => game.scene.isActive("puzzle"), 5);
    await wait(2);
    await answer(48, "number");
    await answer(12, "number");
    await until(() => !game.scene.isActive("puzzle"), 6);
    await wait(2.5);

    // 13. Mucho después: la torre del reloj.
    const s = session.state;
    s.flags["pacto-roto"] = true;
    s.flags["compuertas-abiertas"] = true;
    for (const item of ["foto-ines", "cilindro-cera", "flor-luna"]) if (!s.inventory.includes(item)) s.inventory.push(item);
    s.counters.recuerdos = 4;
    await cut("torre", "Mucho después, en lo alto de la torre…");
    await wait(2.5);
    await prop("esfera-reloj");
    await wait(1.5);
    await prop("campana");
    await until(() => game.scene.isActive("puzzle"), 5);
    await wait(2);
    await answer(65, "number");
    await answer(42, "number");
    await answer(1, "choice");
    await until(() => !game.scene.isActive("puzzle"), 6);

    // 14. El final.
    await until(() => !!ui().panel, 6);
    await read();
    await until(() => game.scene.isActive("end"), 6);
    await wait(12);

    // Sonido: se genera y se manda al final.
    send();
    await Promise.all(inflight);
    const seconds = n / FPS;
    const events = sound.stopTimeline();
    const audio = await renderTimeline(events, seconds);
    await fetch(`${url}/audio`, { method: "POST", body: audioBufferToWav(audio) });
    await fetch(`${url}/log`, { method: "POST", body: log.join("\n") || "sin incidencias" });
    game.loop.wake();
    return { frames: n, seconds, log };
  }

  return { run, progress: () => n };
}
