/**
 * Luz de la sala sobre los personajes (lo que evita que parezcan fotos pegadas).
 *
 * Por fragmento: luz ambiente del cuadro + velas/lámparas/luna/fantasmas con
 * caída suave, algo menos de luz en los pies (el suelo tapa), contraluz en el
 * borde que mira a la luz principal, color ajustado al cuadro (saturación y
 * contraste) y niebla según la distancia. Cada personaje lleva sus propios
 * parámetros (`lightParams`), así que el lote se vacía objeto a objeto (son
 * pocos: el coste es despreciable).
 */
import Phaser from "phaser";

export const MAX_LIGHTS = 8;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec3 uAmbient;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform vec3 uLightColors[${MAX_LIGHTS}];
uniform float uLightCount;
uniform vec2 uTexel;
uniform vec4 uFrame;
uniform vec2 uKeyDir;
uniform vec3 uKeyColor;
uniform vec4 uGrade;
uniform vec3 uFogColor;
uniform float uEmissive;
uniform float uRimTexels;
uniform float uKeyPower;
/** Píxeles dibujados por píxel lógico (la tablet dibuja a 2/3). */
uniform float uScale;
varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

void main() {
  vec4 tex = texture2D(uMainSampler, outTexCoord);
  if (tex.a < 0.003) discard;
  vec3 c = tex.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uGrade.x);
  c = (c - 0.5 * tex.a) * uGrade.y + 0.5 * tex.a;
  c = max(c, vec3(0.0));

  vec3 light = uAmbient;
  vec2 frag = gl_FragCoord.xy / uScale;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (float(i) >= uLightCount) break;
    vec4 L = uLights[i];
    float att = clamp(1.0 - distance(frag, L.xy) / L.z, 0.0, 1.0);
    light += uLightColors[i] * (L.w * att * att);
  }
  // Modelado: el lado que mira a la luz principal recibe más, el otro menos.
  vec2 center = (uFrame.xy + uFrame.zw) * 0.5;
  vec2 rel = (outTexCoord - center) / max(abs(uFrame.zw - uFrame.xy), vec2(0.0001));
  float side = clamp(dot(normalize(vec2(rel.x * 2.2, rel.y * 0.6) + vec2(0.0001)), uKeyDir), -1.0, 1.0);
  light *= 1.0 + uKeyPower * 0.55 * side;
  // Pies algo más oscuros: el suelo les quita luz.
  float hf = clamp((uFrame.w - outTexCoord.y) / max(uFrame.w - uFrame.y, 0.0001), 0.0, 1.0);
  light *= mix(0.7, 1.0, smoothstep(0.0, 0.25, hf));
  light = max(light, vec3(uEmissive));
  light += vec3(0.75, 0.85, 1.0) * uGrade.w;
  c *= light;

  // Contraluz: borde cuyo vecino hacia la luz principal ya es transparente.
  vec2 o = clamp(outTexCoord + uKeyDir * uTexel * uRimTexels, uFrame.xy, uFrame.zw);
  vec2 o2 = clamp(outTexCoord + uKeyDir * uTexel * uRimTexels * 0.5, uFrame.xy, uFrame.zw);
  float rim = tex.a * (1.0 - 0.5 * (texture2D(uMainSampler, o).a + texture2D(uMainSampler, o2).a));
  c += uKeyColor * rim;

  c = mix(c, uFogColor * tex.a, uGrade.z);
  vec3 tint = outTint.bgr;
  gl_FragColor = vec4(c * tint * outTint.a, tex.a * outTint.a);
}
`;

export interface ActorLightParams {
  /** Hacia dónde está la luz principal, en espacio de la textura (normalizado). */
  keyDir: [number, number];
  /** Color × fuerza del contraluz. */
  keyColor: [number, number, number];
  saturation: number;
  contrast: number;
  /** 0..1 cuánto se funde con la niebla (lejos = más). */
  fog: number;
  /** Brillo mínimo propio (los fantasmas brillan). */
  emissive: number;
  /** Grosor del contraluz en píxeles de la textura (≈3 px en pantalla). */
  rimTexels: number;
  /** 0..1 cuánto domina la luz principal (modelado lateral). */
  keyPower: number;
}

export interface SceneLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: number;
}

/** Luces de la escena en este fotograma (coordenadas de pantalla lógica). */
export class LightingState {
  ambient: [number, number, number] = [0.45, 0.45, 0.5];
  fogColor: [number, number, number] = [0.2, 0.22, 0.28];
  flash = 0;
  readonly lights = new Float32Array(MAX_LIGHTS * 4);
  readonly colors = new Float32Array(MAX_LIGHTS * 3);
  count = 0;
  /** Las mismas luces en coordenadas de pantalla (para calcular sombras y contraluz). */
  readonly screen: SceneLight[] = [];
  /** Alto de la pantalla lógica (para pasar a coordenadas de GL, con y hacia arriba). */
  height = 1080;
  /** false en navegadores sin WebGL: se usa el tinte de siempre. */
  enabled = false;

  clear(): void {
    this.count = 0;
    this.screen.length = 0;
  }

  add(x: number, y: number, radius: number, intensity: number, color: number): void {
    if (this.count >= MAX_LIGHTS) return;
    const i = this.count;
    this.lights.set([x, this.height - y, radius, intensity], i * 4);
    this.colors.set([((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255], i * 3);
    this.screen.push({ x, y, radius, intensity, color });
    this.count += 1;
  }

  /** La luz que más ilumina un punto (y cuánto). */
  key(x: number, y: number): { light?: SceneLight; power: number } {
    let best: SceneLight | undefined;
    let power = 0;
    for (const l of this.screen) {
      const a = Math.max(0, 1 - Math.hypot(l.x - x, l.y - y) / l.radius);
      const c = l.intensity * a * a;
      if (c > power) {
        power = c;
        best = l;
      }
    }
    return { light: best, power };
  }
}

export const lighting = new LightingState();

const hex3 = (c: number): [number, number, number] => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
export { hex3 };

type Lit = Phaser.GameObjects.Sprite & { lightParams?: ActorLightParams };

export class ActorLightPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG } as Phaser.Types.Renderer.WebGL.WebGLPipelineConfig);
  }

  batchSprite(go: Lit, camera: Phaser.Cameras.Scene2D.Camera, parent?: Phaser.GameObjects.Components.TransformMatrix): void {
    this.manager!.set(this, go);
    this.flush();
    const p = go.lightParams;
    const f = go.frame;
    const src = f.source;
    this.set3f("uAmbient", lighting.ambient[0], lighting.ambient[1], lighting.ambient[2]);
    this.set4fv("uLights", lighting.lights);
    this.set3fv("uLightColors", lighting.colors);
    this.set1f("uLightCount", lighting.count);
    this.set3f("uFogColor", lighting.fogColor[0], lighting.fogColor[1], lighting.fogColor[2]);
    this.set2f("uTexel", 1 / src.width, 1 / src.height);
    this.set4f("uFrame", f.u0, f.v0, f.u1, f.v1);
    this.set2f("uKeyDir", p?.keyDir[0] ?? 0, p?.keyDir[1] ?? 0);
    this.set3f("uKeyColor", p?.keyColor[0] ?? 0, p?.keyColor[1] ?? 0, p?.keyColor[2] ?? 0);
    this.set4f("uGrade", p?.saturation ?? 1, p?.contrast ?? 1, p?.fog ?? 0, lighting.flash);
    this.set1f("uEmissive", p?.emissive ?? 0);
    this.set1f("uRimTexels", p?.rimTexels ?? 3);
    this.set1f("uKeyPower", p?.keyPower ?? 0);
    this.set1f("uScale", camera.zoom);
    super.batchSprite(go, camera, parent);
    this.flush();
  }
}

export const ACTOR_LIGHT = "ActorLight";

export function installActorLight(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return false;
  if (!renderer.pipelines.has(ACTOR_LIGHT)) renderer.pipelines.add(ACTOR_LIGHT, new ActorLightPipeline(game));
  lighting.enabled = true;
  return true;
}
