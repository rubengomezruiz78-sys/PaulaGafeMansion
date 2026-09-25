/**
 * El mundo vivo de la partida: la simulación de todos los personajes y el
 * director de charlas. Viven fuera de la escena para sobrevivir a los cambios
 * de zona (la escena se reinicia en cada puerta; el mundo sigue).
 */
import { ChatDirector } from "../core/chat";
import { Rng } from "../core/rng";
import { WorldSim, ZoneGraph } from "../core/worldSim";
import { CHATS } from "../content/chats";
import { NPCS } from "../content/npcs";
import { zoneLinks } from "../content/zones";
import { session } from "./session";

export const graph = new ZoneGraph(zoneLinks());

export const worldSim = new WorldSim(
  graph,
  Object.fromEntries(NPCS.map((n) => [n.id, n.routine])),
  new Rng(0x5eed1913),
  session.state.clock,
);

export const chatDirector = new ChatDirector(CHATS, new Rng(0xc4a71913));
