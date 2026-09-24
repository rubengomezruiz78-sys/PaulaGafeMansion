/** Quién habla en una conversación: Paula, Gafe o un personaje del mundo. */
import type { Notice } from "../core/rules";
import type { Speaker } from "../scenes/UIScene";
import { itemName } from "./items";
import { NPCS } from "./npcs";
import { QUESTS, questStageText } from "./quests";

const FIXED: Record<string, Speaker> = {
  paula: { name: "Paula", portrait: "paula-idle" },
  gafe: { name: "Gafe", role: "Gato negro", portrait: "gafe-sit" },
};

export function speakerFor(id: string): Speaker {
  if (FIXED[id]) return FIXED[id];
  const npc = NPCS.find((n) => n.id === id);
  return npc ? { name: npc.name, role: npc.role, portrait: npc.sprite } : { name: id };
}

/** Texto del aviso para la interfaz (o null si no hay que avisar). */
export function describeNotice(n: Notice): string | null {
  switch (n.type) {
    case "item": return `✦ Has conseguido: ${itemName(n.item)}`;
    case "itemLost": return `Has entregado: ${itemName(n.item)}`;
    case "quest": {
      const t = questStageText(n.quest, n.stage);
      return t ? `Nueva tarea: ${t}` : null;
    }
    case "questDone": return `✔ ${QUESTS[n.quest]?.title ?? n.quest}`;
  }
}
