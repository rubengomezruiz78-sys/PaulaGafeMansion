/**
 * Calidad adaptable para gráficas modestas (la de la tablet de Paula).
 *
 * Se mide en cada sala: si no llega a ~36 fotogramas por segundo, se pasa a
 * modo ligero (sin grano ni niebla delantera, menos lluvia). Si aun así no
 * llega a ~28, se dibuja con menos píxeles (un 20 % menos cada vez, hasta la
 * mitad). Lo que se decide se guarda: la próxima vez empieza ya así, sin tirones.
 */
import Phaser from "phaser";
import { currentRenderScale, GAME_H, GAME_W, setRenderScale, VIEW_H } from "../config";

const KEY = "paula-gafe-calidad";
/** Escala mínima respecto a la lógica (960 px de ancho). */
const MIN_SCALE = 0.5;
/** Nunca menos del 80 % de los píxeles de la pantalla. */
export const MIN_OF_SCREEN = 0.8;

interface Stored {
  lowFx?: boolean;
  /** Fracción de la resolución de pantalla a la que se dibuja (1 = toda). */
  scale?: number;
}

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

function write(patch: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
  } catch {
    /* solo esta sesión */
  }
}

/** ¿Empezar ya en modo ligero? (lo decidió una partida anterior). */
export const startLowFx = (): boolean => read().lowFx === true;

export function rememberLowFx(): void {
  write({ lowFx: true });
}

/**
 * Dibuja con menos píxeles: el 80 % de los de la pantalla, una sola vez (más
 * abajo se veía borroso y Paula se perdía en la penumbra). Devuelve false si ya
 * está así. Todo sigue en coordenadas lógicas: solo cambia el lienzo y el zoom.
 */
export function shrinkResolution(game: Phaser.Game): boolean {
  const prev = read().scale ?? 1;
  const s = currentRenderScale();
  if (prev <= MIN_OF_SCREEN + 0.01 || s <= MIN_SCALE + 0.01) return false;
  const next = Math.max(MIN_SCALE, (s * MIN_OF_SCREEN) / prev);
  const w = Math.round(GAME_W * next);
  const h = Math.round((w * VIEW_H) / GAME_W);
  setRenderScale(w / GAME_W);
  game.scale.setGameSize(w, h);
  for (const scene of game.scene.getScenes(true)) {
    scene.cameras.main.setSize(w, h).setZoom(w / GAME_W).centerOn(GAME_W / 2, GAME_H / 2);
  }
  // Se guarda como fracción del ancho de pantalla, para la próxima vez.
  write({ scale: MIN_OF_SCREEN });
  return true;
}
