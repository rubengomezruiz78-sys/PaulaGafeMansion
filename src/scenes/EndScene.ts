import Phaser from "phaser";
import { sound } from "../audio/sound";
import { CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W } from "../config";
import { NPCS } from "../content/npcs";
import { setModal } from "../ui/modal";
import { makeButton } from "../ui/widgets";

/**
 * Final: amanece sobre la portada, suenan las trece campanadas (suaves) y
 * pasan los nombres de todos los de la casa. Luego se puede seguir explorando.
 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  create(): void {
    setModal(this, "end", true);
    const cover = this.add.image(0, 0, "cover").setOrigin(0).setDisplaySize(GAME_W, GAME_H).setAlpha(0);
    const dawn = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffc98a, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    const veil = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070a, 0.55).setOrigin(0);
    this.tweens.add({ targets: cover, alpha: 1, duration: 2500 });
    this.tweens.add({ targets: dawn, alpha: 0.18, duration: 6000, delay: 1500 });
    this.tweens.add({ targets: veil, alpha: 0.35, duration: 6000, delay: 1500 });

    const fin = this.add.text(GAME_W / 2, 250, "Fin", {
      fontFamily: FONT_TITLE, fontSize: "150px", color: CSS.copper, shadow: { offsetX: 0, offsetY: 6, color: "#000", blur: 26, fill: true },
    }).setOrigin(0.5).setAlpha(0);
    const lines = this.add.text(GAME_W / 2, 420, "Inés recordó su nombre, la lluvia paró\ny en la mansión Valcárcel, por fin, amaneció.", {
      fontFamily: FONT_UI, fontSize: "44px", color: CSS.ivory, align: "center", lineSpacing: 14,
      shadow: { offsetX: 0, offsetY: 3, color: "#000", blur: 12, fill: true },
    }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: fin, alpha: 1, duration: 1800, delay: 1200 });
    this.tweens.add({ targets: lines, alpha: 1, duration: 1800, delay: 2600 });

    // Trece campanadas suaves.
    for (let i = 0; i < 13; i += 1) this.time.delayedCall(1500 + i * 700, () => sound.play(i === 12 ? "solved" : "note"));

    // Banda oscura detrás de los nombres para que se lean sobre el cuadro.
    const band = this.add.graphics().setAlpha(0);
    band.fillStyle(0x020304, 0.55).fillRoundedRect(180, 675, GAME_W - 360, 250, 30);
    this.tweens.add({ targets: band, alpha: 1, duration: 1800, delay: 4800 });
    const cast = ["Paula", "Gafe", ...NPCS.map((n) => n.name)].join("  ·  ");
    const credits = this.add.text(GAME_W / 2, 700, `Con: ${cast}`, {
      fontFamily: FONT_UI, fontSize: "30px", color: CSS.muted, align: "center", wordWrap: { width: 1500 }, lineSpacing: 8,
    }).setOrigin(0.5, 0).setAlpha(0);
    const dedication = this.add.text(GAME_W / 2, 870, "Una aventura hecha para Paula.", {
      fontFamily: FONT_TITLE, fontSize: "40px", color: CSS.copper,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: credits, alpha: 1, duration: 1800, delay: 5000 });
    this.tweens.add({ targets: dedication, alpha: 1, duration: 1800, delay: 6200 });

    const again = makeButton(this, (GAME_W - 560) / 2, GAME_H - 150, 560, 104, "Seguir explorando la casa", () => this.close(), {
      fontSize: 36, fill: 0x1d3a2a, edge: 0x8fd6a0, radius: 28,
    });
    again.container.setAlpha(0);
    this.tweens.add({ targets: again.container, alpha: 1, duration: 800, delay: 7500 });
    this.cameras.main.fadeIn(1200, 255, 244, 220);
  }

  private close(): void {
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      setModal(this, "end", false);
      this.scene.stop();
    });
  }
}
