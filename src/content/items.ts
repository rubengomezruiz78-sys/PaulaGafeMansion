/** Objetos que Paula puede llevar en la mochila. */
export interface ItemDef {
  name: string;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  "sello-aurelia": { name: "Sello de Aurelia", description: "Un sello de lacre con una brújula grabada. Abre lo que la familia cerró." },
  "carta-mojada": { name: "Media carta mojada", description: "«…cuando la mansión cuente trece…». El resto se lo comió la lluvia." },
  "pagina-elvira": { name: "Página de Elvira", description: "Cuentas escritas del revés. Arriba, subrayado: 7 × 9." },
  "engranaje-marfil": { name: "Engranaje de marfil", description: "Trece dientes. Encaja en algo que no es un reloj." },
  "galleta-piedra": { name: "Galleta de 1913", description: "Dura como una piedra. A alguien le encantará." },
  "tiza-azul": { name: "Tiza azul", description: "Húmeda. Alguien la usó esta misma noche." },
};

export const itemName = (id: string): string => ITEMS[id]?.name ?? id;
