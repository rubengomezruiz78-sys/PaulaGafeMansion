import Phaser from "phaser";
import { GAME_H, GAME_W } from "./config";
import { installBackBridge, loadFonts } from "./platform";
import { BagScene } from "./scenes/BagScene";
import { BootScene } from "./scenes/BootScene";
import { PuzzleScene } from "./scenes/PuzzleScene";
import { TitleScene } from "./scenes/TitleScene";
import { EndScene } from "./scenes/EndScene";
import { sound } from "./audio/sound";
import { session } from "./game/session";
import { UIScene } from "./scenes/UIScene";
import { WorldScene } from "./scenes/WorldScene";

async function start(): Promise<void> {
  await loadFonts();
  installBackBridge();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#050608",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_W,
      height: GAME_H,
    },
    render: { antialias: true, roundPixels: false, powerPreference: "high-performance" },
    input: { activePointers: 2 },
    fps: { target: 60, smoothStep: true },
    scene: [BootScene, TitleScene, WorldScene, UIScene, PuzzleScene, BagScene, EndScene],
  });
  // Pausar al irse a segundo plano (ahorra batería y evita saltos de tiempo).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      // Solo se guarda si ya se está jugando (en la portada no hay nada nuevo).
      if (game.scene.isActive("world")) session.flush();
      game.loop.sleep();
    } else game.loop.wake();
    sound.suspend(document.hidden);
  });
  (window as unknown as { __game?: Phaser.Game }).__game = game;
  if (import.meta.env.DEV) {
    const { installTestHarness } = await import("./testHarness");
    installTestHarness(game);
  }
}

void start();
