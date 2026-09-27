/**
 * Voz de los personajes y respuestas por micrófono.
 *
 * En la tablet usa el motor de voz de Android (voz española sin conexión) y
 * su reconocimiento de voz (pedido sin conexión). En el navegador (pruebas)
 * usa la voz y el reconocimiento del propio navegador.
 *
 * Modos de los diálogos: «texto» (como un libro), «ambos» (texto y voz) o
 * «voz» (solo se oye: para cuando Paula no quiere leer).
 */
import { PROFILES, voiceName } from "../content/voices";

export type VoiceMode = "texto" | "ambos" | "voz";

const PREFS_KEY = "paula-gafe-voz";

interface AndroidTTS {
  isReady(): boolean;
  speak(text: string, pitch: number, rate: number, id: string): void;
  /** Con una voz concreta (desde la 2.2.3). */
  speakWith?(text: string, pitch: number, rate: number, id: string, voice: string): void;
  /** Voces españolas instaladas, separadas por comas (desde la 2.2.3). */
  voices?(): string;
  stop(): void;
}
interface AndroidVoice {
  isAvailable(): boolean;
  startListening(): void;
  cancelListening(): void;
}
type Win = Window & {
  AndroidTTS?: AndroidTTS;
  AndroidVoice?: AndroidVoice;
  __onTtsDone?: (id: string) => void;
  __onAndroidVoiceResult?: (alts: string[]) => void;
  __onAndroidVoiceError?: (code: string) => void;
  __onAndroidVoiceStart?: () => void;
  webkitSpeechRecognition?: new () => BrowserRecognition;
  SpeechRecognition?: new () => BrowserRecognition;
};
interface BrowserRecognition {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

/** Lo que no debe leerse en voz alta (símbolos decorativos). */
function speakable(text: string): string {
  return text
    .replace(/[✦✎✔✓☐☑▸★🐾]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

class VoiceService {
  mode: VoiceMode = "texto";
  mic = false;
  /**
   * La tablet no tiene el español descargado para escuchar sin Internet (el
   * reconocimiento de Google lo rechaza al instante). Se recuerda para no
   * enseñar un micrófono que siempre falla; al tocar «Micro» se vuelve a probar.
   */
  languageMissing = false;
  private readonly w = window as Win;
  private seq = 0;
  private pending = new Map<string, () => void>();
  /** Escucha en curso. Cada una lleva su número: lo que llegue tarde de una anterior se ignora. */
  private listening?: { id: number; resolve: (alts: string[] | null, error?: string) => void };
  private listenSeq = 0;
  private rec?: BrowserRecognition;

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { mode?: VoiceMode; mic?: boolean; sinIdioma?: boolean };
      if (p.mode === "texto" || p.mode === "ambos" || p.mode === "voz") this.mode = p.mode;
      this.mic = p.mic === true;
      this.languageMissing = p.sinIdioma === true;
    } catch {
      /* preferencias por defecto */
    }
    this.w.__onTtsDone = (id) => {
      this.pending.get(id)?.();
      this.pending.delete(id);
    };
    this.w.__onAndroidVoiceResult = (alts) => this.finishListening(this.listening?.id, alts);
    this.w.__onAndroidVoiceError = (code) => this.finishListening(this.listening?.id, null, code);
  }

  private save(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: this.mode, mic: this.mic, sinIdioma: this.languageMissing }));
    } catch {
      /* solo esta sesión */
    }
  }

  setMode(mode: VoiceMode): void {
    this.mode = mode;
    if (mode === "texto") this.stop();
    this.save();
  }

  setMic(on: boolean): void {
    this.mic = on;
    // Encenderlo otra vez es volver a probar (quizá ya se descargó el español).
    if (on) this.languageMissing = false;
    this.save();
  }

  /** ¿Enseñar el botón del micrófono? (encendido, hay reconocimiento y tiene el español). */
  get micUsable(): boolean {
    return this.mic && !this.languageMissing && this.canListen;
  }

  /** ¿Hay voz para leer en alto en este aparato? */
  get canSpeak(): boolean {
    return !!this.w.AndroidTTS || "speechSynthesis" in window;
  }

  /** ¿Hay reconocimiento de voz? */
  get canListen(): boolean {
    if (this.w.AndroidVoice) {
      try {
        return this.w.AndroidVoice.isAvailable();
      } catch {
        return false;
      }
    }
    return !!(this.w.SpeechRecognition ?? this.w.webkitSpeechRecognition);
  }

  private active = 0;
  /** Voces que tiene el aparato (se piden una vez, cuando el motor ya está listo). */
  private installed?: Set<string>;

  private hasVoice(name: string): boolean {
    const tts = this.w.AndroidTTS;
    if (!tts?.voices || !tts.speakWith) return false;
    if (!this.installed) {
      try {
        if (!tts.isReady()) return false;
        this.installed = new Set(tts.voices().split(",").filter(Boolean));
      } catch {
        this.installed = new Set();
      }
    }
    return this.installed.has(name);
  }

  /** ¿Está sonando alguna frase ahora mismo? */
  get talking(): boolean {
    return this.active > 0;
  }

  /** Dice una frase con la voz de `who`. Se resuelve al terminar (o si no hay voz). */
  speak(text: string, who = "narrador"): Promise<void> {
    this.active += 1;
    return this.say(text, who).finally(() => {
      this.active = Math.max(0, this.active - 1);
    });
  }

  private say(text: string, who: string): Promise<void> {
    const clean = speakable(text);
    if (!clean) return Promise.resolve();
    const p = PROFILES[who] ?? PROFILES.narrador;
    // Seguro por si el motor no avisa del final: nunca se queda colgado.
    const safety = 2500 + clean.length * 110;
    if (this.w.AndroidTTS) {
      const id = `u${(this.seq += 1)}`;
      return new Promise((resolve) => {
        const t = window.setTimeout(resolve, safety);
        this.pending.set(id, () => {
          window.clearTimeout(t);
          resolve();
        });
        const tts = this.w.AndroidTTS!;
        const name = voiceName(p.voice);
        // Tono 1 como mucho: más alto, la tablet tarda el doble en empezar a hablar.
        if (this.hasVoice(name)) tts.speakWith!(clean, Math.min(1, p.pitch), p.rate, id, name);
        else tts.speak(clean, Math.min(1, p.pitch), p.rate, id);
      });
    }
    if ("speechSynthesis" in window) {
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "es-ES";
        u.pitch = Math.min(2, p.pitch);
        u.rate = p.rate;
        const es = speechSynthesis.getVoices().find((v) => v.lang.startsWith("es") && v.localService)
          ?? speechSynthesis.getVoices().find((v) => v.lang.startsWith("es"));
        if (es) u.voice = es;
        const t = window.setTimeout(resolve, safety);
        u.onend = u.onerror = () => {
          window.clearTimeout(t);
          resolve();
        };
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      });
    }
    return Promise.resolve();
  }

  /** Calla (y da por terminadas las frases pendientes). */
  stop(): void {
    try {
      this.w.AndroidTTS?.stop();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    } catch {
      /* nada que parar */
    }
    for (const done of this.pending.values()) done();
    this.pending.clear();
  }

  /**
   * Escucha una respuesta. Devuelve las alternativas que ha oído, o null (con
   * el motivo: «no-entendido», «sin-permiso», «no-disponible»…).
   */
  listen(): Promise<{ alts: string[] | null; error?: string }> {
    this.stop();
    this.cancelListening();
    const id = (this.listenSeq += 1);
    return new Promise((resolve) => {
      // El plazo es de ESTA escucha: si ya terminó y empezó otra, no la corta.
      const t = window.setTimeout(() => this.finishListening(id, null, "tiempo"), 12000);
      this.listening = {
        id,
        resolve: (alts, error) => {
          window.clearTimeout(t);
          if (error === "sin-idioma") {
            this.languageMissing = true;
            this.save();
          }
          resolve({ alts, error });
        },
      };
      if (this.w.AndroidVoice) {
        this.w.AndroidVoice.startListening();
        return;
      }
      const Ctor = this.w.SpeechRecognition ?? this.w.webkitSpeechRecognition;
      if (!Ctor) {
        this.finishListening(id, null, "no-disponible");
        return;
      }
      const rec = new Ctor();
      this.rec = rec;
      rec.lang = "es-ES";
      rec.maxAlternatives = 5;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const first = e.results[0];
        const alts: string[] = [];
        for (let i = 0; i < first.length; i += 1) alts.push(first[i].transcript);
        this.finishListening(id, alts);
      };
      rec.onerror = (e) => this.finishListening(id, null, e.error === "not-allowed" ? "sin-permiso" : "no-entendido");
      rec.onend = () => this.finishListening(id, null, "no-entendido");
      rec.start();
    });
  }

  /** Deja de escuchar; quien esperaba la respuesta recibe «cancelado» (nunca se queda colgado). */
  cancelListening(): void {
    const rec = this.rec;
    this.rec = undefined;
    this.finishListening(this.listening?.id, null, "cancelado");
    try {
      this.w.AndroidVoice?.cancelListening();
      rec?.abort();
    } catch {
      /* nada que cancelar */
    }
  }

  private finishListening(id: number | undefined, alts: string[] | null, error?: string): void {
    const l = this.listening;
    if (!l || l.id !== id) return;
    this.listening = undefined;
    l.resolve(alts, error);
  }
}

export const voice = new VoiceService();

/** Mensaje para Paula cuando el micrófono no ha funcionado. */
export function listenErrorText(error?: string): string {
  switch (error) {
    case "sin-permiso": return "El micrófono no tiene permiso. Puedes tocar la respuesta.";
    case "no-disponible": return "Esta tablet no puede escuchar. Toca la respuesta.";
    case "sin-conexion":
    case "sin-idioma": return "Para escucharte sin Internet, un adulto tiene que descargar el español en la tablet. Mientras, toca la respuesta.";
    default: return "No te he entendido. Prueba otra vez o toca la respuesta.";
  }
}
