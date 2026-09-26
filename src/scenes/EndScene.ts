import Phaser from "phaser";
import { sound } from "../audio/sound";
import { CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W, fitCamera } from "../config";
import { NPCS } from "../content/npcs";
import { pushBackHandler } from "../platform";
import { setModal } from "../ui/modal";
import { makeButton } from "../ui/widgets";

/**
 * Final: la campana suena trece veces, amanece y por fin se celebra la fiesta
 * de cumpleaños de Inés en el salón de baile (con todo lo que Paula preparó).
 * Pasan los nombres de todos los de la casa y luego se puede seguir explorando.
 */
export class EndScene extends Phaser.Scene {
  constructor() {
    super("end");
  }

  /** La ilustración de la fiesta solo se carga al llegar aquí (no ocupa memoria antes). */
  preload(): void {
    if (!this.textures.exists("fiesta")) this.load.image("fiesta", "world/fiesta.webp");
  }

  create(): void {
    fitCamera(this);
    this.closing = false;
    setModal(this, "end", true);
    const party = this.add.image(GAME_W / 2, GAME_H / 2, this.textures.exists("fiesta") ? "fiesta" : "cover")
      .setDisplaySize(GAME_W, GAME_H).setAlpha(0);
    const base = party.scaleX;
    // La cámara se acerca muy despacio a la pista, como en un cuento.
    this.tweens.add({ targets: party, alpha: 1, duration: 2500 });
    this.tweens.add({ targets: party, scaleX: base * 1.07, scaleY: party.scaleY * 1.07, y: GAME_H / 2 + 20, duration: 24000, ease: "Sine.easeInOut" });
    const dawn = this.add.rectangle(0, 0, GAME_W, GAME_H, 0xffc98a, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: dawn, alpha: 0.1, duration: 6000, delay: 1500, yoyo: true, hold: 4000 });
    this.addFireflies();

    // Franja oscura abajo: los textos no tapan las caras de la fiesta.
    const band = this.add.graphics().setAlpha(0);
    for (let i = 0; i < 30; i += 1) band.fillStyle(0x020304, 0.05).fillRect(0, GAME_H - 470 + i * 12, GAME_W, 470 - i * 12);
    this.tweens.add({ targets: band, alpha: 1, duration: 1800, delay: 1200 });

    const fin = this.add.text(GAME_W / 2, GAME_H - 405, "¡Feliz cumpleaños, Inés!", {
      fontFamily: FONT_TITLE, fontSize: "76px", color: CSS.copper, shadow: { offsetX: 0, offsetY: 5, color: "#000", blur: 22, fill: true },
    }).setOrigin(0.5).setAlpha(0);
    const lines = this.add.text(GAME_W / 2, GAME_H - 340, "La campana sonó trece veces, Inés recordó su nombre y, por fin, la casa celebró su fiesta.", {
      fontFamily: FONT_UI, fontSize: "34px", color: CSS.ivory, align: "center", wordWrap: { width: 1500 },
      shadow: { offsetX: 0, offsetY: 3, color: "#000", blur: 12, fill: true },
    }).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: fin, alpha: 1, duration: 1800, delay: 1400 });
    this.tweens.add({ targets: lines, alpha: 1, duration: 1800, delay: 2600 });

    // Trece campanadas suaves… y luego el vals.
    for (let i = 0; i < 13; i += 1) this.time.delayedCall(1500 + i * 700, () => sound.play(i === 12 ? "solved" : "note"));
    [0, 2, 4, 2, 4, 2, 0, 2, 4, 5, 4].forEach((n, i) => this.time.delayedCall(11200 + i * 520, () => sound.piano(n)));

    const cast = ["Paula", "Gafe", ...NPCS.map((n) => n.name)].join("  ·  ");
    const credits = this.add.text(GAME_W / 2, GAME_H - 272, `Con: ${cast}`, {
      fontFamily: FONT_UI, fontSize: "21px", color: CSS.muted, align: "center", wordWrap: { width: 1760 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setAlpha(0);
    const dedication = this.add.text(GAME_W / 2 - 180, GAME_H - 140, "Una aventura hecha para Paula.", {
      fontFamily: FONT_TITLE, fontSize: "34px", color: CSS.copper,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: credits, alpha: 1, duration: 1800, delay: 5000 });
    this.tweens.add({ targets: dedication, alpha: 1, duration: 1800, delay: 6200 });

    const again = makeButton(this, GAME_W - 560 - 40, GAME_H - 104, 560, 84, "Seguir explorando la casa", () => this.close(), {
      fontSize: 32, fill: 0x1d3a2a, edge: 0x8fd6a0, radius: 26,
    });
    again.container.setAlpha(0);
    this.tweens.add({ targets: again.container, alpha: 1, duration: 800, delay: 7500 });
    this.cameras.main.fadeIn(1200, 255, 244, 220);
    // «Atrás» en el final vuelve a la casa (no cierra el juego de golpe).
    const release = pushBackHandler(() => {
      this.close();
      return true;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, release);
  }

  /** Luciérnagas de los farolillos flotando por la fiesta. */
  private addFireflies(): void {
    for (let i = 0; i < 22; i += 1) {
      const x = Phaser.Math.Between(80, GAME_W - 80);
      const y = Phaser.Math.Between(120, GAME_H - 420);
      const f = this.add.image(x, y, "halo").setTint(0xe8ff9a).setBlendMode(Phaser.BlendModes.ADD).setScale(Phaser.Math.FloatBetween(0.04, 0.07)).setAlpha(0);
      this.tweens.add({
        targets: f, x: x + Phaser.Math.Between(-90, 90), y: y + Phaser.Math.Between(-70, 50), alpha: { from: 0, to: Phaser.Math.FloatBetween(0.5, 0.9) },
        duration: Phaser.Math.Between(3000, 6000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(1500, 6000), ease: "Sine.easeInOut",
      });
    }
  }

  private closing = false;

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      setModal(this, "end", false);
      this.scene.stop();
    });
  }
}
