/** Objetos que Paula puede llevar en la mochila. */
export interface ItemDef {
  name: string;
  description: string;
  /** Icono (emoji: se ve igual en la tablet y en el móvil, sin descargar nada). */
  icon: string;
  /** Uno de los cinco recuerdos de Inés. */
  memory?: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  "carta-mojada": { icon: "✉️", name: "Media carta mojada", description: "«…cuando la mansión cuente trece…». El resto se lo comió la lluvia." },
  "sello-aurelia": { icon: "🔏", name: "Sello de Aurelia", description: "Un sello de lacre con una brújula grabada. Abre lo que la familia cerró." },
  "pagina-elvira": { icon: "📄", name: "Página de Elvira", description: "Cuentas escritas del revés. Arriba, subrayado dos veces: 7 × 9." },
  "engranaje-marfil": { icon: "⚙️", name: "Engranaje de marfil", description: "Trece dientes. Encaja en algo que no es un reloj." },
  "galleta-piedra": { icon: "🍪", name: "Galleta de 1913", description: "Dura como una piedra. A alguien le encantará." },
  "lente-luna": { icon: "🔍", name: "Lente de luna", description: "Un cristal azulado de la señora Bruma. Deja ver la tinta de luna." },
  "plano-ines": { icon: "🗺️", name: "Plano de Inés", description: "La casa entera dibujada por Inés, con flechas y estrellitas." },
  "canica-azul": { icon: "🔵", name: "Canica azul", memory: true, description: "La canica favorita de Inés. Dentro parece que llueve." },
  "foto-ines": { icon: "🖼️", name: "Fotografía de Inés", memory: true, description: "Inés con nueve años, riéndose. Detrás pone: «1913»." },
  "cilindro-cera": { icon: "🎼", name: "Cilindro de cera", memory: true, description: "Guarda la voz de Inés cantando do, mi, sol." },
  "flor-luna": { icon: "🌼", name: "Flor de luna", memory: true, description: "La flor que Inés dibujaba. Brilla un poquito en la oscuridad." },
  "cinta-roja": { icon: "🎀", name: "Cinta roja", memory: true, description: "La cinta del pelo de Inés. Estaba atada lejos de la campana." },
};

export const itemName = (id: string): string => ITEMS[id]?.name ?? id;
export const MEMORIES = Object.keys(ITEMS).filter((id) => ITEMS[id].memory);
