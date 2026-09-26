/**
 * Ala de la fiesta (ampliación): salón de baile, comedor de gala y jardín del
 * laberinto en la planta baja; taller del juguetero, estudio del pintor y
 * teatrito de Inés arriba. Pintadas con el mismo estilo que el resto de la
 * casa (tools/gen_rooms.py) y calibradas con dos referencias cada una.
 */
import type { ZoneDef, ZoneId } from "../zones";

export const ALA_FIESTA: Partial<Record<ZoneId, ZoneDef>> = {
  baile: {
    id: "baile",
    name: "Salón de baile",
    image: "world/baile.webp",
    // Cámara a 1,44 m. Verificado: puerta del fondo 2,6 m, sillas enfundadas ≈ 1 m, violonchelo 1,3 m.
    perspective: { horizon: 0.494, k: 0.69, focal: 1.0 },
    walk: {
      outer: [
        [0.06, 1.0], [0.08, 0.9], [0.16, 0.83], [0.26, 0.76], [0.34, 0.7], [0.4, 0.665], [0.46, 0.645],
        [0.6, 0.645], [0.68, 0.68], [0.74, 0.74], [0.84, 0.83], [0.92, 0.9], [0.96, 1.0],
      ],
    },
    exits: [
      {
        id: "puerta-musica", to: "musica", toExit: "puerta-baile", label: "Salón de música",
        hotspot: [[0.35, 0.95], [0.65, 0.95], [0.65, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "puerta-comedor", to: "comedor", toExit: "arco-baile", label: "Comedor de gala",
        hotspot: [[0.455, 0.37], [0.56, 0.37], [0.56, 0.63], [0.455, 0.63]], approach: [0.51, 0.665],
      },
      {
        id: "cristalera-jardin", to: "jardin", toExit: "terraza-baile", label: "Terraza del jardín",
        hotspot: [[0.05, 0.12], [0.15, 0.12], [0.15, 0.58], [0.05, 0.58]], approach: [0.12, 0.92],
      },
    ],
    props: [
      { id: "atril", label: "Atril del director", hotspot: [[0.68, 0.44], [0.84, 0.44], [0.84, 0.7], [0.68, 0.7]], approach: [0.72, 0.75] },
      { id: "espejo-dorado", label: "Espejo dorado", hotspot: [[0.85, 0.16], [0.95, 0.16], [0.95, 0.55], [0.85, 0.55]], approach: [0.88, 0.92] },
      { id: "lamparas", label: "Lámparas de cristal", hotspot: [[0.43, 0.07], [0.57, 0.07], [0.57, 0.28], [0.43, 0.28]], approach: [0.5, 0.8] },
      { id: "sillas-enfundadas", label: "Sillas enfundadas", hotspot: [[0.1, 0.55], [0.33, 0.55], [0.33, 0.72], [0.1, 0.72]], approach: [0.3, 0.78] },
    ],
    poi: [[0.5, 0.72], [0.35, 0.8], [0.65, 0.8], [0.5, 0.9], [0.6, 0.7], [0.4, 0.93]],
    spawn: [0.5, 0.9],
    actorTint: 0xb4b2c6,
  },

  comedor: {
    id: "comedor",
    name: "Comedor de gala",
    image: "world/comedor.webp",
    // Cámara a 1,35 m. Verificado: puerta de servicio 2,3 m, sillas de respaldo alto 1,2 m.
    perspective: { horizon: 0.4, k: 0.74, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.01, 0.86], [0.1, 0.81], [0.19, 0.69], [0.24, 0.63], [0.31, 0.62], [0.34, 0.66],
        [0.34, 0.9], [0.4, 0.935], [0.62, 0.935], [0.67, 0.9], [0.675, 0.66], [0.71, 0.63], [0.725, 0.66],
        [0.725, 0.8], [0.93, 0.83], [1.0, 0.9], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "arco-baile", to: "baile", toExit: "puerta-comedor", label: "Salón de baile",
        hotspot: [[0.69, 0.3], [0.73, 0.3], [0.73, 0.6], [0.69, 0.6]], approach: [0.71, 0.65],
      },
      {
        id: "puerta-servicio", to: "cocina", toExit: "puerta-comedor", label: "Cocina",
        hotspot: [[0.19, 0.22], [0.255, 0.22], [0.255, 0.62], [0.19, 0.62]], approach: [0.26, 0.65],
      },
    ],
    props: [
      { id: "mesa-banquete", label: "Mesa del banquete", hotspot: [[0.37, 0.55], [0.63, 0.55], [0.63, 0.86], [0.37, 0.86]], approach: [0.5, 0.95] },
      { id: "tarta-campana", label: "Tarta bajo la campana de cristal", hotspot: [[0.46, 0.39], [0.54, 0.39], [0.54, 0.545], [0.46, 0.545]], approach: [0.45, 0.95] },
      { id: "aparador-porcelana", label: "Aparador de porcelana", hotspot: [[0.03, 0.44], [0.21, 0.44], [0.21, 0.78], [0.03, 0.78]], approach: [0.16, 0.86] },
      { id: "chimenea", label: "Chimenea", hotspot: [[0.74, 0.38], [0.92, 0.38], [0.92, 0.72], [0.74, 0.72]], approach: [0.8, 0.87] },
      { id: "tapiz", label: "Tapiz", hotspot: [[0.0, 0.02], [0.15, 0.02], [0.15, 0.4], [0.0, 0.4]], approach: [0.1, 0.9] },
    ],
    poi: [[0.28, 0.7], [0.2, 0.9], [0.5, 0.965], [0.8, 0.9], [0.7, 0.72]],
    spawn: [0.5, 0.965],
    actorTint: 0xc0b4a4,
  },

  jardin: {
    id: "jardin",
    name: "Jardín del laberinto",
    image: "world/jardin.webp",
    // Cámara baja (1,1 m). Verificado: banco 0,85 m, farolas 2 m, fuente con el ángel ≈ 2 m.
    perspective: { horizon: 0.6, k: 0.91, focal: 1.0 },
    walk: {
      outer: [
        [0.12, 1.0], [0.1, 0.88], [0.2, 0.85], [0.33, 0.84], [0.36, 0.78], [0.4, 0.71], [0.45, 0.675],
        [0.56, 0.675], [0.62, 0.71], [0.73, 0.74], [0.86, 0.79], [0.9, 0.86], [0.88, 1.0],
      ],
    },
    exits: [
      {
        id: "terraza-baile", to: "baile", toExit: "cristalera-jardin", label: "Terraza del salón de baile",
        hotspot: [[0.35, 0.95], [0.65, 0.95], [0.65, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "puerta-invernadero", to: "invernadero", toExit: "cristalera-jardin", label: "Invernadero",
        hotspot: [[0.82, 0.4], [0.93, 0.4], [0.93, 0.72], [0.82, 0.72]], approach: [0.84, 0.8],
      },
    ],
    props: [
      { id: "entrada-laberinto", label: "Entrada del laberinto", hotspot: [[0.44, 0.44], [0.56, 0.44], [0.56, 0.66], [0.44, 0.66]], approach: [0.5, 0.7] },
      { id: "fuente-angel", label: "Fuente del ángel", hotspot: [[0.09, 0.42], [0.35, 0.42], [0.35, 0.82], [0.09, 0.82]], approach: [0.3, 0.86] },
      { id: "banco-jardin", label: "Banco de piedra", hotspot: [[0.72, 0.62], [0.81, 0.62], [0.81, 0.74], [0.72, 0.74]], approach: [0.75, 0.78] },
      { id: "rosales", label: "Rosales", hotspot: [[0.0, 0.38], [0.08, 0.38], [0.08, 0.75], [0.0, 0.75]], approach: [0.14, 0.9] },
    ],
    poi: [[0.5, 0.75], [0.4, 0.86], [0.65, 0.8], [0.5, 0.92], [0.75, 0.86]],
    spawn: [0.5, 0.93],
    actorTint: 0xa8b8c8,
  },

  taller: {
    id: "taller",
    name: "Taller del juguetero",
    image: "world/taller.webp",
    // Cámara alta (1,85 m). Verificado: banco de trabajo 0,9 m, puerta 2,2 m, bailarina autómata 1,2 m.
    perspective: { horizon: 0.325, k: 0.54, focal: 1.0 },
    walk: {
      outer: [
        [0.04, 1.0], [0.05, 0.86], [0.1, 0.8], [0.12, 0.74], [0.17, 0.72], [0.3, 0.74], [0.32, 0.8],
        [0.34, 0.905], [0.66, 0.92], [0.7, 0.8], [0.73, 0.72], [0.8, 0.7], [0.92, 0.71], [0.95, 0.8], [0.97, 1.0],
      ],
      holes: [
        [[0.2, 0.78], [0.29, 0.78], [0.29, 0.86], [0.2, 0.86]],
        [[0.68, 0.8], [0.77, 0.8], [0.77, 0.88], [0.68, 0.88]],
      ],
    },
    exits: [
      {
        id: "puerta-galeria", to: "galeria", toExit: "puerta-taller", label: "Galería",
        hotspot: [[0.03, 0.2], [0.16, 0.2], [0.16, 0.72], [0.03, 0.72]], approach: [0.14, 0.76],
      },
      {
        id: "arco-estudio", to: "estudio", toExit: "puerta-taller", label: "Estudio del pintor",
        hotspot: [[0.78, 0.3], [0.93, 0.3], [0.93, 0.7], [0.78, 0.7]], approach: [0.84, 0.74],
      },
    ],
    props: [
      { id: "banco-trabajo", label: "Banco de trabajo", hotspot: [[0.33, 0.45], [0.7, 0.45], [0.7, 0.85], [0.33, 0.85]], approach: [0.5, 0.95] },
      { id: "bailarina-automata", label: "Bailarina autómata", hotspot: [[0.19, 0.49], [0.31, 0.49], [0.31, 0.77], [0.19, 0.77]], approach: [0.25, 0.9] },
      { id: "munecas", label: "Estantes de muñecas", hotspot: [[0.2, 0.25], [0.4, 0.25], [0.4, 0.44], [0.2, 0.44]], approach: [0.3, 0.76] },
      { id: "rueda-engranajes", label: "Rueda de engranajes", hotspot: [[0.53, 0.23], [0.61, 0.23], [0.61, 0.41], [0.53, 0.41]], approach: [0.6, 0.95] },
      { id: "robot-tambor", label: "Robot del tambor", hotspot: [[0.705, 0.63], [0.77, 0.63], [0.77, 0.79], [0.705, 0.79]], approach: [0.74, 0.93] },
    ],
    poi: [[0.2, 0.92], [0.5, 0.96], [0.82, 0.85], [0.14, 0.8], [0.85, 0.76]],
    spawn: [0.5, 0.95],
    actorTint: 0xc8b39a,
  },

  estudio: {
    id: "estudio",
    name: "Estudio del pintor",
    image: "world/estudio.webp",
    // Cámara a 1,63 m. Verificado: sofá 1,1 m, caballete grande 2,4 m.
    perspective: { horizon: 0.46, k: 0.61, focal: 1.0 },
    walk: {
      outer: [
        [0.12, 1.0], [0.18, 0.92], [0.2, 0.84], [0.3, 0.8], [0.36, 0.74], [0.5, 0.72], [0.56, 0.74],
        [0.75, 0.74], [0.8, 0.76], [0.88, 0.78], [0.92, 0.84], [0.96, 1.0],
      ],
      holes: [[[0.33, 0.76], [0.5, 0.76], [0.5, 0.9], [0.4, 0.9], [0.33, 0.84]]],
    },
    exits: [
      {
        id: "puerta-taller", to: "taller", toExit: "arco-estudio", label: "Taller del juguetero",
        hotspot: [[0.83, 0.32], [0.95, 0.32], [0.95, 0.75], [0.83, 0.75]], approach: [0.86, 0.8],
      },
    ],
    props: [
      { id: "caballete", label: "Caballete con el retrato", hotspot: [[0.35, 0.3], [0.46, 0.3], [0.46, 0.6], [0.35, 0.6]], approach: [0.44, 0.94] },
      { id: "paleta", label: "Paleta y botes de pintura", hotspot: [[0.47, 0.53], [0.55, 0.53], [0.55, 0.6], [0.47, 0.6]], approach: [0.53, 0.76] },
      { id: "lienzos", label: "Lienzos apoyados", hotspot: [[0.0, 0.38], [0.14, 0.38], [0.14, 0.85], [0.0, 0.85]], approach: [0.2, 0.94] },
      { id: "busto", label: "Busto de yeso", hotspot: [[0.145, 0.41], [0.2, 0.41], [0.2, 0.55], [0.145, 0.55]], approach: [0.25, 0.86] },
      { id: "claraboya", label: "Claraboya", hotspot: [[0.1, 0.0], [0.55, 0.0], [0.55, 0.28], [0.1, 0.28]], approach: [0.4, 0.95] },
      { id: "sofa", label: "Sofá de terciopelo", hotspot: [[0.58, 0.53], [0.78, 0.53], [0.78, 0.73], [0.58, 0.73]], approach: [0.66, 0.78] },
    ],
    poi: [[0.6, 0.8], [0.3, 0.9], [0.75, 0.9], [0.55, 0.95], [0.85, 0.85]],
    spawn: [0.6, 0.92],
    actorTint: 0xb8b6c4,
  },

  teatro: {
    id: "teatro",
    name: "Teatrito de Inés",
    image: "world/teatro.webp",
    // Cámara a 1,33 m. Verificado: escenario 0,8 m, sillitas 0,7 m, puerta 2,4 m.
    perspective: { horizon: 0.53, k: 0.75, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.0, 0.8], [0.06, 0.745], [0.17, 0.735], [0.25, 0.76], [0.4, 0.81], [0.43, 0.72],
        [0.59, 0.72], [0.61, 0.82], [0.75, 0.8], [0.82, 0.76], [0.9, 0.8], [0.96, 0.86], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "puerta-dormitorio", to: "dormitorio", toExit: "puertecita-teatro", label: "Dormitorio de Inés",
        hotspot: [[0.03, 0.3], [0.16, 0.3], [0.16, 0.72], [0.03, 0.72]], approach: [0.12, 0.77],
      },
    ],
    props: [
      { id: "escenario", label: "Escenario de marionetas", hotspot: [[0.36, 0.26], [0.68, 0.26], [0.68, 0.6], [0.36, 0.6]], approach: [0.51, 0.745] },
      { id: "marionetas", label: "Marionetas colgadas", hotspot: [[0.33, 0.1], [0.7, 0.1], [0.7, 0.25], [0.33, 0.25]], approach: [0.5, 0.86] },
      { id: "baul-disfraces", label: "Baúl de los disfraces", hotspot: [[0.19, 0.46], [0.28, 0.46], [0.28, 0.72], [0.19, 0.72]], approach: [0.22, 0.77] },
      { id: "sillitas", label: "Sillitas del público", hotspot: [[0.25, 0.62], [0.41, 0.62], [0.41, 0.8], [0.25, 0.8]], approach: [0.33, 0.86] },
      { id: "cofre-mascaras", label: "Cofre de las máscaras", hotspot: [[0.73, 0.56], [0.82, 0.56], [0.82, 0.74], [0.73, 0.74]], approach: [0.8, 0.82] },
      { id: "puerta-pintada", label: "Puerta pintada", hotspot: [[0.84, 0.3], [0.95, 0.3], [0.95, 0.78], [0.84, 0.78]], approach: [0.88, 0.84] },
    ],
    poi: [[0.5, 0.8], [0.2, 0.86], [0.8, 0.88], [0.5, 0.95], [0.3, 0.92]],
    spawn: [0.5, 0.92],
    actorTint: 0xc4aeb0,
  },
};
