/** Objetos que Paula puede llevar en la mochila. */
export interface ItemDef {
  name: string;
  description: string;
  /** Icono (emoji: se ve igual en la tablet y en el móvil, sin descargar nada). */
  icon: string;
  /** Uno de los cinco recuerdos de Inés. */
  memory?: boolean;
  /** Una de las seis cosas de la fiesta de Inés. */
  party?: boolean;
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

  // Ala de la fiesta.
  batuta: { icon: "🪄", name: "Batuta del maestro", description: "La batuta del maestro Anacleto. Estaba en la fuente del jardín, dirigiendo a las ranas." },
  "llave-cuerda": { icon: "🗝️", name: "Llave de cuerda", description: "Una llave pequeñita de latón, de las que dan cuerda a los juguetes. Tiene grabada una I." },
  "partitura-vals": { icon: "🎻", name: "Partitura del vals", party: true, description: "«Vals para Inés, en su décimo cumpleaños». La orquesta ya se lo sabe de memoria." },
  "tarta-ines": { icon: "🎂", name: "Tarta de cumpleaños", party: true, description: "Tres pisos, diez velas y una fresa en lo alto. Tía Clemencia dice que no se toca hasta la fiesta." },
  farolillos: { icon: "🏮", name: "Farolillos de luciérnagas", party: true, description: "Farolillos de papel con luciérnagas dentro. Dan una luz calentita y no queman." },
  "bailarina-cuerda": { icon: "🩰", name: "Bailarina de cuerda", party: true, description: "El regalo de Casimiro para Inés. Con una vuelta de llave, baila cuatro vueltas." },
  invitaciones: { icon: "💌", name: "Invitaciones pintadas", party: true, description: "Trece invitaciones pintadas por Don Fermín, cada una de un color." },
  "marioneta-ines": { icon: "🎭", name: "Marioneta de Inés", party: true, description: "Una marioneta con la cara de Inés y una cinta roja. Bartolo la guardaba para la función." },

  // Segunda planta.
  "diario-ines": { icon: "📔", name: "Diario de Inés", description: "Un diario con tapas azules y una I dorada. Llevas {diario} de 4 páginas." },
  "pajarito-papel": { icon: "🕊️", name: "Pajarito de papel", description: "Un pájaro de papel que canta bajito la nana de Aurelia cuando le das calor en la mano." },
  "medallon-aurelia": { icon: "🧿", name: "Medallón de Aurelia", description: "Dentro hay dos retratos pequeñitos: Aurelia de joven… y Inés, riéndose." },
};

export const itemName = (id: string): string => ITEMS[id]?.name ?? id;
export const MEMORIES = Object.keys(ITEMS).filter((id) => ITEMS[id].memory);
export const PARTY_ITEMS = Object.keys(ITEMS).filter((id) => ITEMS[id].party);
