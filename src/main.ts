import Phaser from "phaser";
import { GAME_H, GAME_W } from "./config";
import { installBackBridge, loadFonts } from "./platform";
import { BootScene } from "./scenes/BootScene";
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
    scene: [BootScene, WorldScene, UIScene],
  });
  // Pausar al irse a segundo plano (ahorra batería y evita saltos de tiempo).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) game.loop.sleep();
    else game.loop.wake();
  });
  (window as unknown as { __game?: Phaser.Game }).__game = game;
}

void start();
