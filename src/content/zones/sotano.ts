/** Sótano: archivo bajo la capilla y túneles del aljibe. */
import type { ZoneDef, ZoneId } from "../zones";

export const SOTANO: Partial<Record<ZoneId, ZoneDef>> = {
  archivo: {
    id: "archivo",
    name: "Archivo bajo la capilla",
    image: "world/archivo.webp",
    // Cámara a 1,70 m (los ojos de Basilio caen en el horizonte). Verificado:
    // sarcófago ≈ 0,8 m, puerta del pacto ≈ 3,2 m.
    perspective: { horizon: 0.45, k: 0.588, focal: 1.0 },
    walk: {
      outer: [
        [0.03, 1.0], [0.03, 0.86], [0.2, 0.82], [0.22, 0.66], [0.34, 0.63], [0.6, 0.64],
        [0.63, 0.75], [0.8, 0.76], [0.84, 0.74], [0.92, 0.8], [0.97, 0.88], [0.97, 1.0],
      ],
      holes: [[[0.35, 0.66], [0.56, 0.66], [0.57, 0.83], [0.34, 0.84]]],
    },
    exits: [
      {
        id: "escalera-vestibulo", to: "vestibulo", toExit: "arco-sotano", label: "Subir al vestíbulo",
        hotspot: [[0.0, 0.86], [0.08, 0.86], [0.08, 1.0], [0.0, 1.0]], approach: [0.07, 0.93],
      },
      {
        id: "puerta-pacto", to: "tuneles", toExit: "pasadizo-archivo", label: "Puerta del pacto",
        hotspot: [[0.64, 0.2], [0.8, 0.2], [0.8, 0.74], [0.64, 0.74]], approach: [0.72, 0.78],
        requires: { flag: "pacto-roto" },
        lockedText: "La puerta del pacto está encadenada al altar de la capilla. Mientras el pacto siga en pie, no se abrirá.",
      },
    ],
    props: [
      { id: "altar", label: "Altar de la capilla", hotspot: [[0.26, 0.1], [0.4, 0.1], [0.4, 0.6], [0.26, 0.6]], approach: [0.33, 0.67] },
      { id: "sarcofago", label: "Sarcófago", hotspot: [[0.36, 0.63], [0.56, 0.63], [0.56, 0.83], [0.36, 0.83]], approach: [0.45, 0.89] },
      { id: "registro", label: "Registro cosido", hotspot: [[0.02, 0.5], [0.1, 0.5], [0.1, 0.62], [0.02, 0.62]], approach: [0.1, 0.9] },
      { id: "cajonera", label: "Cajonera", hotspot: [[0.1, 0.35], [0.2, 0.35], [0.2, 0.8], [0.1, 0.8]], approach: [0.22, 0.84] },
    ],
    poi: [[0.28, 0.72], [0.6, 0.9], [0.75, 0.82], [0.2, 0.93], [0.45, 0.95]],
    spawn: [0.3, 0.9],
    actorTint: 0xd8c2a0,
  },

  tuneles: {
    id: "tuneles",
    name: "Túneles del aljibe",
    image: "world/tuneles.webp",
    // Cámara a 1,65 m. Verificado: bolardos ≈ 0,5 m, arcos de compuerta ≈ 3 m.
    perspective: { horizon: 0.48, k: 0.606, focal: 1.0 },
    walk: {
      outer: [
        [0.52, 1.0], [0.6, 0.84], [0.7, 0.7], [0.78, 0.62], [0.86, 0.57], [0.93, 0.56],
        [0.97, 0.6], [0.99, 0.7], [0.99, 1.0],
      ],
    },
    exits: [
      {
        id: "escalera-cocina", to: "cocina", toExit: "porton-caldera", label: "Escalera a la cocina",
        hotspot: [[0.77, 0.38], [0.83, 0.38], [0.83, 0.58], [0.77, 0.58]], approach: [0.82, 0.635],
        requires: { flag: "porton-abierto" },
        lockedText: "La escalera sube a un portón atrancado desde el otro lado.",
      },
      {
        id: "pasadizo-archivo", to: "archivo", toExit: "puerta-pacto", label: "Pasadizo al archivo",
        hotspot: [[0.52, 0.94], [0.72, 0.94], [0.72, 1.0], [0.52, 1.0]], approach: [0.63, 0.965],
        requires: { flag: "pacto-roto" },
        lockedText: "Al final del pasadizo está la puerta del pacto. Desde aquí no se abre.",
      },
      {
        id: "tunel-torre", to: "torre", toExit: "escalera-aljibe", label: "Túnel de la torre",
        hotspot: [[0.86, 0.4], [0.96, 0.4], [0.96, 0.56], [0.86, 0.56]], approach: [0.91, 0.575],
        requires: { flag: "compuertas-abiertas" },
        lockedText: "El agua cubre el paso del túnel. Hay que ordenar las compuertas.",
      },
    ],
    props: [
      { id: "compuerta-1", label: "Compuerta I", hotspot: [[0.07, 0.2], [0.2, 0.2], [0.2, 0.7], [0.07, 0.7]], approach: [0.62, 0.86] },
      { id: "compuerta-2", label: "Compuerta II", hotspot: [[0.35, 0.25], [0.48, 0.25], [0.48, 0.65], [0.35, 0.65]], approach: [0.68, 0.76] },
      { id: "compuerta-3", label: "Compuerta III", hotspot: [[0.62, 0.32], [0.7, 0.32], [0.7, 0.62], [0.62, 0.62]], approach: [0.74, 0.67] },
    ],
    poi: [[0.7, 0.85], [0.85, 0.7], [0.9, 0.62], [0.8, 0.95]],
    spawn: [0.8, 0.93],
    actorTint: 0x9fb4b8,
  },
};
