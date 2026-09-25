/**
 * Texturas procedurales de la vida de las salas (se crean una vez al arrancar):
 * halo de luz, llamita, polilla, murciélago (2 fotogramas), ratón, bocanada de
 * vapor, niebla (mosaico sin costuras) y grano de película.
 */
import Phaser from "phaser";

function canvas(scene: Phaser.Scene, key: string, w: number, h: number): CanvasRenderingContext2D | null {
  if (scene.textures.exists(key)) return null;
  const tex = scene.textures.createCanvas(key, w, h);
  return tex ? tex.getContext() : null;
}

const refresh = (scene: Phaser.Scene, key: string) => (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();

export function makeLifeTextures(scene: Phaser.Scene): void {
  // Halo: degradado radial limpio (sin rayos), para luces y fantasmas.
  let ctx = canvas(scene, "halo", 256, 256);
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.25, "rgba(255,255,255,0.35)");
    g.addColorStop(0.6, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    refresh(scene, "halo");
  }

  // Llamita de vela: gota con núcleo blanco y borde anaranjado.
  ctx = canvas(scene, "flame", 32, 64);
  if (ctx) {
    const drop = new Path2D();
    drop.moveTo(16, 2);
    drop.bezierCurveTo(24, 22, 28, 40, 16, 60);
    drop.bezierCurveTo(4, 40, 8, 22, 16, 2);
    const g = ctx.createRadialGradient(16, 46, 1, 16, 40, 30);
    g.addColorStop(0, "rgba(255,255,240,1)");
    g.addColorStop(0.35, "rgba(255,220,130,0.95)");
    g.addColorStop(0.75, "rgba(255,140,40,0.6)");
    g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = g;
    ctx.filter = "blur(1.2px)";
    ctx.fill(drop);
    refresh(scene, "flame");
  }

  // Polilla: cuerpo y dos alas claras.
  ctx = canvas(scene, "moth", 24, 16);
  if (ctx) {
    ctx.fillStyle = "rgba(210,190,150,0.9)";
    ctx.beginPath();
    ctx.ellipse(7, 8, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(17, 8, 7, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(80,60,40,1)";
    ctx.fillRect(11, 4, 2, 9);
    refresh(scene, "moth");
  }

  // Murciélago: dos fotogramas (alas arriba / abajo).
  ctx = canvas(scene, "bat", 128, 48);
  if (ctx) {
    const bat = (ox: number, up: boolean) => {
      ctx!.fillStyle = "rgba(8,8,12,0.95)";
      ctx!.beginPath();
      ctx!.moveTo(ox + 32, 26);
      const wy = up ? 4 : 40;
      ctx!.quadraticCurveTo(ox + 18, wy, ox + 2, up ? 10 : 30);
      ctx!.quadraticCurveTo(ox + 12, 26, ox + 20, 24);
      ctx!.quadraticCurveTo(ox + 26, 30, ox + 32, 30);
      ctx!.quadraticCurveTo(ox + 38, 30, ox + 44, 24);
      ctx!.quadraticCurveTo(ox + 52, 26, ox + 62, up ? 10 : 30);
      ctx!.quadraticCurveTo(ox + 46, wy, ox + 32, 26);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.ellipse(ox + 32, 26, 4, 6, 0, 0, Math.PI * 2);
      ctx!.fill();
    };
    bat(0, true);
    bat(64, false);
    const t = scene.textures.get("bat");
    t.add(0, 0, 0, 0, 64, 48);
    t.add(1, 0, 64, 0, 64, 48);
    refresh(scene, "bat");
  }

  // Ratón: silueta con cola.
  ctx = canvas(scene, "mouse", 48, 20);
  if (ctx) {
    ctx.fillStyle = "rgba(20,18,18,0.95)";
    ctx.beginPath();
    ctx.ellipse(28, 12, 12, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(40, 10, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,18,18,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(17, 13);
    ctx.quadraticCurveTo(6, 18, 1, 10);
    ctx.stroke();
    refresh(scene, "mouse");
  }

  // Bocanada de vapor / niebla suelta.
  ctx = canvas(scene, "puff", 128, 128);
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    refresh(scene, "puff");
  }

  // Niebla: nubes suaves que empalman por los lados (mosaico horizontal).
  ctx = canvas(scene, "fog", 1024, 256);
  if (ctx) {
    ctx.filter = "blur(18px)";
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i += 1) {
      const x = rnd() * 1024;
      const y = 60 + rnd() * 170;
      const r = 40 + rnd() * 90;
      for (const dx of [-1024, 0, 1024]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, `rgba(255,255,255,${0.12 + rnd() * 0.18})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
    // Se desvanece hacia arriba: la niebla va pegada al suelo.
    ctx.filter = "none";
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createLinearGradient(0, 0, 0, 256);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.5, "rgba(0,0,0,0.8)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, 1024, 256);
    refresh(scene, "fog");
  }

  // Grano de película: une la foto de Paula y el cuadro pintado.
  ctx = canvas(scene, "grain", 256, 256);
  if (ctx) {
    const img = ctx.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    refresh(scene, "grain");
  }
}
