import Phaser from "phaser";
import type { Projection } from "../core/perspective";
import { polyPx, type ZoneDef } from "../content/zones";

/**
 * Capa de calibración (?debug=1): suelo caminable, huecos, salidas, objetos,
 * horizonte y varas de medir sobre el suelo (blanca 1,30 m = Paula; naranja
 * 2,10 m = puerta) para comprobar a ojo que las proporciones casan con el cuadro.
 */
export function drawDebug(scene: Phaser.Scene, zone: ZoneDef, proj: Projection): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(9000);
  const poly = (pts: { x: number; y: number }[], color: number, width = 3) => {
    g.lineStyle(width, color, 0.95).beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath().strokePath();
  };
  poly(polyPx(zone.walk.outer), 0x39ff6a);
  for (const hole of zone.walk.holes ?? []) poly(polyPx(hole), 0xff4040);
  for (const e of zone.exits) poly(polyPx(e.hotspot), 0x33d6ff, 2);
  for (const p of zone.props) poly(polyPx(p.hotspot), 0xffe14d, 2);

  g.lineStyle(2, 0xff40ff, 0.9).lineBetween(0, proj.hPx, proj.width, proj.hPx);

  // Varas de medir en una rejilla de profundidades reales.
  for (const Z of [2.4, 3, 4, 5.5, 7.5, 10]) {
    for (const X of [-3, -1.5, 0, 1.5, 3]) {
      const base = proj.fromFloor({ X, Z });
      if (base.x < 0 || base.x > proj.width || base.y > proj.height) continue;
      const kid = proj.heightPx(base.y, 1.3);
      const door = proj.heightPx(base.y, 2.1);
      g.lineStyle(3, 0xffa13d, 0.8).lineBetween(base.x + 4, base.y, base.x + 4, base.y - door);
      g.lineStyle(4, 0xffffff, 0.95).lineBetween(base.x, base.y, base.x, base.y - kid);
      g.fillStyle(0xffffff, 1).fillCircle(base.x, base.y, 5);
    }
  }
  return g;
}
