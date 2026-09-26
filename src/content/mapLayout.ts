/**
 * Esquema del mapa de la mochila: dónde se dibuja cada sala (coordenadas de la
 * escena lógica), por plantas de arriba abajo. Las columnas van cada 240 px
 * (una sala mide 210) y a la izquierda queda sitio para el nombre de la planta.
 */
const COL = [430, 670, 910, 1150, 1390, 1630];

export const MAP_ROWS: { label: string; y: number }[] = [
  { label: "Tejado", y: 250 },
  { label: "2.ª planta", y: 365 },
  { label: "1.ª planta", y: 480 },
  { label: "Planta baja", y: 620 },
  { label: "Sótano", y: 900 },
];

export const MAP_POS: Record<string, { x: number; y: number }> = {
  pajarera: { x: COL[1], y: 250 },
  desvan: { x: COL[2], y: 250 },
  observatorio: { x: COL[3], y: 250 },
  torre: { x: COL[4], y: 250 },
  costura: { x: COL[0], y: 365 },
  alcoba: { x: COL[1], y: 365 },
  rellano: { x: COL[2], y: 365 },
  aula: { x: COL[3], y: 365 },
  estudio: { x: COL[0], y: 480 },
  taller: { x: COL[1], y: 480 },
  galeria: { x: COL[2], y: 480 },
  dormitorio: { x: COL[3], y: 480 },
  teatro: { x: COL[4], y: 480 },
  cocina: { x: COL[1], y: 620 },
  vestibulo: { x: COL[2], y: 620 },
  biblioteca: { x: COL[3], y: 620 },
  musica: { x: COL[4], y: 620 },
  comedor: { x: COL[1], y: 735 },
  baile: { x: COL[3], y: 735 },
  invernadero: { x: COL[5], y: 735 },
  jardin: { x: COL[4], y: 820 },
  archivo: { x: COL[2], y: 900 },
  tuneles: { x: COL[3], y: 900 },
};

/** Tamaño de cada sala en el esquema. */
export const MAP_NODE = { w: 210, h: 80 };
