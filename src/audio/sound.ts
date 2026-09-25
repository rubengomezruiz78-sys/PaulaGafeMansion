/**
 * Sonido procedural con Web Audio: nada se descarga, todo se genera en el
 * momento (lluvia, truenos, goteo, viento, caja de música y efectos).
 * El navegador solo deja sonar audio tras un toque: `unlock()` se llama desde
 * el primer botón de la pantalla de título.
 *
 * Para grabar vídeos del juego, el motor puede apuntar lo que suena en una
 * línea de tiempo (`startTimeline`) y volver a generarlo después, sin tiempo
 * real y perfectamente sincronizado (`renderTimeline`).
 */

export interface Ambience {
  /** 0..1 intensidad de la lluvia que se oye desde dentro. */
  rain: number;
  /** 0..1 goteo (sótanos, aljibe). */
  drip: number;
  /** 0..1 viento (desván, torre). */
  wind: number;
}

export type Sfx = "tap" | "pickup" | "correct" | "wrong" | "solved" | "door" | "note" | "whoosh";

export type TimelineEvent =
  | { t: number; kind: "ambience"; a: Ambience }
  | { t: number; kind: "play"; sfx: Sfx }
  | { t: number; kind: "thunder"; power: number }
  | { t: number; kind: "step"; volume: number; tone: number }
  | { t: number; kind: "music" };

const SETTINGS_KEY = "paula-gafe-ajustes";
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

class SoundEngine {
  private ctx?: BaseAudioContext;
  private offline = false;
  private master?: GainNode;
  private ambBus?: GainNode;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private noise?: AudioBuffer;
  private rainGain?: GainNode;
  private windGain?: GainNode;
  private windFilter?: BiquadFilterNode;
  private dripLevel = 0;
  private timers: number[] = [];
  private musicOn = false;
  private _muted = false;
  private timeline?: TimelineEvent[];
  private clock?: () => number;

  constructor(readSettings = true) {
    if (!readSettings) return;
    try {
      this._muted = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}").muted === true;
    } catch {
      this._muted = false;
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  setMuted(on: boolean): void {
    this._muted = on;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted: on }));
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  /** Crea (o reanuda) el audio; hay que llamarlo dentro de un toque. */
  unlock(): void {
    try {
      if (!this.ctx) this.build();
      if (this.ctx instanceof AudioContext) void this.ctx.resume();
    } catch {
      this.ctx = undefined; // sin Web Audio: el juego sigue en silencio
    }
  }

  /** Al irse la app a segundo plano se para todo; al volver, se reanuda. */
  suspend(on: boolean): void {
    if (!(this.ctx instanceof AudioContext)) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Empieza a apuntar lo que suena, con la hora que dé `clock` (en segundos). */
  startTimeline(clock: () => number): void {
    this.timeline = this.musicOn ? [{ t: 0, kind: "music" }] : [];
    this.clock = clock;
  }

  stopTimeline(): TimelineEvent[] {
    const t = this.timeline ?? [];
    this.timeline = undefined;
    this.clock = undefined;
    return t;
  }

  private mark(e: TimelineEvent): void {
    if (this.timeline && this.clock) this.timeline.push({ ...e, t: this.clock() });
  }

  private build(offlineCtx?: OfflineAudioContext): void {
    let ctx: BaseAudioContext;
    if (offlineCtx) {
      ctx = offlineCtx;
      this.offline = true;
    } else {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 0.9;
    this.master.connect(ctx.destination);
    this.ambBus = this.bus(0.55);
    this.sfxBus = this.bus(0.8);
    this.musicBus = this.bus(0.32);

    // Ruido blanco en bucle: base de la lluvia y el viento.
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;

    // Lluvia: ruido filtrado (se oye «a través de los muros»).
    const rain = this.loopNoise();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 260;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(hp).connect(lp).connect(this.rainGain).connect(this.ambBus);

    // Viento: ruido por un filtro de banda que se mueve despacio.
    const wind = this.loopNoise();
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 420;
    this.windFilter.Q.value = 1.4;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.ambBus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(this.windFilter.frequency);
    lfo.start();

    if (!this.offline) this.schedule(() => this.dripLoop(), 900);
  }

  private bus(level: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = level;
    g.connect(this.master!);
    return g;
  }

  private loopNoise(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    src.loopStart = Math.random();
    src.start(0, Math.random() * 1.5);
    return src;
  }

  private schedule(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
    if (this.timers.length > 64) this.timers.splice(0, this.timers.length - 64);
  }

  /** ¿Se puede sonar ya? (en tiempo real, solo con el audio desbloqueado). */
  private get live(): boolean {
    return !!this.ctx && (this.offline || this.ctx.state === "running");
  }

  setAmbience(a: Ambience, at?: number): void {
    this.mark({ t: 0, kind: "ambience", a });
    if (!this.ctx) return;
    const t = at ?? this.ctx.currentTime;
    this.rainGain?.gain.setTargetAtTime(a.rain * 0.5, t, 1.2);
    this.windGain?.gain.setTargetAtTime(a.wind * 0.35, t, 1.5);
    this.dripLevel = a.drip;
  }

  private dripLoop(): void {
    if (!this.ctx) return;
    if (this.dripLevel > 0 && this.live) this.dripAt(this.ctx.currentTime, this.dripLevel);
    this.schedule(() => this.dripLoop(), this.dripGap(this.dripLevel));
  }

  private dripGap(level: number): number {
    return level > 0 ? 500 + Math.random() * (2600 / Math.max(0.2, level)) : 1500;
  }

  private dripAt(t: number, level: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const f = 900 + Math.random() * 900;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.ambBus!);
    o.start(t);
    o.stop(t + 0.2);
  }

  /** Trueno lejano: ruido grave que retumba y se apaga. */
  thunder(power = 1, at?: number): void {
    this.mark({ t: 0, kind: "thunder", power });
    if (!this.ctx || !this.noise || !this.ambBus) return;
    const t = at ?? this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.35;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + 3.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * power, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.35 * power, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    src.connect(lp).connect(g).connect(this.ambBus);
    src.start(t);
    src.stop(t + 4.5);
  }

  /** Paso: golpecito de ruido filtrado (madera/piedra según el tono). */
  step(volume = 1, tone = 1, at?: number): void {
    this.mark({ t: 0, kind: "step", volume, tone });
    if (!this.ctx || !this.noise || !this.sfxBus) return;
    const t = at ?? this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520 * tone + Math.random() * 120;
    bp.Q.value = 2.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1 * volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.12);
  }

  /** Nota de campanita (caja de música / efectos). */
  private bell(freq: number, at: number, dur: number, level: number, out: AudioNode): void {
    const ctx = this.ctx!;
    for (const [mult, amp] of [[1, 1], [2.01, 0.35], [3.98, 0.12]] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level * amp, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur / mult);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.05);
    }
  }

  play(sfx: Sfx, at?: number): void {
    this.mark({ t: 0, kind: "play", sfx });
    if (!this.live || !this.sfxBus) return;
    const ctx = this.ctx!;
    const t = at ?? ctx.currentTime;
    const out = this.sfxBus;
    switch (sfx) {
      case "tap":
        this.bell(880, t, 0.12, 0.08, out);
        break;
      case "note":
        this.bell(PENTA[Math.floor(Math.random() * 5)] * 2, t, 0.4, 0.05, out);
        break;
      case "pickup":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, t + i * 0.08, 0.8, 0.14, out));
        break;
      case "correct":
        this.bell(659.25, t, 0.6, 0.16, out);
        this.bell(987.77, t + 0.11, 0.9, 0.16, out);
        break;
      case "solved":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.bell(f, t + i * 0.11, 1.4, 0.16, out));
        break;
      case "wrong": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(150, t + 0.25);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.35);
        break;
      }
      case "door":
      case "whoosh": {
        if (!this.noise) return;
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 0.8;
        bp.frequency.setValueAtTime(sfx === "door" ? 300 : 700, t);
        bp.frequency.exponentialRampToValueAtTime(sfx === "door" ? 120 : 1800, t + 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(sfx === "door" ? 0.35 : 0.12, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        src.connect(bp).connect(g).connect(out);
        src.start(t);
        src.stop(t + 0.7);
        break;
      }
    }
  }

  /** Una frase de la caja de música: el motivo de la casa con variaciones. */
  private phraseAt(t: number): void {
    const base = [0, 2, 3]; // do, mi, sol dentro de la escala
    const notes = [...base, ...base.map((n) => n + (Math.random() < 0.5 ? 1 : 2)), Math.random() < 0.5 ? 5 : 3];
    notes.forEach((n, i) => this.bell(PENTA[n], t + i * 0.42, 2.2, 0.12, this.musicBus!));
  }

  /**
   * Caja de música: el motivo de la casa (do, mi, sol) con variaciones
   * tranquilas y silencios largos, para que acompañe sin cansar.
   */
  startMusic(): void {
    if (this.musicOn) return;
    this.musicOn = true;
    this.mark({ t: 0, kind: "music" });
    if (!this.ctx) return;
    const phrase = () => {
      if (!this.musicOn || !this.ctx || !this.musicBus) return;
      if (this.live) this.phraseAt(this.ctx.currentTime + 0.05);
      this.schedule(phrase, 9000 + Math.random() * 9000);
    };
    this.schedule(phrase, 2500);
  }

  stopMusic(): void {
    this.musicOn = false;
  }

  /** Genera sin tiempo real el sonido de una línea de tiempo (para vídeos). */
  static async renderTimeline(events: TimelineEvent[], duration: number): Promise<AudioBuffer> {
    const rate = 44100;
    const ctx = new OfflineAudioContext(1, Math.ceil(duration * rate), rate);
    const eng = new SoundEngine(false);
    eng.build(ctx);
    const sorted = [...events].sort((a, b) => a.t - b.t);
    let musicFrom = -1;
    // Goteo: nivel vigente en cada instante según los cambios de ambiente.
    const ambChanges = sorted.filter((e): e is Extract<TimelineEvent, { kind: "ambience" }> => e.kind === "ambience");
    const dripAt = (t: number) => {
      let level = 0;
      for (const c of ambChanges) if (c.t <= t) level = c.a.drip;
      return level;
    };
    for (const e of sorted) {
      const t = Math.min(duration, e.t);
      switch (e.kind) {
        case "ambience":
          eng.setAmbience(e.a, t);
          break;
        case "play":
          eng.play(e.sfx, t);
          break;
        case "thunder":
          eng.thunder(e.power, t);
          break;
        case "step":
          eng.step(e.volume, e.tone, t);
          break;
        case "music":
          if (musicFrom < 0) musicFrom = t;
          break;
      }
    }
    for (let t = 0.9; t < duration; ) {
      const level = dripAt(t);
      if (level > 0) eng.dripAt(t, level);
      t += eng.dripGap(level) / 1000;
    }
    if (musicFrom >= 0) for (let t = musicFrom + 2.5; t < duration - 3; t += 9 + Math.random() * 9) eng.phraseAt(t);
    return ctx.startRendering();
  }
}

export const sound = new SoundEngine();
export const renderTimeline = SoundEngine.renderTimeline;

/** WAV de 16 bits a partir de un AudioBuffer (para montar el vídeo). */
export function audioBufferToWav(buf: AudioBuffer): Blob {
  const data = buf.getChannelData(0);
  const bytes = 44 + data.length * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buf.sampleRate, true);
  view.setUint32(28, buf.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i += 1) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  return new Blob([view], { type: "audio/wav" });
}
