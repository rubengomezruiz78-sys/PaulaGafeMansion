import Phaser from "phaser";
import { sound } from "../audio/sound";
import { voice, type VoiceMode } from "../audio/voice";
import { CSS, FONT_TITLE, FONT_UI, GAME_H, GAME_W, VIEW_H, VIEW_TOP, fitCamera, placeBackdrop } from "../config";
import { session } from "../game/session";
import { worldSim } from "../game/world";
import { pushBackHandler } from "../platform";
import { addScrim, drawPanel, makeButton } from "../ui/widgets";

export const MODE_NAMES: Record<VoiceMode, string> = { texto: "Texto", ambos: "Texto y voz", voz: "Solo voz" };

/**
 * Portada: la ilustración original de Paula y Gafe tal cual, con el título a
 * la izquierda (la zona oscura del cuadro) y botones grandes para el dedo.
 */
export class TitleScene extends Phaser.Scene {
  private releaseBack?: () => void;
  private confirmBox?: Phaser.GameObjects.Container;
  private leaving = false;

  constructor() {
    super("title");
  }

  create(): void {
    fitCamera(this);
    this.leaving = false;
    placeBackdrop(this.add.image(0, 0, "cover"));
    // Velo suave a la izquierda para que el texto se lea sin tapar a Paula ni a Gafe.
    const veil = this.add.graphics();
    for (let i = 0; i < 24; i += 1) veil.fillStyle(0x020304, 0.03).fillRect(0, VIEW_TOP, 1100 - i * 34, VIEW_H);
    this.addMotes();

    const title = this.add.text(130, 150, "Paula & Gafe", {
      fontFamily: FONT_TITLE, fontSize: "124px", color: CSS.copper,
      shadow: { offsetX: 0, offsetY: 6, color: "#000", blur: 24, fill: true },
    });
    const sub = this.add.text(136, 310, "y el misterio de la mansión encantada", {
      fontFamily: FONT_TITLE, fontSize: "46px", color: CSS.ivory, wordWrap: { width: 860 },
      shadow: { offsetX: 0, offsetY: 4, color: "#000", blur: 16, fill: true },
    });
    for (const [i, t] of [title, sub].entries()) {
      t.setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, duration: 1200, delay: 300 + i * 500 });
    }

    const progress = session.hasProgress();
    const y0 = 520;
    const buttons = progress
      ? [
          makeButton(this, 130, y0, 560, 116, "Continuar", () => this.start(false), { fontSize: 46, fill: 0x1d3a2a, edge: 0x8fd6a0, radius: 30 }),
          makeButton(this, 130, y0 + 146, 560, 104, "Nueva partida", () => this.askNewGame(), { fontSize: 38, radius: 30 }),
        ]
      : [makeButton(this, 130, y0, 560, 116, "Empezar", () => this.start(true), { fontSize: 46, fill: 0x1d3a2a, edge: 0x8fd6a0, radius: 30 })];
    const soundLabel = () => (sound.muted ? "🔇  Sonido: no" : "🔊  Sonido: sí");
    const soundBtn = makeButton(this, 130, GAME_H - 150, 290, 90, soundLabel(), () => {
      sound.unlock();
      sound.setMuted(!sound.muted);
      soundBtn.label.setText(soundLabel());
    }, { fontSize: 30, radius: 26 });
    const micLabel = () => (!voice.canListen ? "🎤  Micro: no hay" : voice.mic ? "🎤  Micro: sí" : "🎤  Micro: no");
    const micBtn = makeButton(this, 440, GAME_H - 150, 290, 90, micLabel(), () => {
      if (!voice.canListen) return;
      voice.setMic(!voice.mic);
      micBtn.label.setText(micLabel());
    }, { fontSize: 30, radius: 26 });
    const modes: VoiceMode[] = ["texto", "ambos", "voz"];
    const modeLabel = () => `🗣️  Diálogos: ${MODE_NAMES[voice.mode]}`;
    const modeBtn = makeButton(this, 130, GAME_H - 256, 600, 90, modeLabel(), () => {
      voice.setMode(modes[(modes.indexOf(voice.mode) + 1) % modes.length]);
      modeBtn.label.setText(modeLabel());
      if (voice.mode !== "texto") void voice.speak("¡Hola! Soy Paula. ¿Me oyes bien?", "paula");
    }, { fontSize: 30, radius: 26 });
    for (const [i, b] of [...buttons, modeBtn, soundBtn, micBtn].entries()) {
      b.container.setAlpha(0);
      this.tweens.add({ targets: b.container, alpha: 1, duration: 700, delay: 1100 + i * 150 });
    }

    // En la portada, «atrás» sale del juego (lo gestiona Android).
    this.releaseBack = pushBackHandler(() => {
      if (this.confirmBox) {
        this.closeConfirm();
        return true;
      }
      return false;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseBack?.());
    this.cameras.main.fadeIn(900, 0, 0, 0);
  }

  /** Motas de luz que suben despacio (como polvo en la luz de la luna). */
  private addMotes(): void {
    for (let i = 0; i < 26; i += 1) {
      const x = Phaser.Math.Between(700, GAME_W - 40);
      const y = Phaser.Math.Between(200, GAME_H);
      const m = this.add.image(x, y, "glint").setTint(0xbfe4ff).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.05, 0.12)).setAlpha(0);
      this.tweens.add({
        targets: m, y: y - Phaser.Math.Between(120, 320), x: x + Phaser.Math.Between(-60, 60),
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.25, 0.6) },
        duration: Phaser.Math.Between(5000, 9000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 5000), ease: "Sine.easeInOut",
      });
    }
  }

  private askNewGame(): void {
    if (this.confirmBox) return;
    const scrim = addScrim(this, 0.6);
    const g = this.add.graphics();
    const w = 980;
    const h = 380;
    const x = (GAME_W - w) / 2;
    const y = (GAME_H - h) / 2;
    drawPanel(g, x, y, w, h, 30);
    const text = this.add.text(GAME_W / 2, y + 90, "¿Empezar desde el principio?\nLa partida guardada se perderá.", {
      fontFamily: FONT_UI, fontSize: "38px", color: CSS.ivory, align: "center", lineSpacing: 10,
    }).setOrigin(0.5, 0.5);
    const yes = makeButton(this, x + 70, y + h - 150, 400, 104, "Sí, empezar", () => this.start(true), { fontSize: 36, fill: 0x3a1a16, edge: 0xe07a6a });
    const no = makeButton(this, x + w - 470, y + h - 150, 400, 104, "No", () => this.closeConfirm(), { fontSize: 36 });
    this.confirmBox = this.add.container(0, 0, [scrim, g, text, yes.container, no.container]).setDepth(50);
  }

  private closeConfirm(): void {
    this.confirmBox?.destroy();
    this.confirmBox = undefined;
  }

  private start(fresh: boolean): void {
    if (this.leaving) return;
    this.leaving = true;
    sound.unlock();
    sound.play("whoosh");
    sound.startMusic();
    if (fresh) {
      session.reset();
      worldSim.reset(session.state.clock);
    }
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("world", { zone: session.state.zone });
      this.scene.launch("ui");
    });
  }
}
