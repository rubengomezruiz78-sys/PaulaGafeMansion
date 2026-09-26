/**
 * Sonda de luz: una copia diminuta del cuadro de la sala para saber de qué
 * color es la luz en cada sitio. Un personaje junto a la chimenea se tiñe de
 * naranja; junto a la ventana, de azul luna; en un rincón oscuro, se apaga.
 * Es lo que más ayuda a que no parezcan recortables pegados encima.
 */
import type { Pt } from "../core/perspective";

const PW = 96;

export class LightProbe {
  private readonly data: Float32Array;
  private readonly ph: number;
  /** Factor para que el color medio de la sala equivalga a la luz ambiente global. */
  private gain = 1;

  /**
   * @param source imagen del cuadro (con su franja si la tiene)
   * @param top    coordenada lógica (y) donde empieza la imagen (negativa si hay franja)
   * @param width  ancho lógico (1920)
   * @param height alto lógico que ocupa la imagen
   */
  constructor(source: CanvasImageSource & { width: number; height: number }, private readonly top: number,
    private readonly width: number, private readonly height: number) {
    this.ph = Math.max(1, Math.round((PW * source.height) / source.width));
    const canvas = document.createElement("canvas");
    canvas.width = PW;
    canvas.height = this.ph;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, PW, this.ph);
    const px = ctx.getImageData(0, 0, PW, this.ph).data;
    this.data = new Float32Array(PW * this.ph * 3);
    // A lineal (la luz se suma en lineal, no en sRGB).
    for (let i = 0; i < PW * this.ph; i += 1) {
      for (let c = 0; c < 3; c += 1) this.data[i * 3 + c] = Math.pow(px[i * 4 + c] / 255, 2.2);
    }
  }

  /** Ajusta la ganancia para que la media de la sala dé `targetLuma` (la luz ambiente de la sala). */
  calibrate(targetLuma: number): void {
    const acc = [0, 0, 0];
    for (let i = 0; i < PW * this.ph; i += 1) for (let c = 0; c < 3; c += 1) acc[c] += this.data[i * 3 + c];
    const n = PW * this.ph;
    const avg = toSrgb(acc[0] / n) * 0.2126 + toSrgb(acc[1] / n) * 0.7152 + toSrgb(acc[2] / n) * 0.0722;
    this.gain = targetLuma / Math.max(1e-4, avg);
  }

  /** Color medio (lineal, ya con ganancia) en una caja de la escena lógica. */
  sample(center: Pt, w: number, h: number, out: [number, number, number]): [number, number, number] {
    const x0 = Math.max(0, Math.floor(((center.x - w / 2) / this.width) * PW));
    const x1 = Math.min(PW - 1, Math.ceil(((center.x + w / 2) / this.width) * PW));
    const y0 = Math.max(0, Math.floor(((center.y - h / 2 - this.top) / this.height) * this.ph));
    const y1 = Math.min(this.ph - 1, Math.ceil(((center.y + h / 2 - this.top) / this.height) * this.ph));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const i = (y * PW + x) * 3;
        r += this.data[i];
        g += this.data[i + 1];
        b += this.data[i + 2];
        n += 1;
      }
    }
    n = Math.max(1, n);
    // Media en lineal (así una vela pequeña pesa lo que debe) y de vuelta a sRGB, como la luz del shader.
    out[0] = Math.min(1.6, toSrgb(r / n) * this.gain);
    out[1] = Math.min(1.6, toSrgb(g / n) * this.gain);
    out[2] = Math.min(1.6, toSrgb(b / n) * this.gain);
    return out;
  }
}

const toSrgb = (v: number) => Math.pow(Math.max(0, v), 1 / 2.2);
