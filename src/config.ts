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

/** Depuración: ?debug=1 muestra suelo caminable, horizonte y varas de medir. */
export const DEBUG = typeof location !== "undefined" && new URLSearchParams(location.search).has("debug");
