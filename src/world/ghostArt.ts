/**
 * Fantasmas dibujados por código (los criados de la casa), en el estilo de los
 * fantasmitas de la portada: cuerpo luminoso con degradado y halo, ojos grandes
 * y oscuros, coloretes y el accesorio de su oficio. Cada uno se genera una vez
 * como textura y se registra con sus métricas reales (estatura en metros).
 */
import Phaser from "phaser";
import { registerSprite } from "../content/sprites";

export type Accessory =
  | "chef" | "tophat" | "bonnet" | "cap" | "glasses" | "monocle" | "keys"
  | "strawhat" | "bowtie" | "lantern" | "basket" | "gloves" | "none";

export type Mood = "smile" | "shy" | "stern" | "surprised" | "sleepy";

export interface GhostArt {
  /** Tono del halo y el cuerpo (0–360). */
  hue: number;
  accessory: Accessory;
  mood: Mood;
  /** Estatura real del fantasma (sin contar lo que flota), en metros. */
  heightM: number;
  /** Proporción ancho/alto del cuerpo (0.6 delgado … 0.85 rechoncho). */
  girth?: number;
}

const W = 360;
const H = 480;
const PAD = 40; // margen para el halo

export function makeGhostTexture(scene: Phaser.Scene, key: string, art: GhostArt): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) throw new Error(`No se pudo crear la textura ${key}`);
  const ctx = tex.getContext();
  draw(ctx, art);
  tex.refresh();
  registerSprite(key, {
    file: "",
    frames: 1,
    frameWidth: W,
    frameHeight: H,
    originX: 0.5,
    originY: (H - PAD + 6) / H,
    refHeightPx: H - 2 * PAD, // de lo alto del sombrero al bajo: la estatura
    realHeightM: art.heightM,
    portrait: { top: 0.1, height: 0.52 },
  });
}

function draw(ctx: CanvasRenderingContext2D, art: GhostArt): void {
  const cx = W / 2;
  const girth = art.girth ?? 0.72;
  const top = PAD + (art.accessory === "tophat" ? 70 : art.accessory === "chef" ? 80 : art.accessory === "strawhat" ? 30 : 12);
  const bottom = H - PAD;
  const r = Math.min(118, ((bottom - top) * girth) / 2);
  const domeY = top + r;
  // Tonos fríos y pálidos (como los fantasmas de la portada): el color de
  // cada criado es solo un matiz.
  const sat = 32;

  // Sábana: cúpula, costados que caen y jirones que se deshacen abajo.
  const body = new Path2D();
  const flare = r * 0.18;
  const hemY = bottom - 70;
  body.moveTo(cx - r - flare, hemY);
  body.bezierCurveTo(cx - r - flare * 0.5, domeY + (hemY - domeY) * 0.45, cx - r, domeY + 12, cx - r, domeY);
  body.arc(cx, domeY, r, Math.PI, 0);
  body.bezierCurveTo(cx + r, domeY + 12, cx + r + flare * 0.5, domeY + (hemY - domeY) * 0.45, cx + r + flare, hemY);
  const strands = 5;
  const span = (2 * (r + flare)) / strands;
  for (let i = 0; i < strands; i += 1) {
    const x0 = cx + r + flare - i * span;
    const tipX = x0 - span * (0.45 + 0.15 * Math.sin(i * 2.3 + art.hue));
    const len = 30 + 36 * Math.abs(Math.sin(i * 1.7 + art.hue * 0.1));
    body.quadraticCurveTo(x0 - span * 0.1, hemY + len * 0.7, tipX, hemY + len);
    body.quadraticCurveTo(x0 - span * 0.9, hemY + len * 0.4, x0 - span, hemY);
  }
  body.closePath();

  // Resplandor exterior.
  ctx.save();
  ctx.filter = "blur(14px)";
  ctx.fillStyle = `hsla(${art.hue} ${sat + 20}% 78% / 0.55)`;
  ctx.fill(body);
  ctx.restore();

  // Cuerpo translúcido: núcleo claro que se apaga hacia los bordes.
  ctx.save();
  ctx.filter = "blur(2.5px)";
  const core = ctx.createRadialGradient(cx, domeY + r * 0.1, r * 0.1, cx, domeY + r * 0.35, r * 1.9);
  core.addColorStop(0, `hsla(${art.hue} ${sat}% 97% / 0.97)`);
  core.addColorStop(0.45, `hsla(${art.hue} ${sat}% 88% / 0.82)`);
  core.addColorStop(1, `hsla(${art.hue} ${sat + 10}% 72% / 0.25)`);
  ctx.fillStyle = core;
  ctx.fill(body);
  ctx.restore();

  // Pliegues de la sábana: vetas algo más oscuras que bajan.
  ctx.save();
  ctx.clip(body);
  ctx.filter = "blur(6px)";
  ctx.strokeStyle = `hsla(${art.hue} ${sat}% 55% / 0.22)`;
  ctx.lineWidth = 9;
  for (const k of [-0.55, -0.15, 0.3, 0.65]) {
    ctx.beginPath();
    ctx.moveTo(cx + k * r * 0.6, domeY + r * 0.5);
    ctx.quadraticCurveTo(cx + k * r * 0.9, domeY + (hemY - domeY) * 0.6, cx + k * r * 1.15, hemY + 20);
    ctx.stroke();
  }
  ctx.restore();

  // Bracitos: jirones borrosos.
  ctx.save();
  ctx.filter = "blur(3px)";
  ctx.fillStyle = `hsla(${art.hue} ${sat}% 86% / 0.6)`;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * (r + flare * 0.2), domeY + r * 0.8, 15, 30, side * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawFace(ctx, cx, domeY + 6, r, art.mood);
  ctx.save();
  ctx.globalAlpha = 0.82;
  drawAccessory(ctx, cx, domeY, r, art);
  ctx.restore();

  // Todo se desvanece hacia abajo: los fantasmas no tienen pies.
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, domeY + r * 0.6, 0, bottom);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(0.7, "rgba(0,0,0,0.45)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  // (todo el lienzo: con destination-in, lo que no se cubre se borra)
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Ojos oscuros y huecos (sin brillos de dibujo animado) y una boca discreta. */
function drawFace(ctx: CanvasRenderingContext2D, cx: number, y: number, r: number, mood: Mood): void {
  const ex = r * 0.3;
  const eyeRy = mood === "sleepy" ? 5 : mood === "surprised" ? 21 : 17;
  ctx.save();
  ctx.filter = "blur(1.6px)";
  ctx.fillStyle = "rgba(18,22,40,0.88)";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * ex, y, 11, eyeRy, s * (mood === "stern" ? 0.25 : 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(18,22,40,0.65)";
  ctx.beginPath();
  if (mood === "surprised") ctx.ellipse(cx, y + 36, 7, 10, 0, 0, Math.PI * 2);
  else if (mood === "shy") ctx.ellipse(cx, y + 30, 5, 3, 0, 0, Math.PI * 2);
  else ctx.ellipse(cx, y + 32, mood === "stern" ? 11 : 9, mood === "smile" ? 5 : 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (mood === "shy") {
    ctx.fillStyle = "rgba(255,150,170,0.18)";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * (ex + 18), y + 20, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAccessory(ctx: CanvasRenderingContext2D, cx: number, domeY: number, r: number, art: GhostArt): void {
  const headTop = domeY - r;
  ctx.save();
  switch (art.accessory) {
    case "chef": {
      ctx.fillStyle = "#fbfbf7";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 3;
      ctx.fillRect(cx - r * 0.55, headTop - 8, r * 1.1, 26);
      for (const [dx, dy, rr] of [[-0.35, -40, 34], [0.35, -40, 34], [0, -62, 40]] as const) {
        ctx.beginPath();
        ctx.arc(cx + dx * r, headTop + dy, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "tophat": {
      // Copa alta con un filo claro para que se distinga en las salas oscuras.
      const crownTop = headTop - 64;
      ctx.fillStyle = "#2a2530";
      ctx.strokeStyle = `hsla(${art.hue} 60% 85% / 0.7)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(cx - r * 0.42, crownTop, r * 0.84, headTop + 12 - crownTop);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, headTop + 12, r * 0.74, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8a2536";
      ctx.fillRect(cx - r * 0.42 + 2, headTop - 8, r * 0.84 - 4, 12);
      break;
    }
    case "bonnet": {
      ctx.fillStyle = "#fffdf8";
      ctx.beginPath();
      ctx.ellipse(cx, headTop + 16, r * 0.62, 26, 0, Math.PI, 0);
      ctx.fill();
      for (let i = -4; i <= 4; i += 1) {
        ctx.beginPath();
        ctx.arc(cx + i * r * 0.14, headTop + 16, 9, 0, Math.PI);
        ctx.fill();
      }
      ctx.fillStyle = "#6d8fd6";
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.6, headTop + 20, 12, 7, 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cap":
      ctx.fillStyle = "#6b4a33";
      ctx.beginPath();
      ctx.ellipse(cx, headTop + 20, r * 0.7, 30, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.35, headTop + 20, r * 0.5, 10, 0, 0, Math.PI);
      ctx.fill();
      break;
    case "strawhat":
      ctx.fillStyle = "#d9b45a";
      ctx.beginPath();
      ctx.ellipse(cx, headTop + 14, r * 1.25, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, headTop + 4, r * 0.55, 34, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#9b4a3a";
      ctx.fillRect(cx - r * 0.55, headTop + 2, r * 1.1, 10);
      break;
    case "glasses":
      ctx.strokeStyle = "#5a4630";
      ctx.lineWidth = 5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + s * r * 0.32, domeY + 4, 26, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.32 + 26, domeY);
      ctx.lineTo(cx + r * 0.32 - 26, domeY);
      ctx.stroke();
      break;
    case "monocle":
      ctx.strokeStyle = "#c9a44a";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx + r * 0.32, domeY + 4, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.32 + 20, domeY + 24);
      ctx.quadraticCurveTo(cx + r * 0.7, domeY + r * 0.9, cx + r * 0.4, domeY + r * 1.2);
      ctx.stroke();
      break;
    case "keys":
      ctx.strokeStyle = "#b48d3c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx + r * 0.95, domeY + r * 1.1, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#b48d3c";
      for (let i = 0; i < 3; i += 1) {
        const kx = cx + r * 0.95 - 14 + i * 14;
        ctx.fillRect(kx, domeY + r * 1.1 + 16, 5, 30);
        ctx.fillRect(kx, domeY + r * 1.1 + 40, 11, 5);
      }
      break;
    case "bowtie":
      ctx.fillStyle = "#b8273b";
      ctx.beginPath();
      ctx.moveTo(cx, domeY + r * 0.62);
      ctx.lineTo(cx - 34, domeY + r * 0.62 - 16);
      ctx.lineTo(cx - 34, domeY + r * 0.62 + 16);
      ctx.closePath();
      ctx.moveTo(cx, domeY + r * 0.62);
      ctx.lineTo(cx + 34, domeY + r * 0.62 - 16);
      ctx.lineTo(cx + 34, domeY + r * 0.62 + 16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, domeY + r * 0.62, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "lantern": {
      const lx = cx + r * 1.05;
      const ly = domeY + r * 0.95;
      const glow = ctx.createRadialGradient(lx, ly + 22, 2, lx, ly + 22, 70);
      glow.addColorStop(0, "rgba(255,210,120,0.9)");
      glow.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 70, ly - 48, 140, 140);
      ctx.strokeStyle = "#3b2d1c";
      ctx.lineWidth = 4;
      ctx.strokeRect(lx - 16, ly + 4, 32, 40);
      ctx.fillStyle = "rgba(255,226,150,0.95)";
      ctx.fillRect(lx - 12, ly + 8, 24, 32);
      ctx.beginPath();
      ctx.moveTo(lx, ly + 4);
      ctx.lineTo(lx, ly - 12);
      ctx.stroke();
      break;
    }
    case "basket": {
      const bx = cx - r * 1.05;
      const by = domeY + r * 1.05;
      ctx.fillStyle = "#a6763e";
      ctx.beginPath();
      ctx.moveTo(bx - 34, by);
      ctx.lineTo(bx + 34, by);
      ctx.lineTo(bx + 26, by + 36);
      ctx.lineTo(bx - 26, by + 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f2efe6";
      ctx.beginPath();
      ctx.ellipse(bx, by, 32, 12, 0, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "gloves":
      ctx.fillStyle = "#fbfbf7";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + s * (r * 1.02), domeY + r * 1.0, 17, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#1d1a20";
      ctx.beginPath();
      ctx.moveTo(cx, domeY + r * 0.62);
      ctx.lineTo(cx - 22, domeY + r * 0.62 - 10);
      ctx.lineTo(cx - 22, domeY + r * 0.62 + 10);
      ctx.closePath();
      ctx.moveTo(cx, domeY + r * 0.62);
      ctx.lineTo(cx + 22, domeY + r * 0.62 - 10);
      ctx.lineTo(cx + 22, domeY + r * 0.62 + 10);
      ctx.closePath();
      ctx.fill();
      break;
    case "none":
      break;
  }
  ctx.restore();
}
