import raw from "./sprites.generated.json";

/** Métricas de un sprite (de tools/build_sprites.py o generado por código). */
export interface SpriteMeta {
  file: string;
  frames: number;
  frameWidth: number;
  frameHeight: number;
  /** Ancla en los pies (fracción del fotograma). */
  originX: number;
  originY: number;
  /** Píxeles del sprite que corresponden a `realHeightM`. */
  refHeightPx: number;
  realHeightM: number;
  /** Encuadre de la cara para el retrato (fracciones de alto): dónde empieza y cuánto ocupa. */
  portrait?: { top: number; height: number };
}

/** Sprites que se cargan de fichero (los genera tools/build_sprites.py). */
export type FileSpriteKey = keyof typeof raw;
/** Cualquier sprite: de fichero o generado por código (fantasmas de la casa). */
export type SpriteKey = string;

const META: Record<string, SpriteMeta> = { ...(raw as Record<FileSpriteKey, SpriteMeta>) };

export const SPRITES: Readonly<Record<string, SpriteMeta>> = META;
export const SPRITE_KEYS = Object.keys(raw) as FileSpriteKey[];
export const spritePath = (key: FileSpriteKey) => `world/sprites/${META[key].file}`;

export function registerSprite(key: string, meta: SpriteMeta): void {
  META[key] = meta;
}

export function hasSprite(key: string): boolean {
  return key in META;
}
