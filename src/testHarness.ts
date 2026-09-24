/**
 * Arnés de pruebas (solo en desarrollo): avanzar el juego fotograma a
 * fotograma de forma determinista, tocar puntos, drenar diálogos y leer el
 * estado. Permite pruebas fiables aunque el navegador no pinte fotogramas.
 */
import type Phaser from "phaser";
import { session } from "./game/session";

export function installTestHarness(game: Phaser.Game): void {
  let t = 0;
  const api = {
    game,
    session,
    world: () => game.scene.getScene("world") as unknown as Record<string, any>,
    ui: () => game.scene.getScene("ui") as unknown as Record<string, any>,
    /** Avanza `seconds` de juego a 60 fps. */
    step(seconds: number) {
      t = Math.max(t, game.loop.time);
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i += 1) {
        t += 1000 / 60;
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
  };
  (window as unknown as { __test: typeof api }).__test = api;
}
