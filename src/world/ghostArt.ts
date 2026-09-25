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
  const r = Math.min(120, ((bottom - top) * girth) / 2);
  const domeY = top + r;
  const light = `hsl(${art.hue} 70% 94%)`;
  const mid = `hsla(${art.hue} 55% 82% / 0.78)`;
  const tail = `hsla(${art.hue} 60% 72% / 0.18)`;

  // Cuerpo: cúpula, costados que se abren un poco y bajo ondulado.
  const body = new Path2D();
  const flare = r * 0.14;
  const hemY = bottom - 26;
  body.moveTo(cx - r - flare, hemY);
  body.bezierCurveTo(cx - r - flare * 0.6, domeY + (hemY - domeY) * 0.4, cx - r, domeY + 10, cx - r, domeY);
  body.arc(cx, domeY, r, Math.PI, 0);
  body.bezierCurveTo(cx + r, domeY + 10, cx + r + flare * 0.6, domeY + (hemY - domeY) * 0.4, cx + r + flare, hemY);
  const waves = 4;
  const span = (2 * (r + flare)) / waves;
  for (let i = 0; i < waves; i += 1) {
    const x0 = cx + r + flare - i * span;
    const x1 = x0 - span;
    body.quadraticCurveTo(x0 - span * 0.25, hemY + 24, x0 - span * 0.5, hemY + 4);
    body.quadraticCurveTo(x1 + span * 0.25, hemY - 16, x1, hemY);
  }
  body.closePath();

  ctx.save();
  ctx.shadowColor = `hsla(${art.hue} 90% 80% / 0.85)`;
  ctx.shadowBlur = 34;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, tail);
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.restore();
  // Brillo interior suave arriba a la izquierda.
  const shine = ctx.createRadialGradient(cx - r * 0.35, domeY - r * 0.4, 4, cx - r * 0.35, domeY - r * 0.4, r * 0.8);
  shine.addColorStop(0, "rgba(255,255,255,0.55)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fill(body);

  // Bracitos.
  ctx.fillStyle = mid;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * (r + flare * 0.3), domeY + r * 0.75, 16, 26, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFace(ctx, cx, domeY + 4, r, art.mood);
  drawAccessory(ctx, cx, domeY, r, art);
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, y: number, r: number, mood: Mood): void {
  const ex = r * 0.32;
  const eyeRy = mood === "sleepy" ? 6 : mood === "surprised" ? 24 : 20;
  ctx.fillStyle = "#1b1f33";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * ex, y, 14, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood !== "sleepy") {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * ex - 4, y - eyeRy * 0.4, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (mood === "stern") {
    ctx.strokeStyle = "#1b1f33";
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * (ex - 16), y - 30);
      ctx.lineTo(cx + s * (ex + 14), y - 24);
      ctx.stroke();
    }
  }
  // Coloretes.
  ctx.fillStyle = mood === "shy" ? "rgba(255,120,150,0.5)" : "rgba(255,140,160,0.32)";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * (ex + 20), y + 22, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boca.
  ctx.strokeStyle = "#1b1f33";
  ctx.fillStyle = "#1b1f33";
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (mood === "surprised") {
    ctx.ellipse(cx, y + 36, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === "stern") {
    ctx.moveTo(cx - 12, y + 34);
    ctx.lineTo(cx + 12, y + 34);
    ctx.stroke();
  } else {
    ctx.arc(cx, y + 26, mood === "shy" ? 8 : 13, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
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
