/** Resolución lógica: todo (mundo e interfaz) se diseña aquí y Phaser lo escala con FIT. */
export const GAME_W = 1920;
export const GAME_H = 1080;

/**
 * Píxeles que se dibujan de verdad: nunca más de los que enseña la pantalla.
 * La tablet (1280×800) muestra el juego a 1280×720, así que se dibuja a 2/3
 * (2,25 veces menos trabajo para su gráfica, y se ve igual de nítido). La
 * cámara de cada escena amplía/reduce para que todo siga en 1920×1080.
 * `?escala=1` fuerza el tamaño completo (para grabar vídeos).
 */
/**
 * Los cuadros llevan una franja pintada de más arriba y abajo (BLEED px). En
 * pantallas más altas que 16:9 (la tablet es 16:10) se ve y llena la pantalla
 * sin franjas negras; en 16:9 o en el móvil queda fuera. Todo lo anotado sigue
 * en 0..1080: la franja es solo decorado.
 */
export const BLEED = 60;
export const VIEW_H = viewHeight();
/** Primera fila visible (negativa si se ve la franja de arriba). */
export const VIEW_TOP = (GAME_H - VIEW_H) / 2;
export const RENDER_W = renderWidth();
export const RENDER_H = Math.round((RENDER_W * VIEW_H) / GAME_W);
export const RENDER_SCALE = RENDER_W / GAME_W;

function viewHeight(): number {
  if (typeof window === "undefined") return GAME_H;
  // Las grabaciones de vídeo (?escala=) son siempre 16:9.
  if (new URLSearchParams(location.search).get("escala")) return GAME_H;
  const tall = (GAME_W * window.innerHeight) / Math.max(1, window.innerWidth);
  return Math.round(Math.min(GAME_H + 2 * BLEED, Math.max(GAME_H, tall)));
}

function renderWidth(): number {
  if (typeof window === "undefined") return GAME_W;
  const forced = Number(new URLSearchParams(location.search).get("escala"));
  if (forced > 0) return Math.round(GAME_W * Math.min(1, forced));
  const shown = Math.min(window.innerWidth, (window.innerHeight * GAME_W) / VIEW_H) * (window.devicePixelRatio || 1);
  if (!(shown > 0)) return GAME_W;
  return Math.round(clamp(shown, GAME_W / 2, GAME_W));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Pone un cuadro (con o sin franja) cubriendo todo lo visible: su parte 16:9 en 0..1080. */
export function placeBackdrop(img: { width: number; height: number; setOrigin(x: number, y?: number): unknown; setPosition(x: number, y: number): unknown; setDisplaySize(w: number, h: number): unknown }): void {
  const bleedPx = Math.max(0, (img.height - (img.width * GAME_H) / GAME_W) / 2);
  const k = GAME_W / img.width;
  img.setOrigin(0, 0);
  img.setPosition(0, -bleedPx * k);
  img.setDisplaySize(GAME_W, img.height * k);
}

/** Encaja la cámara de una escena en el tamaño lógico (llamar al principio de create). */
export function fitCamera(scene: { cameras: { main: { setZoom(z: number): { centerOn(x: number, y: number): unknown } } } }): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_W / 2, GAME_H / 2);
}

export const FONT_TITLE = "Cinzel";
export const FONT_UI = "Inter";
export const FONT_NOTE = "Mono";

export const COLORS = {
  ink: 0x050608,
  panel: 0x0d1215,
  panelEdge: 0xd8b47a,
  copper: 0xe0b169,
  ivory: 0xf1e8d8,
  muted: 0x9aa09a,
  ghost: 0x9fd8ff,
} as const;

export const CSS = {
  copper: "#e0b169",
  ivory: "#f1e8d8",
  muted: "#aab0a8",
  ink: "#050608",
} as const;

/**
 * Pantalla de móvil (lado corto < 500 px CSS, p. ej. 852×393): todo se ve a
 * ~0,36 de su tamaño, así que los textos de lectura se agrandan un 20 %.
 * En la tablet (el destino principal) no cambia nada.
 */
export const PHONE = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 500;
/** Tamaño de letra de un texto de lectura, ajustado a la pantalla. */
export const fs = (px: number): string => `${Math.round(px * (PHONE ? 1.2 : 1))}px`;

/** Depuración: ?debug=1 muestra suelo caminable, horizonte y varas de medir. */
export const DEBUG = typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");
