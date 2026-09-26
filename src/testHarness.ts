/**
 * Arnés de pruebas (solo en desarrollo): avanzar el juego fotograma a
 * fotograma de forma determinista, tocar puntos, drenar diálogos y leer el
 * estado. Permite pruebas fiables aunque el navegador no pinte fotogramas.
 */
import Phaser from "phaser";
import { heardFlag } from "./core/chat";
import { apply } from "./core/rules";
import { CHATS } from "./content/chats";
import { solveGame, talkThrough } from "./content/solver";
import { ZONES, polyPx, type PropDef } from "./content/zones";
import { makeDemoRecorder } from "./demoRecorder";
import { session } from "./game/session";

export function installTestHarness(game: Phaser.Game): void {
  let t = 0;
  // Las animaciones (tweens) de Phaser miden el tiempo con Date.now: al
  // avanzar fotogramas a mano, ese reloj también tiene que avanzar. Nunca va
  // hacia atrás respecto al real, así que el juego normal no se ve afectado.
  const realNow = Date.now.bind(Date);
  let virtualNow = realNow();
  Date.now = () => Math.max(realNow(), virtualNow);
  const api = {
    game,
    session,
    world: () => game.scene.getScene("world") as unknown as Record<string, any>,
    ui: () => game.scene.getScene("ui") as unknown as Record<string, any>,
    puzzle: () => game.scene.getScene("puzzle") as unknown as Record<string, any>,
    /** Desde la portada: empieza (fresh) o continúa la partida (espera a la sala). */
    async start(fresh = true) {
      if (game.scene.getScene("world")) (game.scene.getScene("world") as unknown as { ready: boolean }).ready = false;
      (game.scene.getScene("title") as unknown as { start(f: boolean): void }).start(fresh);
      api.step(0.8);
      return api.untilReady();
    },
    /** Captura a resolución completa, enviada a tools/video_server.py (frame n). */
    async snap(n: number) {
      api.step(1 / 60);
      const c = document.createElement("canvas");
      c.width = game.canvas.width;
      c.height = game.canvas.height;
      c.getContext("2d")!.drawImage(game.canvas, 0, 0);
      const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.92));
      if (b) await fetch(`http://127.0.0.1:8765/frame?n=${n}`, { method: "POST", body: b });
      return !!b;
    },
    /** Espera (tiempo real) a que la sala termine de cargar su imagen y montarse. */
    async untilReady(timeoutMs = 8000) {
      const t0 = realNow();
      while (realNow() - t0 < timeoutMs) {
        if (game.scene.isActive("world") && api.world().ready) {
          api.step(0.3);
          return true;
        }
        await new Promise((r) => setTimeout(r, 25));
        api.step(1 / 60);
      }
      return false;
    },
    /** Lleva a Paula a otra sala (como cruzar una puerta, sin caminar). */
    async go(zone: string) {
      // El reinicio se aplica en el siguiente fotograma: hasta entonces la
      // escena vieja seguiría diciendo que está lista.
      api.world().ready = false;
      api.world().scene.restart({ zone });
      return api.untilReady();
    },
    /** Avanza `seconds` de juego a 60 fps. */
    step(seconds: number) {
      t = Math.max(t, game.loop.time);
      virtualNow = Math.max(virtualNow, realNow());
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i += 1) {
        t += 1000 / 60;
        virtualNow += 1000 / 60;
        game.step(t, 1000 / 60);
      }
    },
    tap(x: number, y: number) {
      api.world().onTap({ x, y });
    },
    /** Pasa frases hasta que haya opciones o se cierre; devuelve lo dicho. */
    drain(max = 40) {
      const ui = api.ui();
      const said: string[] = [];
      for (let i = 0; i < max && ui.panel && !ui.choiceBox; i += 1) {
        said.push(`${ui.nameText?.text}: ${ui.fullText}`);
        ui.advance();
        api.step(0.05);
        ui.advance();
        api.step(0.05);
      }
      return [...new Set(said)];
    },
    /** Espera (en tiempo de juego) a que se abra un diálogo. */
    waitDialogue(maxSeconds = 15) {
      const ui = api.ui();
      for (let s = 0; s < maxSeconds && !ui.panel; s += 0.1) api.step(0.1);
      return !!ui.panel;
    },
    /** Resuelve con el teclado el puzzle abierto (respuestas del contenido). */
    solvePuzzle() {
      const p = api.puzzle();
      for (let guard = 0; guard < 12 && game.scene.isActive("puzzle"); guard += 1) {
        const step = p.run.step;
        if (step.kind === "number") {
          for (const ch of String(step.answer)) p.press(ch);
          p.press("OK");
        } else if (step.kind === "choice") p.choose(step.answer);
        else p.solveBoard();
        api.step(1.6);
      }
      return !game.scene.isActive("puzzle");
    },
    /** Un punto dentro del objeto que no tape ningún personaje. */
    tapPointFor(prop: PropDef) {
      const w = api.world();
      const pts = polyPx(prop.hotspot);
      const poly = new Phaser.Geom.Polygon(pts);
      const covered = (x: number, y: number) =>
        w.npcs.some((n: any) => !n.gone && n.actor.hitRect().contains(x, y)) || w.gafe.hitRect().contains(x, y);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const c = { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
      if (poly.contains(c.x, c.y) && !covered(c.x, c.y)) return c;
      for (let i = 1; i < 10; i += 1) {
        for (let j = 1; j < 10; j += 1) {
          const x = x0 + ((x1 - x0) * i) / 10;
          const y = y0 + ((y1 - y0) * j) / 10;
          if (poly.contains(x, y) && !covered(x, y)) return { x, y };
        }
      }
      return c;
    },
    /**
     * Partida completa por la interfaz real siguiendo la ruta del
     * solucionador: toca los objetos (Paula camina hasta ellos), lee los
     * diálogos y resuelve los puzzles con el teclado. Las conversaciones y
     * charlas se aplican directamente (dependen de dónde estén los personajes).
     */
    async autoplay() {
      const plan = solveGame().log;
      const problems: string[] = [];
      let retries = 0;
      if (game.scene.isActive("title")) await api.start(true);
      session.reset();
      session.state.flags["intro-visto"] = true;
      await api.go("vestibulo");
      for (const entry of plan) {
        const m = /^([a-z]+): (examinar|hablar con|oír la charla|cruzar) (.+)$/.exec(entry);
        if (!m) {
          problems.push(`paso desconocido: ${entry}`);
          continue;
        }
        const [, zone, verb, what] = m;
        const s = session.state;
        if (verb === "examinar") {
          if (api.world().zoneDef.id !== zone && !(await api.go(zone))) {
            problems.push(`la sala ${zone} no cargó`);
            continue;
          }
          const prop = (ZONES as Record<string, any>)[zone].props.find((p: PropDef) => p.id === what) as PropDef;
          // Si alguien se cruza (se abre su conversación en vez del objeto),
          // se cierra, se espera a que se aparte y se vuelve a intentar.
          let reached = false;
          for (let attempt = 0; attempt < 5 && !reached; attempt += 1) {
            const ui = api.ui();
            if (ui.panel) ui.close(true);
            api.step(attempt ? 2.5 : 0.1);
            const pt = api.tapPointFor(prop);
            api.tap(pt.x, pt.y);
            reached = api.waitDialogue(25) && ui.nameText?.text === "Paula";
            if (attempt) retries += 1;
          }
          if (!reached) {
            problems.push(`no se llegó a ${zone}/${what}`);
            continue;
          }
          api.drain(60);
          api.step(0.4);
          if (game.scene.isActive("puzzle") && !api.solvePuzzle()) problems.push(`puzzle sin resolver en ${zone}/${what}`);
          api.step(0.3);
          if (!s.examined.includes(what)) {
            const ui = api.ui();
            problems.push(`${zone}/${what} no quedó examinado (panel: ${ui.panel ? ui.nameText?.text : "no"}, opciones: ${!!ui.choiceBox}, modal: ${JSON.stringify(game.registry.get("modalOwners"))})`);
          }
        } else if (verb === "hablar con") {
          const here = s.zone;
          s.zone = zone;
          talkThrough(what, s);
          s.zone = here;
        } else if (verb === "oír la charla") {
          const chat = CHATS.find((c) => c.id === what);
          s.flags[heardFlag(what)] = true;
          apply(chat?.effects, s);
        } else if (verb === "cruzar") {
          const exit = (ZONES as Record<string, any>)[zone].exits.find((e: any) => e.id === what);
          apply(exit?.onUse, s);
          if (!s.visited.includes(exit.to)) s.visited.push(exit.to);
        }
      }
      const ending = api.waitDialogue(5) ? api.drain(40) : [];
      return { final: session.state.flags.final === true, problems, ending, steps: plan.length, retries };
    },
  };
  const demo = {
    /** Graba el vídeo de demostración (ver src/demoRecorder.ts y tools/video_server.py). */
    recordDemo() {
      const rec = makeDemoRecorder(game, api);
      (window as unknown as { __demo: typeof rec }).__demo = rec;
      return rec.run();
    },
    /** Graba el vídeo del ala de la fiesta (demoRecorder.fiesta). */
    recordFiesta() {
      const rec = makeDemoRecorder(game, api);
      return rec.fiesta();
    },
    /** Graba el recorrido por la casa viva (demoRecorder.tour). */
    recordTour() {
      const rec = makeDemoRecorder(game, api);
      (window as unknown as { __demo: typeof rec }).__demo = rec;
      return rec.tour();
    },
  };
  (window as unknown as { __test: typeof api & typeof demo }).__test = Object.assign(api, demo);
}
