/**
 * Vida del cuadro de fondo, en un único pase de GPU:
 *  - telas, cortinas, plantas y cosas colgadas se mecen (canal R de la máscara);
 *  - el agua ondea y el aire tiembla sobre llamas y vapor (G, más flojo);
 *  - por los cristales corre la lluvia y entra el relámpago (B);
 * (el canal alfa no sirve: el canvas 2D pierde el color donde alfa es 0).
 *  - ruedas y engranajes giran (uniformes `uSpin`).
 * La máscara se dibuja por sala a partir de las anotaciones de `content/life.ts`.
 */
import Phaser from "phaser";
import type { NPoly, ZoneLife } from "../content/life";

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform sampler2D uMask;
uniform float uTime;
uniform float uFlash;
uniform float uRain;
uniform float uAspect;
uniform vec4 uSpin[4];
/** Fracción del alto del cuadro que es franja de más (arriba y abajo). */
uniform float uBleed;
varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  // Todo se calcula en el cuadro 16:9 (donde están las anotaciones) y al final
  // se vuelve a la imagen con sus franjas.
  float kb = 1.0 - 2.0 * uBleed;
  vec2 uv = vec2(outTexCoord.x, (outTexCoord.y - uBleed) / kb);
  vec4 m = (uv.y < 0.0 || uv.y > 1.0) ? vec4(0.0) : texture2D(uMask, uv);
  float t = uTime;
  vec2 d = vec2(0.0);
  // Telas y plantas: dos ondas lentas cruzadas (nada de vaivén mecánico).
  d.x += m.r * (sin(t * 1.05 + uv.y * 13.0) * 0.6 + sin(t * 2.2 + uv.y * 29.0 + uv.x * 7.0) * 0.4) * 0.0032;
  d.y += m.r * sin(t * 1.6 + uv.x * 21.0) * 0.001;
  // Agua.
  d += m.g * vec2(sin(t * 1.8 + uv.y * 150.0 + uv.x * 18.0), cos(t * 1.4 + uv.x * 130.0 - uv.y * 25.0)) * 0.0016;
  vec2 suv = uv + d;
  for (int i = 0; i < 4; i++) {
    vec4 s = uSpin[i];
    if (s.z > 0.0) {
      vec2 p = (suv - s.xy) * vec2(uAspect, 1.0);
      float r = length(p);
      if (r < s.z) {
        float a = s.w * smoothstep(s.z, s.z * 0.8, r);
        float c = cos(a);
        float sn = sin(a);
        p = vec2(c * p.x - sn * p.y, sn * p.x + c * p.y);
        suv = s.xy + p / vec2(uAspect, 1.0);
      }
    }
  }
  vec4 col = texture2D(uMainSampler, vec2(suv.x, suv.y * kb + uBleed));
  float w = m.b;
  if (w > 0.01) {
    // Lluvia: hilos finos que bajan un poco inclinados, a ritmos distintos.
    float x = uv.x * 260.0 + uv.y * 18.0;
    float id = floor(x);
    float lane = hash(id * 1.37);
    float y = uv.y * (9.0 + lane * 6.0) - t * (5.0 + lane * 5.0) + lane * 40.0;
    float drop = fract(y);
    float streak = smoothstep(0.0, 0.05, drop) * (1.0 - smoothstep(0.05, 0.4, drop));
    streak *= step(0.45, hash(id * 3.11));
    streak *= 1.0 - smoothstep(0.0, 0.45, abs(fract(x) - 0.5));
    col.rgb += w * uRain * streak * vec3(0.30, 0.36, 0.46);
    col.rgb += w * uFlash * vec3(0.85, 0.92, 1.0);
  }
  gl_FragColor = col;
}
`;

export class BgLifePipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  mask?: Phaser.Textures.Texture;
  time = 0;
  flash = 0;
  rain = 0.8;
  bleed = 0;
  readonly spins = new Float32Array(16);

  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  onBeforeFlush(): void {
    const gl = this.gl;
    const glTex = this.mask?.source[0]?.glTexture as { webGLTexture?: WebGLTexture } | undefined;
    if (glTex?.webGLTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, glTex.webGLTexture);
    }
    // Volver a la unidad 0 y olvidar la caché: si no, Phaser pintaría el
    // fondo con la máscara o la máscara en otros objetos.
    gl.activeTexture(gl.TEXTURE0);
    this.activeTextures.length = 0;
    this.set1i("uMask", 1);
    this.set1f("uTime", this.time);
    this.set1f("uFlash", this.flash);
    this.set1f("uRain", this.rain);
    this.set1f("uAspect", 1920 / 1080);
    this.set4fv("uSpin", this.spins);
    this.set1f("uBleed", this.bleed);
  }
}

/** Nombre con el que se registra la tubería. */
export const BG_LIFE = "BgLife";

export function installBgLife(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  if (!renderer.pipelines.has(BG_LIFE)) renderer.pipelines.add(BG_LIFE, new BgLifePipeline(game));
  return true;
}

const MW = 480;
const MH = 270;

function path(ctx: CanvasRenderingContext2D, poly: NPoly): void {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * MW, y * MH) : ctx.moveTo(x * MW, y * MH)));
  ctx.closePath();
}

function bounds(poly: NPoly): [number, number, number, number] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [Math.min(...xs) * MW, Math.min(...ys) * MH, Math.max(...xs) * MW, Math.max(...ys) * MH];
}

/**
 * Máscara de la sala (480×270, se estira sola): cada canal se pinta aparte
 * y luego se combinan en RGBA. Las telas llevan degradado desde el lado sujeto.
 */
export function makeLifeMask(scene: Phaser.Scene, zoneId: string, life: ZoneLife): Phaser.Textures.Texture {
  const key = `lifemask-${zoneId}`;
  if (scene.textures.exists(key)) return scene.textures.get(key);
  const channel = (paint: (ctx: CanvasRenderingContext2D) => void, blur: number): Uint8ClampedArray => {
    const c = document.createElement("canvas");
    c.width = MW;
    c.height = MH;
    const ctx = c.getContext("2d")!;
    ctx.filter = blur ? `blur(${blur}px)` : "none";
    paint(ctx);
    return ctx.getImageData(0, 0, MW, MH).data;
  };
  const sway = channel((ctx) => {
    for (const s of life.sway) {
      const [x0, y0, x1, y1] = bounds(s.poly);
      const g = s.anchor === "top" ? ctx.createLinearGradient(0, y0, 0, y1)
        : s.anchor === "bottom" ? ctx.createLinearGradient(0, y1, 0, y0)
          : s.anchor === "left" ? ctx.createLinearGradient(x0, 0, x1, 0) : ctx.createLinearGradient(x1, 0, x0, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,255,255,${s.amount})`);
      ctx.fillStyle = g;
      path(ctx, s.poly);
      ctx.fill();
    }
  }, 3);
  const solid = (polys: NPoly[], blur: number, alpha = 1) => channel((ctx) => {
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const p of polys) {
      path(ctx, p);
      ctx.fill();
    }
  }, blur);
  const water = solid(life.water, 2);
  const heat = solid(life.heat, 4, 0.8);
  const win = solid(life.windows, 1);

  const tex = scene.textures.createCanvas(key, MW, MH);
  if (!tex) throw new Error("No se pudo crear la máscara de vida");
  const out = tex.getContext().createImageData(MW, MH);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = sway[i + 3];
    out.data[i + 1] = Math.max(water[i + 3], heat[i + 3] * 0.35);
    out.data[i + 2] = win[i + 3];
    out.data[i + 3] = 255;
  }
  tex.getContext().putImageData(out, 0, 0);
  tex.refresh();
  return tex;
}
