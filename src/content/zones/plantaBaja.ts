/** Planta baja: vestíbulo, biblioteca, salón de música, invernadero y cocina. */
import type { ZoneDef, ZoneId } from "../zones";

export const PLANTA_BAJA: Partial<Record<ZoneId, ZoneDef>> = {
  vestibulo: {
    id: "vestibulo",
    name: "Vestíbulo de los ausentes",
    image: "world/vestibulo.webp",
    // Cámara a 1,70 m (ojos de adulto: los de Basilio caen en el horizonte).
    // Verificado: silla roja 1,05 m, consola 0,80 m, puerta verde 2,75 m.
    perspective: { horizon: 0.469, k: 0.587, focal: 1.0 },
    walk: {
      outer: [
        [0.005, 0.995], [0.005, 0.878], [0.118, 0.866], [0.118, 0.748], [0.168, 0.702],
        [0.272, 0.692], [0.3, 0.66], [0.345, 0.66], [0.378, 0.676], [0.575, 0.676],
        [0.598, 0.672], [0.642, 0.684], [0.682, 0.694], [0.832, 0.704], [0.842, 0.752],
        [0.962, 0.757], [0.995, 0.772], [0.995, 0.995],
      ],
    },
    exits: [
      {
        id: "puerta-biblioteca", to: "biblioteca", toExit: "puerta-vestibulo", label: "Biblioteca",
        hotspot: [[0.06, 0.33], [0.165, 0.33], [0.165, 0.7], [0.06, 0.7]], approach: [0.16, 0.725],
      },
      {
        id: "puerta-servicio", to: "cocina", toExit: "arco-vestibulo", label: "Puerta de servicio",
        hotspot: [[0.835, 0.3], [0.958, 0.3], [0.958, 0.748], [0.835, 0.748]], approach: [0.9, 0.772],
      },
      {
        id: "escalera", to: "galeria", toExit: "escalera-vestibulo", label: "Subir la escalera",
        hotspot: [[0.39, 0.4], [0.56, 0.4], [0.575, 0.672], [0.378, 0.672]], approach: [0.475, 0.69],
      },
      {
        id: "arco-sotano", to: "archivo", toExit: "escalera-vestibulo", label: "Arco del sótano",
        hotspot: [[0.28, 0.45], [0.35, 0.45], [0.35, 0.655], [0.28, 0.655]], approach: [0.322, 0.672],
      },
    ],
    props: [
      { id: "retrato-aurelia", label: "Retrato de Aurelia", hotspot: [[0.72, 0.16], [0.795, 0.16], [0.795, 0.5], [0.72, 0.5]], approach: [0.76, 0.72] },
      { id: "carta-mojada", label: "Media carta mojada", hotspot: [[0.795, 0.9], [0.86, 0.9], [0.86, 0.97], [0.795, 0.97]], approach: [0.8, 0.92] },
      { id: "campanilla", label: "Campanilla", hotspot: [[0.74, 0.88], [0.78, 0.88], [0.78, 0.94], [0.74, 0.94]], approach: [0.72, 0.92] },
      { id: "baul-ines", label: "Baúl de Inés", hotspot: [[0.575, 0.585], [0.625, 0.585], [0.625, 0.655], [0.575, 0.655]], approach: [0.6, 0.69] },
      { id: "paraguero", label: "Paragüero", hotspot: [[0.675, 0.595], [0.705, 0.595], [0.705, 0.68], [0.675, 0.68]], approach: [0.69, 0.705] },
    ],
    poi: [[0.25, 0.82], [0.47, 0.74], [0.62, 0.8], [0.8, 0.78], [0.55, 0.9], [0.35, 0.95]],
    spawn: [0.5, 0.9],
    actorTint: 0xc9c5c6,
  },

  biblioteca: {
    id: "biblioteca",
    name: "Biblioteca del marqués",
    image: "world/biblioteca.webp",
    // Cámara a 1,60 m (los ojos de Elvira caen en el horizonte). Verificado:
    // escritorio ≈ 0,9 m, reloj ≈ 3,2 m.
    perspective: { horizon: 0.48, k: 0.625, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 0.995], [0.0, 0.957], [0.228, 0.936], [0.238, 0.8], [0.29, 0.748],
        [0.468, 0.738], [0.515, 0.8], [0.53, 0.876], [0.662, 0.905], [0.682, 0.975],
        [0.8, 0.995],
      ],
    },
    exits: [
      {
        id: "puerta-vestibulo", to: "vestibulo", toExit: "puerta-biblioteca", label: "Vestíbulo",
        hotspot: [[0.0, 0.93], [0.11, 0.93], [0.11, 1.0], [0.0, 1.0]], approach: [0.07, 0.968],
      },
      {
        id: "arco-musica", to: "musica", toExit: "puerta-biblioteca", label: "Salón de música",
        hotspot: [[0.4, 0.3], [0.465, 0.3], [0.465, 0.735], [0.4, 0.735]], approach: [0.43, 0.75],
      },
    ],
    props: [
      { id: "reloj-aritmetico", label: "Reloj aritmético", hotspot: [[0.53, 0.1], [0.7, 0.1], [0.7, 0.87], [0.53, 0.87]], approach: [0.6, 0.9] },
      { id: "libro-abierto", label: "Libro abierto", hotspot: [[0.12, 0.6], [0.2, 0.6], [0.2, 0.68], [0.12, 0.68]], approach: [0.25, 0.94] },
    ],
    poi: [[0.35, 0.8], [0.45, 0.9], [0.3, 0.97], [0.6, 0.93]],
    spawn: [0.35, 0.9],
    actorTint: 0xd4c2ad,
  },

  musica: {
    id: "musica",
    name: "Salón de música",
    image: "world/musica.webp",
    // Cámara baja (0,91 m). Verificado: arpa 1,8 m, puerta 2,1 m, banqueta 0,5 m.
    perspective: { horizon: 0.56, k: 1.1, focal: 1.0 },
    walk: {
      outer: [
        [0.22, 1.0], [0.22, 0.85], [0.26, 0.72], [0.33, 0.68], [0.5, 0.64], [0.66, 0.66],
        [0.7, 0.72], [0.8, 0.72], [0.82, 0.8], [0.8, 0.98], [0.82, 1.0],
      ],
      holes: [
        [[0.34, 0.72], [0.46, 0.66], [0.64, 0.68], [0.66, 0.76], [0.53, 0.83], [0.36, 0.8]],
        [[0.28, 0.78], [0.4, 0.78], [0.4, 0.9], [0.28, 0.9]],
      ],
    },
    exits: [
      {
        id: "puerta-biblioteca", to: "biblioteca", toExit: "arco-musica", label: "Biblioteca",
        hotspot: [[0.67, 0.3], [0.8, 0.3], [0.8, 0.72], [0.67, 0.72]], approach: [0.74, 0.745],
      },
      {
        id: "puerta-jardin", to: "invernadero", toExit: "puerta-cristal", label: "Invernadero",
        hotspot: [[0.0, 0.88], [0.14, 0.88], [0.14, 1.0], [0.0, 1.0]], approach: [0.24, 0.96],
      },
      {
        id: "puerta-baile", to: "baile", toExit: "puerta-musica", label: "Salón de baile",
        hotspot: [[0.86, 0.8], [1.0, 0.8], [1.0, 1.0], [0.86, 1.0]], approach: [0.8, 0.96],
      },
    ],
    props: [
      { id: "piano", label: "Piano de cola", hotspot: [[0.33, 0.3], [0.66, 0.3], [0.66, 0.66], [0.33, 0.66]], approach: [0.45, 0.86] },
      { id: "arpa", label: "Arpa", hotspot: [[0.02, 0.2], [0.22, 0.2], [0.22, 0.95], [0.15, 0.95], [0.15, 0.86], [0.02, 0.86]], approach: [0.25, 0.9] },
      { id: "gramofono", label: "Gramófono", hotspot: [[0.82, 0.35], [0.98, 0.35], [0.98, 0.72], [0.82, 0.72]], approach: [0.78, 0.82] },
      { id: "partituras", label: "Partituras", hotspot: [[0.4, 0.9], [0.56, 0.9], [0.56, 0.99], [0.4, 0.99]], approach: [0.45, 0.93] },
    ],
    poi: [[0.5, 0.9], [0.72, 0.8], [0.3, 0.95], [0.6, 0.93], [0.74, 0.9]],
    spawn: [0.5, 0.93],
    actorTint: 0xaab7d0,
  },

  invernadero: {
    id: "invernadero",
    name: "Invernadero de luna",
    image: "world/invernadero.webp",
    // Cámara a 1,60 m. Verificado: fuente ≈ 1,3 m, banco ≈ 0,5 m.
    perspective: { horizon: 0.52, k: 0.625, focal: 1.0 },
    walk: {
      outer: [
        [0.2, 1.0], [0.2, 0.8], [0.25, 0.72], [0.35, 0.7], [0.5, 0.72], [0.62, 0.72],
        [0.7, 0.72], [0.87, 0.74], [0.9, 0.88], [0.95, 1.0],
      ],
      holes: [
        [[0.37, 0.79], [0.59, 0.79], [0.63, 0.84], [0.61, 0.93], [0.35, 0.93], [0.33, 0.84]],
        [[0.69, 0.76], [0.9, 0.76], [0.9, 0.83], [0.69, 0.83]],
      ],
    },
    exits: [
      {
        id: "puerta-cristal", to: "musica", toExit: "puerta-jardin", label: "Salón de música",
        hotspot: [[0.3, 0.95], [0.7, 0.95], [0.7, 1.0], [0.3, 1.0]], approach: [0.5, 0.965],
      },
      {
        id: "cristalera-jardin", to: "jardin", toExit: "puerta-invernadero", label: "Jardín del laberinto",
        hotspot: [[0.51, 0.36], [0.62, 0.36], [0.62, 0.72], [0.51, 0.72]], approach: [0.56, 0.74],
      },
    ],
    props: [
      { id: "flores-luna", label: "Flores de luna", hotspot: [[0.02, 0.3], [0.2, 0.3], [0.2, 0.7], [0.02, 0.7]], approach: [0.23, 0.85] },
      { id: "fuente", label: "Fuente", hotspot: [[0.41, 0.6], [0.5, 0.6], [0.5, 0.76], [0.62, 0.78], [0.62, 0.93], [0.34, 0.93], [0.34, 0.78], [0.41, 0.76]], approach: [0.48, 0.96] },
      { id: "regadera", label: "Regadera", hotspot: [[0.8, 0.88], [0.9, 0.88], [0.9, 0.98], [0.8, 0.98]], approach: [0.8, 0.95] },
      { id: "macetas", label: "Macetas del banco", hotspot: [[0.7, 0.66], [0.88, 0.66], [0.88, 0.76], [0.7, 0.76]], approach: [0.79, 0.86] },
    ],
    poi: [[0.26, 0.82], [0.66, 0.9], [0.3, 0.74], [0.75, 0.95], [0.3, 0.96]],
    spawn: [0.5, 0.96],
    actorTint: 0xa9c4c4,
  },

  cocina: {
    id: "cocina",
    name: "Cocina de las válvulas",
    image: "world/cocina.webp",
    // Cámara a 1,14 m. Verificado: encimera 0,95 m, puerta del fondo 2,1 m.
    perspective: { horizon: 0.44, k: 0.88, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.0, 0.955], [0.46, 0.94], [0.465, 0.65], [0.515, 0.628], [0.62, 0.628],
        [0.7, 0.64], [0.755, 0.68], [0.76, 0.975], [0.8, 1.0],
      ],
    },
    exits: [
      {
        id: "arco-vestibulo", to: "vestibulo", toExit: "puerta-servicio", label: "Vestíbulo",
        hotspot: [[0.49, 0.25], [0.56, 0.25], [0.56, 0.62], [0.49, 0.62]], approach: [0.52, 0.645],
      },
      {
        id: "porton-caldera", to: "tuneles", toExit: "escalera-cocina", label: "Portón bajo la caldera",
        hotspot: [[0.19, 0.6], [0.33, 0.6], [0.33, 0.86], [0.19, 0.86]], approach: [0.3, 0.955],
        requires: { flag: "porton-abierto" },
        lockedText: "El portón bajo la caldera está atrancado. Tomás sabrá cómo se abre.",
      },
      {
        id: "puerta-comedor", to: "comedor", toExit: "puerta-servicio", label: "Comedor de gala",
        hotspot: [[0.9, 0.72], [1.0, 0.72], [1.0, 1.0], [0.9, 1.0]], approach: [0.77, 0.975],
      },
    ],
    props: [
      { id: "caldera", label: "Manómetros de la caldera", hotspot: [[0.03, 0.15], [0.35, 0.15], [0.35, 0.5], [0.03, 0.5]], approach: [0.25, 0.96] },
      { id: "mesa-cocina", label: "Mesa de la cocina", hotspot: [[0.78, 0.58], [0.98, 0.58], [0.98, 0.7], [0.78, 0.7]], approach: [0.74, 0.8] },
      { id: "fregadero", label: "Fregadero", hotspot: [[0.63, 0.5], [0.74, 0.5], [0.74, 0.6], [0.63, 0.6]], approach: [0.66, 0.66] },
    ],
    poi: [[0.55, 0.75], [0.62, 0.9], [0.4, 0.97], [0.7, 0.8]],
    spawn: [0.6, 0.85],
    actorTint: 0xbfc7cf,
  },
};
