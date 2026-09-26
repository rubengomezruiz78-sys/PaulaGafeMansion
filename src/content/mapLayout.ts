/** Esquema del mapa de la mochila: dónde se dibuja cada sala (coordenadas de la escena lógica). */
/** Centro de cada sala en el esquema del mapa (por plantas). */
export const MAP_POS: Record<string, { x: number; y: number }> = {
  estudio: { x: 330, y: 275 },
  desvan: { x: 720, y: 275 },
  observatorio: { x: 1080, y: 275 },
  torre: { x: 1480, y: 275 },
  taller: { x: 330, y: 400 },
  galeria: { x: 720, y: 400 },
  dormitorio: { x: 1080, y: 400 },
  teatro: { x: 1440, y: 400 },
  cocina: { x: 330, y: 565 },
  vestibulo: { x: 720, y: 565 },
  biblioteca: { x: 1080, y: 565 },
  musica: { x: 1440, y: 565 },
  comedor: { x: 330, y: 690 },
  baile: { x: 1080, y: 690 },
  invernadero: { x: 1640, y: 690 },
  jardin: { x: 1360, y: 800 },
  archivo: { x: 720, y: 915 },
  tuneles: { x: 1080, y: 915 },
};
