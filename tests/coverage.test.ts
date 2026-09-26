/**
 * Que nada del mundo se quede «a medias»: cada sala tiene su vida, su sonido y
 * su sitio en el mapa; cada personaje, su dibujo, su voz y una rutina posible.
 * (Fallos que el validador de contenido no ve porque están en otras capas.)
 */
import { describe, expect, it } from "vitest";
import { AMBIENCE } from "../src/content/ambience";
import { LIFE } from "../src/content/life";
import { MAP_POS } from "../src/content/mapLayout";
import { NPCS } from "../src/content/npcs";
import { SPRITES } from "../src/content/sprites";
import { PROFILES } from "../src/content/voices";
import { ZONES, zoneLinks, type ZoneDef } from "../src/content/zones";
import { ZoneGraph } from "../src/core/worldSim";

const zones = Object.values(ZONES).filter((z): z is ZoneDef => !!z);
const graph = new ZoneGraph(zoneLinks());

describe("cada sala está completa", () => {
  for (const z of zones) {
    it(`${z.id}: vida, sonido y mapa`, () => {
      expect(LIFE[z.id], "sin vida (content/life.ts)").toBeDefined();
      expect(AMBIENCE[z.id], "sin sonido de ambiente (content/ambience.ts)").toBeDefined();
      expect(MAP_POS[z.id], "sin sitio en el mapa (content/mapLayout.ts)").toBeDefined();
    });
  }

  it("en el mapa las salas no se pisan", () => {
    const pos = Object.entries(MAP_POS);
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const [a, pa] = pos[i];
        const [b, pb] = pos[j];
        const apart = Math.abs(pa.x - pb.x) >= 260 || Math.abs(pa.y - pb.y) >= 106;
        expect(apart, `${a} y ${b} se solapan en el mapa`).toBe(true);
      }
    }
  });
});

describe("cada personaje está completo", () => {
  for (const n of NPCS) {
    it(`${n.id}: dibujo, voz y rutina`, () => {
      expect(SPRITES[n.sprite], `sin sprite «${n.sprite}»`).toBeDefined();
      expect(PROFILES[n.id], "sin voz (content/voices.ts)").toBeDefined();
      expect(ZONES[n.routine.home as keyof typeof ZONES], "su casa no es una sala").toBeDefined();
      for (const st of n.routine.stations) {
        expect(ZONES[st.zone as keyof typeof ZONES], `visita «${st.zone}», que no existe`).toBeDefined();
        expect(graph.route(n.routine.home, st.zone), `no puede ir de ${n.routine.home} a ${st.zone}`).not.toBeNull();
      }
    });
  }
});
