/**
 * La vida de cada sala, anotada a mano sobre cada cuadro (coordenadas 0..1).
 *
 * - `ambient`: luz ambiente que reciben los personajes (medida del color medio
 *   del cuadro: las salas son muy oscuras y una foto sin oscurecer «flota»).
 * - `lights`: velas, lámparas y la luna de las ventanas. Iluminan a los
 *   personajes, parpadean y (si `flame`) llevan su llamita dibujada.
 * - `windows`: cristales por los que corre la lluvia y entra el relámpago.
 * - `shafts`: haces de luz (con polvo flotando).
 * - `sway`: telas, cortinas, plantas y cosas colgadas que se mecen
 *   (`anchor` = el lado sujeto, que no se mueve).
 * - `water`: agua que ondea. `heat`: aire que tiembla (vapor, llamas).
 * - `spin`: ruedas y engranajes que giran (centro, radio en px de 1920).
 * - `twinkle`: zonas con estrellas que titilan.
 * - `critters`: bichos y apariciones de ambiente.
 * - `reflect`: cuánto refleja el suelo (mojado o encerado).
 */
export type NPoint = readonly [number, number];
export type NPoly = readonly NPoint[];

export interface LightDef {
  x: number;
  y: number;
  color: number;
  /** Alcance en px de la escena lógica (1920×1080). */
  radius: number;
  intensity: number;
  /** 0 = fija (luna), 1 = vela nerviosa. */
  flicker: number;
  /** Llamitas a dibujar (puntas de las velas). */
  flames?: NPoint[];
  /** Tamaño del halo visible (0 = sin halo). */
  glow?: number;
}

export type Critter = "moths" | "bats" | "spider" | "mouse" | "fireflies" | "wisps" | "drips" | "steam";

export interface ZoneLife {
  ambient: number;
  fog: { color: number; amount: number };
  lights: LightDef[];
  windows: NPoly[];
  shafts: NPoly[];
  sway: { poly: NPoly; anchor: "top" | "bottom" | "left" | "right"; amount: number }[];
  water: NPoly[];
  heat: NPoly[];
  spin: { x: number; y: number; r: number; speed: number }[];
  twinkle: NPoly[];
  critters: Critter[];
  /** Zona lejana por la que cruzan fantasmitas (wisps). */
  wisps?: NPoly;
  /** Puntos de los que sale vapor. */
  steam?: NPoint[];
  /** Puntos desde los que caen gotas (y su suelo). */
  drips?: { from: NPoint; to: number }[];
  reflect: number;
}

const CANDLE = 0xffa24a;
const LAMP = 0xffb86a;
const MOON = 0x7f9cff;

/** Ventana circular u ovalada como polígono. */
const ring = (cx: number, cy: number, rx: number, ry: number, n = 20): NPoly =>
  Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)] as const);
const rect = (x0: number, y0: number, x1: number, y1: number): NPoly => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export const LIFE: Record<string, ZoneLife> = {
  vestibulo: {
    ambient: 0x5e6272,
    fog: { color: 0x3a4660, amount: 0.22 },
    lights: [
      { x: 0.425, y: 0.28, color: MOON, radius: 900, intensity: 0.55, flicker: 0, glow: 0 },
      { x: 0.03, y: 0.44, color: CANDLE, radius: 520, intensity: 0.8, flicker: 1, flames: [[0.017, 0.425], [0.03, 0.445], [0.047, 0.44]], glow: 140 },
      { x: 0.222, y: 0.49, color: CANDLE, radius: 480, intensity: 0.75, flicker: 1, flames: [[0.213, 0.484], [0.222, 0.479], [0.232, 0.484]], glow: 120 },
      { x: 0.7, y: 0.46, color: CANDLE, radius: 420, intensity: 0.7, flicker: 1, flames: [[0.695, 0.457], [0.703, 0.452]], glow: 100 },
    ],
    windows: [[[0.385, 0.42], [0.385, 0.16], [0.4, 0.11], [0.425, 0.085], [0.45, 0.11], [0.466, 0.16], [0.468, 0.42]]],
    shafts: [[[0.39, 0.22], [0.465, 0.22], [0.6, 0.8], [0.35, 0.8]]],
    sway: [],
    water: [],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["moths", "bats", "wisps", "mouse"],
    wisps: rect(0.4, 0.33, 0.56, 0.56),
    reflect: 0.22,
  },
  biblioteca: {
    ambient: 0x585660,
    fog: { color: 0x3a3a48, amount: 0.14 },
    lights: [
      { x: 0.178, y: 0.33, color: MOON, radius: 760, intensity: 0.5, flicker: 0 },
      { x: 0.085, y: 0.57, color: CANDLE, radius: 560, intensity: 0.9, flicker: 1, flames: [[0.064, 0.548], [0.106, 0.593]], glow: 150 },
    ],
    windows: [[[0.145, 0.52], [0.145, 0.2], [0.16, 0.155], [0.178, 0.128], [0.195, 0.155], [0.21, 0.2], [0.21, 0.52]]],
    shafts: [[[0.15, 0.36], [0.21, 0.36], [0.38, 0.8], [0.2, 0.82]]],
    sway: [
      { poly: rect(0.105, 0.05, 0.14, 0.2), anchor: "top", amount: 0.9 },
      { poly: rect(0.33, 0.04, 0.37, 0.31), anchor: "top", amount: 0.7 },
      { poly: rect(0.12, 0.6, 0.2, 0.66), anchor: "left", amount: 0.5 },
      { poly: rect(0.87, 0.0, 1.0, 0.2), anchor: "top", amount: 0.4 },
      { poly: rect(0.575, 0.52, 0.625, 0.6), anchor: "top", amount: 0.5 },
    ],
    water: [],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["moths", "spider", "mouse"],
    reflect: 0.05,
  },
  musica: {
    ambient: 0x5a6078,
    fog: { color: 0x34405a, amount: 0.16 },
    lights: [
      { x: 0.29, y: 0.3, color: MOON, radius: 950, intensity: 0.6, flicker: 0 },
      { x: 0.955, y: 0.35, color: CANDLE, radius: 460, intensity: 0.75, flicker: 1, flames: [[0.955, 0.334]], glow: 110 },
      { x: 0.79, y: 0.42, color: LAMP, radius: 420, intensity: 0.45, flicker: 0.5, glow: 0 },
    ],
    windows: [[[0.225, 0.57], [0.225, 0.13], [0.25, 0.06], [0.29, 0.03], [0.33, 0.06], [0.355, 0.13], [0.35, 0.57]]],
    shafts: [[[0.23, 0.32], [0.35, 0.32], [0.52, 0.92], [0.22, 0.92]]],
    sway: [
      { poly: rect(0.0, 0.0, 0.18, 0.3), anchor: "top", amount: 0.8 },
      { poly: rect(0.45, 0.0, 0.66, 0.18), anchor: "top", amount: 0.35 },
      { poly: rect(0.21, 0.52, 0.29, 0.6), anchor: "bottom", amount: 0.5 },
      { poly: rect(0.42, 0.47, 0.49, 0.54), anchor: "bottom", amount: 0.4 },
      { poly: rect(0.43, 0.88, 0.55, 0.97), anchor: "bottom", amount: 0.5 },
      { poly: rect(0.72, 0.45, 0.76, 0.64), anchor: "top", amount: 0.8 },
    ],
    water: [rect(0.08, 0.3, 0.17, 0.74)],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["moths", "wisps", "bats"],
    wisps: rect(0.62, 0.3, 0.82, 0.62),
    reflect: 0.08,
  },
  invernadero: {
    ambient: 0x5a6e66,
    fog: { color: 0x3c5a50, amount: 0.3 },
    lights: [
      { x: 0.62, y: 0.15, color: MOON, radius: 1100, intensity: 0.55, flicker: 0, glow: 160 },
      { x: 0.545, y: 0.24, color: LAMP, radius: 620, intensity: 0.85, flicker: 0.6, glow: 170 },
      { x: 0.12, y: 0.45, color: 0xcfe8ff, radius: 380, intensity: 0.35, flicker: 0.2, glow: 0 },
      { x: 0.93, y: 0.43, color: 0xcfe8ff, radius: 360, intensity: 0.3, flicker: 0.2, glow: 0 },
    ],
    windows: [
      [[0.22, 0.0], [0.78, 0.0], [0.76, 0.3], [0.24, 0.3]],
      rect(0.32, 0.28, 0.5, 0.55),
      rect(0.62, 0.3, 0.8, 0.6),
    ],
    shafts: [[[0.55, 0.05], [0.68, 0.05], [0.72, 0.85], [0.42, 0.85]]],
    sway: [
      { poly: rect(0.515, 0.08, 0.575, 0.3), anchor: "top", amount: 0.7 },
      { poly: rect(0.04, 0.28, 0.26, 0.7), anchor: "bottom", amount: 1 },
      { poly: rect(0.84, 0.3, 1.0, 0.62), anchor: "bottom", amount: 1 },
      { poly: rect(0.64, 0.46, 0.82, 0.66), anchor: "bottom", amount: 0.7 },
      { poly: rect(0.27, 0.1, 0.4, 0.5), anchor: "bottom", amount: 0.45 },
    ],
    water: [[[0.36, 0.735], [0.6, 0.735], [0.6, 0.8], [0.36, 0.8]], rect(0.45, 0.6, 0.54, 0.77)],
    heat: [],
    spin: [],
    twinkle: [rect(0.22, 0.0, 0.78, 0.25)],
    critters: ["fireflies", "moths"],
    reflect: 0.1,
  },
  cocina: {
    ambient: 0x60605e,
    fog: { color: 0x3a3f46, amount: 0.18 },
    lights: [
      { x: 0.715, y: 0.28, color: MOON, radius: 760, intensity: 0.5, flicker: 0 },
      { x: 0.675, y: 0.16, color: LAMP, radius: 640, intensity: 0.85, flicker: 0.7, flames: [[0.675, 0.155]], glow: 150 },
    ],
    windows: [[[0.665, 0.45], [0.665, 0.2], [0.69, 0.12], [0.715, 0.1], [0.74, 0.12], [0.765, 0.2], [0.765, 0.45]]],
    shafts: [[[0.67, 0.32], [0.76, 0.32], [0.76, 0.86], [0.5, 0.86]]],
    sway: [
      { poly: rect(0.65, 0.03, 0.7, 0.2), anchor: "top", amount: 0.7 },
      { poly: rect(0.795, 0.02, 0.835, 0.25), anchor: "top", amount: 0.6 },
      { poly: rect(0.875, 0.04, 0.925, 0.26), anchor: "top", amount: 0.6 },
      { poly: rect(0.88, 0.64, 0.99, 0.86), anchor: "top", amount: 0.45 },
    ],
    water: [],
    heat: [rect(0.3, 0.02, 0.45, 0.4)],
    spin: [],
    twinkle: [],
    critters: ["mouse", "moths", "steam", "drips"],
    steam: [[0.33, 0.22], [0.41, 0.12], [0.2, 0.05], [0.37, 0.33]],
    drips: [{ from: [0.41, 0.45], to: 0.5 }],
    reflect: 0.12,
  },
  archivo: {
    ambient: 0x625a52,
    fog: { color: 0x3e3a36, amount: 0.3 },
    lights: [
      { x: 0.217, y: 0.37, color: CANDLE, radius: 520, intensity: 0.85, flicker: 1, flames: [[0.207, 0.368], [0.217, 0.358], [0.228, 0.354]], glow: 130 },
      { x: 0.32, y: 0.48, color: CANDLE, radius: 600, intensity: 0.95, flicker: 1, flames: [[0.268, 0.44], [0.283, 0.468], [0.297, 0.492], [0.325, 0.515], [0.333, 0.478], [0.343, 0.448], [0.358, 0.448], [0.365, 0.5]], glow: 170 },
      { x: 0.41, y: 0.41, color: CANDLE, radius: 400, intensity: 0.6, flicker: 1, flames: [[0.4, 0.406], [0.41, 0.405], [0.42, 0.4]], glow: 90 },
      { x: 0.575, y: 0.44, color: CANDLE, radius: 360, intensity: 0.5, flicker: 1, flames: [[0.567, 0.437], [0.583, 0.437]], glow: 70 },
      { x: 0.86, y: 0.39, color: CANDLE, radius: 520, intensity: 0.85, flicker: 1, flames: [[0.829, 0.39], [0.867, 0.39], [0.88, 0.38]], glow: 120 },
      { x: 0.922, y: 0.57, color: CANDLE, radius: 460, intensity: 0.75, flicker: 1, flames: [[0.912, 0.55], [0.922, 0.565], [0.935, 0.575]], glow: 110 },
    ],
    windows: [],
    shafts: [],
    sway: [
      { poly: rect(0.42, 0.02, 0.48, 0.2), anchor: "top", amount: 0.6 },
      { poly: rect(0.04, 0.53, 0.1, 0.58), anchor: "left", amount: 0.4 },
    ],
    water: [rect(0.55, 0.85, 0.78, 0.95)],
    heat: [rect(0.26, 0.36, 0.37, 0.47)],
    spin: [],
    twinkle: [],
    critters: ["spider", "mouse", "drips", "wisps"],
    wisps: rect(0.6, 0.3, 0.8, 0.62),
    drips: [{ from: [0.66, 0.0], to: 0.9 }, { from: [0.72, 0.0], to: 0.88 }],
    reflect: 0.1,
  },
  tuneles: {
    ambient: 0x5c5e58,
    fog: { color: 0x3a4a48, amount: 0.38 },
    lights: [
      { x: 0.045, y: 0.36, color: LAMP, radius: 560, intensity: 0.85, flicker: 0.8, flames: [[0.045, 0.355]], glow: 150 },
      { x: 0.372, y: 0.38, color: LAMP, radius: 520, intensity: 0.8, flicker: 0.8, flames: [[0.372, 0.375]], glow: 130 },
      { x: 0.637, y: 0.415, color: LAMP, radius: 440, intensity: 0.7, flicker: 0.8, flames: [[0.637, 0.412]], glow: 100 },
      { x: 0.86, y: 0.43, color: LAMP, radius: 320, intensity: 0.5, flicker: 0.8, glow: 70 },
      { x: 0.83, y: 0.3, color: MOON, radius: 500, intensity: 0.5, flicker: 0 },
    ],
    windows: [],
    shafts: [[[0.815, 0.14], [0.848, 0.14], [0.875, 0.57], [0.785, 0.57]]],
    sway: [],
    water: [[[0.0, 0.75], [0.1, 0.7], [0.3, 0.68], [0.4, 0.66], [0.65, 0.63], [0.85, 0.6], [0.88, 0.62], [0.7, 0.72], [0.55, 0.85], [0.45, 1.0], [0.0, 1.0]]],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["bats", "drips", "mouse"],
    drips: [{ from: [0.83, 0.15], to: 0.6 }, { from: [0.25, 0.0], to: 0.75 }, { from: [0.55, 0.0], to: 0.7 }],
    reflect: 0.2,
  },
  galeria: {
    ambient: 0x5c5650,
    fog: { color: 0x3a3a44, amount: 0.15 },
    lights: [
      { x: 0.718, y: 0.36, color: MOON, radius: 700, intensity: 0.45, flicker: 0 },
      { x: 0.268, y: 0.51, color: LAMP, radius: 720, intensity: 1.0, flicker: 0.6, glow: 210 },
      { x: 0.53, y: 0.45, color: CANDLE, radius: 380, intensity: 0.6, flicker: 1, flames: [[0.524, 0.447], [0.534, 0.443]], glow: 80 },
      { x: 0.843, y: 0.37, color: CANDLE, radius: 460, intensity: 0.75, flicker: 1, flames: [[0.843, 0.347]], glow: 110 },
      { x: 0.776, y: 0.44, color: CANDLE, radius: 300, intensity: 0.5, flicker: 1, flames: [[0.776, 0.437]], glow: 60 },
      { x: 0.886, y: 0.62, color: CANDLE, radius: 480, intensity: 0.85, flicker: 1, flames: [[0.886, 0.608]], glow: 120 },
    ],
    windows: [[[0.67, 0.49], [0.67, 0.3], [0.69, 0.26], [0.715, 0.24], [0.74, 0.26], [0.765, 0.3], [0.765, 0.49]]],
    shafts: [],
    sway: [
      { poly: rect(0.635, 0.22, 0.672, 0.5), anchor: "top", amount: 0.7 },
      { poly: rect(0.763, 0.22, 0.795, 0.5), anchor: "top", amount: 0.7 },
      { poly: rect(0.58, 0.0, 0.68, 0.17), anchor: "top", amount: 0.4 },
      { poly: rect(0.35, 0.0, 0.4, 0.15), anchor: "top", amount: 0.6 },
    ],
    water: [],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["moths", "wisps", "spider"],
    wisps: rect(0.6, 0.42, 0.8, 0.6),
    reflect: 0.2,
  },
  dormitorio: {
    ambient: 0x625a58,
    fog: { color: 0x3c3a4a, amount: 0.12 },
    lights: [
      { x: 0.335, y: 0.25, color: MOON, radius: 850, intensity: 0.55, flicker: 0 },
      { x: 0.81, y: 0.385, color: LAMP, radius: 760, intensity: 1.0, flicker: 0.4, glow: 190 },
      { x: 0.78, y: 0.3, color: LAMP, radius: 360, intensity: 0.4, flicker: 0.2, glow: 80 },
    ],
    windows: [[[0.295, 0.4], [0.295, 0.14], [0.31, 0.1], [0.335, 0.08], [0.36, 0.1], [0.375, 0.14], [0.375, 0.4]]],
    shafts: [[[0.3, 0.32], [0.372, 0.32], [0.52, 0.76], [0.28, 0.76]]],
    sway: [
      { poly: rect(0.24, 0.0, 0.3, 0.45), anchor: "top", amount: 0.8 },
      { poly: rect(0.39, 0.02, 0.45, 0.48), anchor: "top", amount: 0.8 },
      { poly: rect(0.0, 0.05, 0.14, 0.5), anchor: "top", amount: 0.6 },
      { poly: rect(0.13, 0.37, 0.3, 0.7), anchor: "bottom", amount: 0.25 },
    ],
    water: [],
    heat: [],
    spin: [],
    twinkle: [rect(0.77, 0.06, 0.97, 0.31)],
    critters: ["moths"],
    reflect: 0.06,
  },
  desvan: {
    ambient: 0x585e70,
    fog: { color: 0x36405a, amount: 0.25 },
    lights: [
      { x: 0.465, y: 0.365, color: MOON, radius: 950, intensity: 0.65, flicker: 0, glow: 150 },
      { x: 0.9, y: 0.655, color: LAMP, radius: 560, intensity: 0.85, flicker: 0.8, flames: [[0.9, 0.652]], glow: 130 },
    ],
    windows: [ring(0.465, 0.365, 0.063, 0.112)],
    shafts: [[[0.43, 0.32], [0.5, 0.32], [0.58, 0.82], [0.36, 0.82]]],
    sway: [
      { poly: rect(0.12, 0.1, 0.24, 0.72), anchor: "top", amount: 1 },
      { poly: rect(0.33, 0.48, 0.4, 0.62), anchor: "top", amount: 0.6 },
      { poly: rect(0.7, 0.26, 0.77, 0.58), anchor: "top", amount: 1 },
      { poly: rect(0.89, 0.09, 0.96, 0.45), anchor: "top", amount: 1 },
      { poly: rect(0.53, 0.45, 0.56, 0.6), anchor: "top", amount: 0.6 },
      { poly: rect(0.03, 0.17, 0.12, 0.55), anchor: "top", amount: 0.5 },
      { poly: rect(0.55, 0.35, 0.6, 0.45), anchor: "top", amount: 0.5 },
    ],
    water: [],
    heat: [],
    spin: [],
    twinkle: [],
    critters: ["bats", "spider", "mouse", "wisps"],
    wisps: rect(0.38, 0.4, 0.62, 0.62),
    reflect: 0.04,
  },
  observatorio: {
    ambient: 0x565e70,
    fog: { color: 0x2e3850, amount: 0.12 },
    lights: [
      { x: 0.565, y: 0.12, color: MOON, radius: 1000, intensity: 0.6, flicker: 0, glow: 140 },
      { x: 0.135, y: 0.48, color: CANDLE, radius: 460, intensity: 0.75, flicker: 1, flames: [[0.134, 0.474]], glow: 110 },
      { x: 0.08, y: 0.69, color: CANDLE, radius: 480, intensity: 0.8, flicker: 1, flames: [[0.08, 0.668]], glow: 110 },
      { x: 0.883, y: 0.55, color: CANDLE, radius: 400, intensity: 0.65, flicker: 1, flames: [[0.883, 0.54]], glow: 90 },
      { x: 0.5, y: 0.455, color: CANDLE, radius: 260, intensity: 0.4, flicker: 1, glow: 60 },
    ],
    windows: [[[0.1, 0.0], [0.9, 0.0], [0.85, 0.3], [0.15, 0.3]], rect(0.21, 0.36, 0.81, 0.57)],
    shafts: [],
    sway: [],
    water: [],
    heat: [],
    spin: [{ x: 0.66, y: 0.42, r: 150, speed: 0.12 }],
    twinkle: [[[0.1, 0.0], [0.9, 0.0], [0.85, 0.3], [0.15, 0.3]]],
    critters: ["moths", "bats"],
    reflect: 0.1,
  },
  torre: {
    ambient: 0x565e66,
    fog: { color: 0x303c4c, amount: 0.2 },
    lights: [
      { x: 0.29, y: 0.33, color: MOON, radius: 1000, intensity: 0.6, flicker: 0 },
      { x: 0.097, y: 0.32, color: CANDLE, radius: 480, intensity: 0.8, flicker: 1, flames: [[0.085, 0.318], [0.097, 0.312], [0.11, 0.318]], glow: 110 },
      { x: 0.872, y: 0.36, color: CANDLE, radius: 420, intensity: 0.7, flicker: 1, flames: [[0.867, 0.362], [0.878, 0.357]], glow: 90 },
      { x: 0.972, y: 0.44, color: CANDLE, radius: 380, intensity: 0.6, flicker: 1, flames: [[0.972, 0.435]], glow: 80 },
      { x: 0.57, y: 0.55, color: LAMP, radius: 380, intensity: 0.55, flicker: 0.5, glow: 90 },
    ],
    windows: [ring(0.29, 0.33, 0.125, 0.222), rect(0.93, 0.22, 0.98, 0.45)],
    shafts: [[[0.2, 0.3], [0.38, 0.3], [0.5, 0.95], [0.12, 0.95]]],
    sway: [
      { poly: rect(0.36, 0.0, 0.375, 0.7), anchor: "top", amount: 0.5 },
      { poly: rect(0.473, 0.0, 0.488, 0.6), anchor: "top", amount: 0.5 },
      { poly: rect(0.745, 0.0, 0.76, 0.8), anchor: "top", amount: 0.5 },
      { poly: rect(0.63, 0.4, 0.8, 0.82), anchor: "top", amount: 0.8 },
    ],
    water: [],
    heat: [],
    spin: [
      { x: 0.472, y: 0.495, r: 88, speed: 0.25 },
      { x: 0.425, y: 0.745, r: 48, speed: -0.45 },
      { x: 0.585, y: 0.47, r: 150, speed: -0.12 },
    ],
    twinkle: [],
    critters: ["bats", "wisps"],
    wisps: rect(0.62, 0.3, 0.9, 0.6),
    reflect: 0.08,
  },
};
