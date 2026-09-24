import raw from "./sprites.generated.json";

/** Métricas de un sprite generado por tools/build_sprites.py. */
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
}

export type SpriteKey = keyof typeof raw;
export const SPRITES = raw as Record<SpriteKey, SpriteMeta>;
export const SPRITE_KEYS = Object.keys(raw) as SpriteKey[];
export const spritePath = (key: SpriteKey) => `world/sprites/${SPRITES[key].file}`;
