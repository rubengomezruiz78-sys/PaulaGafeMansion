/** Resolución lógica: todo (mundo e interfaz) se diseña aquí y Phaser lo escala con FIT. */
export const GAME_W = 1920;
export const GAME_H = 1080;

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
