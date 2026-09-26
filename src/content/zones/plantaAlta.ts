/** Planta alta y torre: galería, dormitorio, desván, observatorio y torre. */
import type { ZoneDef, ZoneId } from "../zones";

export const PLANTA_ALTA: Partial<Record<ZoneId, ZoneDef>> = {
  galeria: {
    id: "galeria",
    name: "Galería de los borrados",
    image: "world/galeria.webp",
    // Cámara a 1,65 m. Verificado: aparador 1,1 m, armadura sobre peana ≈ 2,3 m.
    perspective: { horizon: 0.52, k: 0.606, focal: 1.0 },
    walk: {
      outer: [
        [0.16, 1.0], [0.16, 0.9], [0.25, 0.86], [0.42, 0.8], [0.5, 0.73], [0.62, 0.65],
        [0.68, 0.62], [0.78, 0.62], [0.82, 0.66], [0.87, 0.72], [0.88, 0.86], [0.9, 0.96], [0.92, 1.0],
      ],
    },
    exits: [
      {
        id: "escalera-vestibulo", to: "vestibulo", toExit: "escalera", label: "Bajar al vestíbulo",
        hotspot: [[0.35, 0.95], [0.7, 0.95], [0.7, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "puerta-dormitorio", to: "dormitorio", toExit: "puerta-galeria", label: "Dormitorio de Inés",
        hotspot: [[0.775, 0.44], [0.82, 0.44], [0.82, 0.64], [0.775, 0.64]], approach: [0.8, 0.66],
      },
      {
        id: "escalera-desvan", to: "rellano", toExit: "escalera-galeria", label: "Subir a la segunda planta",
        hotspot: [[0.68, 0.5], [0.77, 0.5], [0.77, 0.62], [0.68, 0.62]], approach: [0.72, 0.64],
      },
      {
        id: "puerta-taller", to: "taller", toExit: "puerta-galeria", label: "Taller del juguetero",
        hotspot: [[0.55, 0.33], [0.6, 0.33], [0.6, 0.6], [0.55, 0.6]], approach: [0.6, 0.68],
      },
    ],
    props: [
      { id: "armadura", label: "Armadura", hotspot: [[0.04, 0.35], [0.16, 0.35], [0.16, 0.92], [0.04, 0.92]], approach: [0.19, 0.93] },
      { id: "retratos", label: "Retratos de la familia", hotspot: [[0.2, 0.1], [0.55, 0.1], [0.55, 0.5], [0.2, 0.5]], approach: [0.42, 0.84] },
      { id: "aparador", label: "Aparador con lámpara", hotspot: [[0.25, 0.55], [0.4, 0.55], [0.4, 0.82], [0.25, 0.82]], approach: [0.33, 0.88] },
      { id: "jarron", label: "Jarrón", hotspot: [[0.9, 0.55], [1.0, 0.55], [1.0, 0.95], [0.9, 0.95]], approach: [0.86, 0.92] },
    ],
    poi: [[0.45, 0.85], [0.62, 0.72], [0.72, 0.66], [0.8, 0.8], [0.3, 0.95]],
    spawn: [0.5, 0.93],
    actorTint: 0xd0bc9e,
  },

  dormitorio: {
    id: "dormitorio",
    name: "Dormitorio de Inés",
    image: "world/dormitorio.webp",
    // Cámara a la altura de un niño (0,85 m). Verificado: caballito 1,15 m, cómoda 0,95 m.
    perspective: { horizon: 0.46, k: 1.17, focal: 1.0 },
    walk: {
      outer: [
        [0.22, 1.0], [0.22, 0.86], [0.3, 0.74], [0.32, 0.62], [0.45, 0.6], [0.58, 0.61],
        [0.72, 0.63], [0.87, 0.65], [0.87, 0.7], [0.78, 0.74], [0.76, 0.96], [0.78, 1.0],
      ],
      holes: [
        [[0.51, 0.7], [0.59, 0.7], [0.6, 0.8], [0.5, 0.8]],
        [[0.61, 0.75], [0.72, 0.75], [0.72, 0.82], [0.61, 0.82]],
      ],
    },
    exits: [
      {
        id: "puerta-galeria", to: "galeria", toExit: "puerta-dormitorio", label: "Galería",
        hotspot: [[0.35, 0.95], [0.7, 0.95], [0.7, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "puertecita-teatro", to: "teatro", toExit: "puerta-dormitorio", label: "Puertecita tras la cortina",
        hotspot: [[0.4, 0.05], [0.455, 0.05], [0.455, 0.55], [0.4, 0.55]], approach: [0.43, 0.64],
      },
    ],
    props: [
      { id: "caja-musica", label: "Caja de música", hotspot: [[0.02, 0.58], [0.2, 0.58], [0.2, 0.86], [0.02, 0.86]], approach: [0.25, 0.9] },
      { id: "caballito", label: "Caballito de balancín", hotspot: [[0.12, 0.35], [0.3, 0.35], [0.3, 0.72], [0.2, 0.72], [0.2, 0.58], [0.12, 0.58]], approach: [0.33, 0.76] },
      { id: "mapa-estelar", label: "Mapa de estrellas", hotspot: [[0.75, 0.05], [0.97, 0.05], [0.97, 0.32], [0.75, 0.32]], approach: [0.78, 0.68] },
      { id: "tren", label: "Tren de juguete", hotspot: [[0.4, 0.68], [0.72, 0.68], [0.72, 0.84], [0.4, 0.84]], approach: [0.48, 0.86] },
      { id: "comoda", label: "Cómoda", hotspot: [[0.58, 0.2], [0.72, 0.2], [0.72, 0.6], [0.58, 0.6]], approach: [0.62, 0.66] },
    ],
    poi: [[0.4, 0.7], [0.5, 0.9], [0.68, 0.68], [0.35, 0.95], [0.62, 0.9]],
    spawn: [0.5, 0.93],
    actorTint: 0xd8b894,
  },

  desvan: {
    id: "desvan",
    name: "Desván de las sombras",
    image: "world/desvan.webp",
    // Cámara a 1,60 m. Verificado: baúles ≈ 0,67 m, barandilla ≈ 1 m.
    perspective: { horizon: 0.48, k: 0.625, focal: 1.0 },
    walk: {
      outer: [
        [0.3, 1.0], [0.32, 0.88], [0.36, 0.78], [0.4, 0.72], [0.6, 0.72], [0.66, 0.75],
        [0.62, 0.82], [0.66, 0.9], [0.74, 0.96], [0.78, 1.0],
      ],
    },
    exits: [
      {
        id: "hueco-escalera", to: "rellano", toExit: "escalera-desvan", label: "Bajar a la segunda planta",
        hotspot: [[0.47, 0.58], [0.6, 0.58], [0.6, 0.72], [0.47, 0.72]], approach: [0.52, 0.74],
      },
      {
        id: "escalera-observatorio", to: "observatorio", toExit: "escalera-desvan", label: "Escalera al observatorio",
        hotspot: [[0.66, 0.48], [0.83, 0.48], [0.83, 0.76], [0.66, 0.76]], approach: [0.64, 0.84],
      },
    ],
    props: [
      { id: "jaula", label: "Jaula vacía", hotspot: [[0.05, 0.2], [0.18, 0.2], [0.18, 0.62], [0.05, 0.62]], approach: [0.33, 0.84] },
      { id: "roseton", label: "Rosetón", hotspot: [[0.4, 0.25], [0.56, 0.25], [0.56, 0.46], [0.4, 0.46]], approach: [0.5, 0.76] },
      { id: "sabanas", label: "Sábanas colgadas", hotspot: [[0.27, 0.3], [0.35, 0.3], [0.35, 0.62], [0.27, 0.62]], approach: [0.36, 0.8] },
      { id: "baules", label: "Baúles numerados", hotspot: [[0.84, 0.66], [0.97, 0.66], [0.97, 0.92], [0.84, 0.92]], approach: [0.72, 0.95] },
    ],
    poi: [[0.45, 0.8], [0.55, 0.9], [0.4, 0.95], [0.6, 0.78]],
    spawn: [0.5, 0.92],
    actorTint: 0xa3aec2,
  },

  observatorio: {
    id: "observatorio",
    name: "Observatorio Valcárcel",
    image: "world/observatorio.webp",
    // Cámara a 1,65 m. Verificado: mesa 0,8 m, barandilla del planetario ≈ 1 m.
    perspective: { horizon: 0.45, k: 0.606, focal: 1.0 },
    walk: {
      outer: [
        [0.17, 1.0], [0.18, 0.8], [0.22, 0.72], [0.3, 0.64], [0.45, 0.6], [0.55, 0.6],
        [0.7, 0.58], [0.82, 0.62], [0.86, 0.7], [0.86, 0.95], [0.84, 1.0],
      ],
      holes: [
        [[0.22, 0.78], [0.3, 0.7], [0.42, 0.72], [0.42, 0.82], [0.25, 0.83]],
        [[0.53, 0.66], [0.66, 0.62], [0.79, 0.66], [0.8, 0.78], [0.66, 0.84], [0.53, 0.8]],
      ],
    },
    exits: [
      {
        id: "escalera-desvan", to: "desvan", toExit: "escalera-observatorio", label: "Bajar al desván",
        hotspot: [[0.3, 0.96], [0.7, 0.96], [0.7, 1.0], [0.3, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "pasarela-torre", to: "torre", toExit: "pasarela-observatorio", label: "Pasarela a la torre",
        hotspot: [[0.8, 0.4], [0.86, 0.4], [0.86, 0.6], [0.8, 0.6]], approach: [0.83, 0.64],
        requires: { flag: "pasarela-abierta" },
        lockedText: "La pasarela está cerrada con un cerrojo lleno de estrellas. Quizá desde el telescopio se entienda cómo se abre.",
      },
    ],
    props: [
      { id: "telescopio", label: "Telescopio", hotspot: [[0.2, 0.05], [0.47, 0.05], [0.47, 0.7], [0.2, 0.7]], approach: [0.44, 0.78] },
      { id: "planetario", label: "Planetario de latón", hotspot: [[0.55, 0.3], [0.8, 0.3], [0.8, 0.8], [0.55, 0.8]], approach: [0.66, 0.88] },
      { id: "globo", label: "Globo terráqueo", hotspot: [[0.88, 0.4], [1.0, 0.4], [1.0, 0.62], [0.88, 0.62]], approach: [0.84, 0.82] },
      { id: "cuaderno-estrellas", label: "Cuaderno de observaciones", hotspot: [[0.0, 0.45], [0.17, 0.45], [0.17, 0.65], [0.0, 0.65]], approach: [0.2, 0.88] },
    ],
    poi: [[0.47, 0.7], [0.5, 0.9], [0.7, 0.92], [0.3, 0.9], [0.83, 0.75]],
    spawn: [0.5, 0.92],
    actorTint: 0xaebfd6,
  },

  torre: {
    id: "torre",
    name: "Torre de las trece",
    image: "world/torre.webp",
    // Vista alta sobre el foso de engranajes (cámara ≈ 2,9 m), verificada con
    // la barandilla (≈ 1 m). Inés queda dentro de la barandilla, con el mecanismo.
    perspective: { horizon: 0.36, k: 0.342, focal: 1.0 },
    walk: {
      outer: [[0.0, 1.0], [0.0, 0.82], [0.08, 0.85], [0.2, 0.89], [0.3, 0.95], [0.31, 1.0]],
    },
    exits: [
      {
        id: "escalera-aljibe", to: "tuneles", toExit: "tunel-torre", label: "Bajar al aljibe",
        hotspot: [[0.0, 0.82], [0.06, 0.82], [0.06, 1.0], [0.0, 1.0]], approach: [0.05, 0.92],
        // Desde la torre se baja la palanca del aljibe: el agua se retira.
        onUse: [{ set: "compuertas-abiertas" }],
      },
      {
        id: "pasarela-observatorio", to: "observatorio", toExit: "pasarela-torre", label: "Pasarela al observatorio",
        hotspot: [[0.1, 0.97], [0.3, 0.97], [0.3, 1.0], [0.1, 1.0]], approach: [0.2, 0.96],
        // Desde este lado el cerrojo de estrellas se descorre con la mano.
        onUse: [{ set: "pasarela-abierta" }],
      },
    ],
    props: [
      { id: "campana", label: "Campana de las trece", hotspot: [[0.55, 0.02], [0.68, 0.02], [0.68, 0.28], [0.55, 0.28]], approach: [0.26, 0.95] },
      { id: "engranajes", label: "Mecanismo del reloj", hotspot: [[0.42, 0.32], [0.65, 0.32], [0.65, 0.78], [0.42, 0.78]], approach: [0.27, 0.95] },
      { id: "esfera-reloj", label: "Esfera del reloj", hotspot: [[0.17, 0.08], [0.42, 0.08], [0.42, 0.62], [0.17, 0.62]], approach: [0.15, 0.9] },
    ],
    poi: [[0.1, 0.92], [0.22, 0.96]],
    spawn: [0.15, 0.93],
    actorTint: 0xb6b3b0,
  },
};
