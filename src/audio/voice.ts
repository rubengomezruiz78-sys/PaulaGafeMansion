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

export type VoiceMode = "texto" | "ambos" | "voz";

interface Profile {
  pitch: number;
  rate: number;
}

/** Cómo suena cada uno (tono y velocidad sobre la misma voz española). */
const PROFILES: Record<string, Profile> = {
  paula: { pitch: 1.35, rate: 1.02 },
  gafe: { pitch: 1.0, rate: 0.98 },
  narrador: { pitch: 1.0, rate: 0.95 },
  basilio: { pitch: 0.7, rate: 0.9 },
  elvira: { pitch: 1.05, rate: 0.9 },
  tomas: { pitch: 0.78, rate: 0.88 },
  ines: { pitch: 1.5, rate: 0.9 },
  bruma: { pitch: 0.95, rate: 0.88 },
  baltasar: { pitch: 0.85, rate: 1.08 },
  remedios: { pitch: 1.12, rate: 1.06 },
  anselmo: { pitch: 0.8, rate: 0.95 },
  clotilde: { pitch: 1.2, rate: 1.12 },
  pepito: { pitch: 1.6, rate: 1.15 },
  florentina: { pitch: 1.25, rate: 0.92 },
  nicanor: { pitch: 0.92, rate: 1.1 },
  leocadia: { pitch: 0.98, rate: 1.0 },
  serafin: { pitch: 0.85, rate: 0.78 },
  crispulo: { pitch: 1.02, rate: 1.05 },
  tadeo: { pitch: 0.82, rate: 0.95 },
  engracia: { pitch: 1.08, rate: 0.85 },
  gumersindo: { pitch: 0.95, rate: 1.12 },
};

const PREFS_KEY = "paula-gafe-voz";

interface AndroidTTS {
  isReady(): boolean;
  speak(text: string, pitch: number, rate: number, id: string): void;
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
  private readonly w = window as Win;
  private seq = 0;
  private pending = new Map<string, () => void>();
  private listening?: { resolve: (alts: string[] | null, error?: string) => void };
  private rec?: BrowserRecognition;

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as { mode?: VoiceMode; mic?: boolean };
      if (p.mode === "texto" || p.mode === "ambos" || p.mode === "voz") this.mode = p.mode;
      this.mic = p.mic === true;
    } catch {
      /* preferencias por defecto */
    }
    this.w.__onTtsDone = (id) => {
      this.pending.get(id)?.();
      this.pending.delete(id);
    };
    this.w.__onAndroidVoiceResult = (alts) => this.finishListening(alts);
    this.w.__onAndroidVoiceError = (code) => this.finishListening(null, code);
  }

  private save(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: this.mode, mic: this.mic }));
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
    this.save();
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

  /** Dice una frase con la voz de `who`. Se resuelve al terminar (o si no hay voz). */
  speak(text: string, who = "narrador"): Promise<void> {
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
        this.w.AndroidTTS!.speak(clean, p.pitch, p.rate, id);
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
    return new Promise((resolve) => {
      const t = window.setTimeout(() => this.finishListening(null, "tiempo"), 12000);
      this.listening = {
        resolve: (alts, error) => {
          window.clearTimeout(t);
          resolve({ alts, error });
        },
      };
      if (this.w.AndroidVoice) {
        this.w.AndroidVoice.startListening();
        return;
      }
      const Ctor = this.w.SpeechRecognition ?? this.w.webkitSpeechRecognition;
      if (!Ctor) {
        this.finishListening(null, "no-disponible");
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
        this.finishListening(alts);
      };
      rec.onerror = (e) => this.finishListening(null, e.error === "not-allowed" ? "sin-permiso" : "no-entendido");
      rec.onend = () => this.finishListening(null, "no-entendido");
      rec.start();
    });
  }

  cancelListening(): void {
    try {
      this.w.AndroidVoice?.cancelListening();
      this.rec?.abort();
    } catch {
      /* nada que cancelar */
    }
    this.rec = undefined;
  }

  private finishListening(alts: string[] | null, error?: string): void {
    const l = this.listening;
    this.listening = undefined;
    l?.resolve(alts, error);
  }
}

export const voice = new VoiceService();

/** Mensaje para Paula cuando el micrófono no ha funcionado. */
export function listenErrorText(error?: string): string {
  switch (error) {
    case "sin-permiso": return "El micrófono no tiene permiso. Puedes tocar la respuesta.";
    case "no-disponible": return "Esta tablet no puede escuchar. Toca la respuesta.";
    case "sin-conexion": return "Para escuchar sin Internet hay que descargar el español sin conexión. Toca la respuesta.";
    default: return "No te he entendido. Prueba otra vez o toca la respuesta.";
  }
}
