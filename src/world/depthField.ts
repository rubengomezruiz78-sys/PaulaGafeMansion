/**
 * Profundidad de la sala (en metros) leída del mapa de profundidad calibrado
 * (tools/depth_maps.py). La usa el sombreado de los personajes para que los
 * muebles pintados los tapen, y aquí, en la CPU, para saber si los pies de
 * alguien quedan detrás de un mueble (entonces su sombra no se pinta encima).
 *
 * El mapa guarda 0,4/Z en 8 bits (cerca = claro) y cubre el cuadro entero,
 * franja incluida.
 */
import type { Pt } from "../core/perspective";

export const DEPTH_NEAR = 0.4;
const SW = 240;

export class DepthField {
  private readonly data: Float32Array;
  private readonly sh: number;

  constructor(source: CanvasImageSource & { width: number; height: number }, readonly top: number, readonly height: number) {
    this.sh = Math.max(1, Math.round((SW * source.height) / source.width));
    const canvas = document.createElement("canvas");
    canvas.width = SW;
    canvas.height = this.sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, SW, this.sh);
    const px = ctx.getImageData(0, 0, SW, this.sh).data;
    this.data = new Float32Array(SW * this.sh);
    for (let i = 0; i < SW * this.sh; i += 1) this.data[i] = px[i * 4] / 255;
  }

  /** Profundidad (m) del cuadro en un punto lógico. */
  z(p: Pt): number {
    const x = Math.min(SW - 1, Math.max(0, Math.round((p.x / 1920) * (SW - 1))));
    const y = Math.min(this.sh - 1, Math.max(0, Math.round(((p.y - this.top) / this.height) * (this.sh - 1))));
    return DEPTH_NEAR / Math.max(this.data[y * SW + x], DEPTH_NEAR / 60);
  }
}

/** Margen (m) antes de que algo del cuadro tape a un personaje a profundidad `z`. */
export const occlusionMargin = (z: number): number => 0.25 + 0.08 * z;
