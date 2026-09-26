/**
 * Segunda planta (ampliación 2.2): la escalera del fondo de la galería sube a
 * un rellano con un reloj de pie; desde allí se va al aula de la institutriz,
 * al cuarto de costura, a la alcoba de la bisabuela Aurelia, se sube al desván
 * y, por una escalerilla, a la pajarera de cristal del tejado. Así la casa
 * tiene sentido de abajo arriba: planta baja → planta alta → segunda planta →
 * desván → observatorio y torre.
 *
 * Calibradas con dos referencias cada una (pomos de puerta a 1 m, mesas,
 * chimenea, puertas), como el resto de la casa.
 */
import type { ZoneDef, ZoneId } from "../zones";

export const SEGUNDA_PLANTA: Partial<Record<ZoneId, ZoneDef>> = {
  rellano: {
    id: "rellano",
    name: "Rellano del reloj",
    image: "world/rellano.webp",
    // Cámara a 1,05 m. Verificado: puerta del fondo 2,15 m, reloj de pie 2,8 m (con el copete), adulto junto al reloj.
    perspective: { horizon: 0.5, k: 0.95, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.0, 0.9], [0.12, 0.855], [0.26, 0.815], [0.31, 0.79], [0.33, 0.72], [0.36, 0.675], [0.47, 0.665],
        [0.6, 0.67], [0.66, 0.695], [0.77, 0.705], [0.84, 0.745], [0.92, 0.785], [1.0, 0.81], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "escalera-galeria", to: "galeria", toExit: "escalera-desvan", label: "Bajar a la galería",
        hotspot: [[0.35, 0.95], [0.7, 0.95], [0.7, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "escalera-desvan", to: "desvan", toExit: "hueco-escalera", label: "Subir al desván",
        hotspot: [[0.0, 0.12], [0.27, 0.12], [0.27, 0.8], [0.0, 0.86]], approach: [0.2, 0.87],
      },
      {
        id: "escalerilla-pajarera", to: "pajarera", toExit: "escalerilla-rellano", label: "Escalerilla al tejado",
        hotspot: [[0.6, 0.26], [0.79, 0.26], [0.79, 0.67], [0.6, 0.67]], approach: [0.7, 0.72],
      },
      {
        id: "puerta-alcoba", to: "alcoba", toExit: "puerta-rellano", label: "Alcoba de Aurelia",
        hotspot: [[0.38, 0.34], [0.46, 0.34], [0.46, 0.655], [0.38, 0.655]], approach: [0.42, 0.69],
      },
      {
        id: "puerta-costura", to: "costura", toExit: "puerta-rellano", label: "Cuarto de costura",
        hotspot: [[0.285, 0.41], [0.36, 0.41], [0.36, 0.64], [0.285, 0.64]], approach: [0.36, 0.7],
      },
      {
        id: "puerta-aula", to: "aula", toExit: "puerta-rellano", label: "Aula de la institutriz",
        hotspot: [[0.84, 0.31], [0.93, 0.31], [0.93, 0.74], [0.84, 0.74]], approach: [0.84, 0.79],
      },
    ],
    props: [
      { id: "reloj-pie", label: "Reloj de pie", hotspot: [[0.48, 0.22], [0.54, 0.22], [0.54, 0.67], [0.48, 0.67]], approach: [0.52, 0.72] },
      { id: "ventana-redonda", label: "Ventana redonda", hotspot: [[0.37, 0.09], [0.46, 0.09], [0.46, 0.27], [0.37, 0.27]], approach: [0.45, 0.8] },
      { id: "fotos-rellano", label: "Fotografías antiguas", hotspot: [[0.305, 0.31], [0.35, 0.31], [0.35, 0.39], [0.305, 0.39]], approach: [0.37, 0.72] },
      { id: "papel-alfombra", label: "Papel en la alfombra", hotspot: [[0.84, 0.92], [0.93, 0.92], [0.93, 0.98], [0.84, 0.98]], approach: [0.84, 0.9] },
    ],
    poi: [[0.5, 0.78], [0.65, 0.85], [0.4, 0.9], [0.75, 0.8], [0.2, 0.93]],
    spawn: [0.55, 0.88],
    actorTint: 0xb4b8c8,
  },

  aula: {
    id: "aula",
    name: "Aula de la institutriz",
    image: "world/aula.webp",
    // Cámara a 1,25 m. Verificado: mesa de la maestra 0,8 m, pupitres 0,7 m, puerta 2 m.
    perspective: { horizon: 0.42, k: 0.8, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.0, 0.9], [0.08, 0.84], [0.16, 0.8], [0.3, 0.82], [0.45, 0.86], [0.6, 0.84], [0.7, 0.8],
        [0.73, 0.74], [0.78, 0.73], [0.82, 0.76], [0.9, 0.79], [0.98, 0.81], [1.0, 0.82], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "puerta-rellano", to: "rellano", toExit: "puerta-aula", label: "Rellano",
        hotspot: [[0.04, 0.18], [0.17, 0.18], [0.17, 0.78], [0.04, 0.78]], approach: [0.13, 0.86],
      },
    ],
    props: [
      { id: "pizarra", label: "Pizarra", hotspot: [[0.29, 0.17], [0.59, 0.17], [0.59, 0.43], [0.29, 0.43]], approach: [0.45, 0.9] },
      { id: "mesa-maestra", label: "Mesa de la maestra", hotspot: [[0.23, 0.44], [0.42, 0.44], [0.42, 0.74], [0.23, 0.74]], approach: [0.34, 0.84] },
      { id: "pupitres", label: "Pupitres", hotspot: [[0.43, 0.54], [0.69, 0.54], [0.69, 0.8], [0.43, 0.8]], approach: [0.55, 0.9] },
      { id: "esqueleto", label: "Esqueleto de la clase", hotspot: [[0.7, 0.26], [0.77, 0.26], [0.77, 0.72], [0.7, 0.72]], approach: [0.72, 0.79] },
      { id: "abaco", label: "Ábaco", hotspot: [[0.775, 0.45], [0.85, 0.45], [0.85, 0.72], [0.775, 0.72]], approach: [0.8, 0.8] },
      { id: "mapa-aula", label: "Mapa del mundo", hotspot: [[0.63, 0.1], [0.71, 0.1], [0.71, 0.25], [0.63, 0.25]], approach: [0.65, 0.84] },
      { id: "ventana-aula", label: "Ventanal", hotspot: [[0.8, 0.0], [0.96, 0.0], [0.96, 0.43], [0.8, 0.43]], approach: [0.88, 0.86] },
    ],
    poi: [[0.3, 0.9], [0.6, 0.93], [0.85, 0.88], [0.45, 0.95], [0.2, 0.88]],
    spawn: [0.45, 0.92],
    actorTint: 0xb8b8c4,
  },

  costura: {
    id: "costura",
    name: "Cuarto de costura",
    image: "world/costura.webp",
    // Cámara a 1,39 m. Verificado: puerta 2,2 m, asiento de la mecedora 0,45 m, maniquí 1,6 m.
    perspective: { horizon: 0.34, k: 0.717, focal: 1.0 },
    walk: {
      outer: [
        [0.0, 1.0], [0.0, 0.93], [0.12, 0.92], [0.24, 0.9], [0.3, 0.82], [0.46, 0.81], [0.47, 0.86], [0.6, 0.87],
        [0.78, 0.86], [0.8, 0.92], [0.95, 0.92], [0.96, 0.8], [1.0, 0.79], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "puerta-rellano", to: "rellano", toExit: "puerta-costura", label: "Rellano",
        hotspot: [[0.83, 0.1], [0.95, 0.1], [0.95, 0.5], [0.83, 0.5]], approach: [0.88, 0.95],
      },
    ],
    props: [
      { id: "maniqui", label: "Vestido de la fiesta", hotspot: [[0.3, 0.27], [0.45, 0.27], [0.45, 0.8], [0.3, 0.8]], approach: [0.4, 0.88] },
      { id: "maquina-coser", label: "Máquina de coser", hotspot: [[0.04, 0.45], [0.22, 0.45], [0.22, 0.87], [0.04, 0.87]], approach: [0.2, 0.95] },
      { id: "hilos", label: "Carretes de hilo", hotspot: [[0.46, 0.14], [0.73, 0.14], [0.73, 0.45], [0.46, 0.45]], approach: [0.6, 0.9] },
      { id: "tarro-botones", label: "Tarro de botones", hotspot: [[0.58, 0.46], [0.66, 0.46], [0.66, 0.55], [0.58, 0.55]], approach: [0.62, 0.9] },
      { id: "mecedora", label: "Mecedora", hotspot: [[0.79, 0.5], [0.95, 0.5], [0.95, 0.88], [0.79, 0.88]], approach: [0.85, 0.95] },
      { id: "libro-patrones", label: "Libro de patrones", hotspot: [[0.61, 0.9], [0.72, 0.9], [0.72, 1.0], [0.61, 1.0]], approach: [0.6, 0.93] },
    ],
    poi: [[0.3, 0.93], [0.5, 0.93], [0.7, 0.95], [0.2, 0.97], [0.88, 0.97]],
    spawn: [0.5, 0.93],
    actorTint: 0xc0b8bc,
  },

  alcoba: {
    id: "alcoba",
    name: "Alcoba de Aurelia",
    image: "world/alcoba.webp",
    // Cámara a 1,15 m. Verificado: repisa de la chimenea 1,2 m, tocador 0,78 m, cristalera 2,4 m.
    perspective: { horizon: 0.46, k: 0.87, focal: 1.0 },
    walk: {
      outer: [
        [0.1, 1.0], [0.12, 0.85], [0.28, 0.85], [0.45, 0.8], [0.47, 0.74], [0.5, 0.715], [0.72, 0.715], [0.78, 0.71],
        [0.92, 0.72], [0.93, 0.76], [0.92, 0.86], [0.95, 0.93], [1.0, 0.95], [1.0, 1.0],
      ],
    },
    exits: [
      {
        id: "puerta-rellano", to: "rellano", toExit: "puerta-alcoba", label: "Rellano",
        hotspot: [[0.35, 0.95], [0.7, 0.95], [0.7, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
      {
        id: "cristalera-pajarera", to: "pajarera", toExit: "puerta-alcoba", label: "Terraza de la pajarera",
        hotspot: [[0.78, 0.19], [0.95, 0.19], [0.95, 0.7], [0.78, 0.7]], approach: [0.85, 0.76],
      },
    ],
    props: [
      { id: "retrato-oval", label: "Retrato de Aurelia joven", hotspot: [[0.565, 0.16], [0.65, 0.16], [0.65, 0.39], [0.565, 0.39]], approach: [0.6, 0.76] },
      { id: "tocador", label: "Tocador con joyero", hotspot: [[0.02, 0.44], [0.22, 0.44], [0.22, 0.8], [0.02, 0.8]], approach: [0.18, 0.88] },
      { id: "chimenea-alcoba", label: "Chimenea", hotspot: [[0.53, 0.44], [0.71, 0.44], [0.71, 0.69], [0.53, 0.69]], approach: [0.62, 0.76] },
      { id: "cama-dosel", label: "Cama con dosel", hotspot: [[0.22, 0.2], [0.37, 0.2], [0.37, 0.8], [0.22, 0.8]], approach: [0.35, 0.88] },
      { id: "armario-alcoba", label: "Armario tallado", hotspot: [[0.38, 0.28], [0.47, 0.28], [0.47, 0.6], [0.38, 0.6]], approach: [0.5, 0.76] },
      { id: "espejo-ovalado", label: "Espejo ovalado", hotspot: [[0.08, 0.3], [0.16, 0.3], [0.16, 0.43], [0.08, 0.43]], approach: [0.18, 0.9] },
      { id: "puerta-vestidor", label: "Puerta del vestidor", hotspot: [[0.485, 0.3], [0.525, 0.3], [0.525, 0.66], [0.485, 0.66]], approach: [0.51, 0.73] },
    ],
    poi: [[0.55, 0.85], [0.7, 0.8], [0.8, 0.9], [0.4, 0.93], [0.6, 0.95]],
    spawn: [0.6, 0.9],
    actorTint: 0xc4b4b0,
  },

  pajarera: {
    id: "pajarera",
    name: "Pajarera de cristal",
    image: "world/pajarera.webp",
    // Cámara a 1,47 m. Verificado: puerta 2,2 m, jaula grande 2,7 m, baranda 0,9 m.
    perspective: { horizon: 0.52, k: 0.68, focal: 1.0 },
    walk: {
      outer: [[0.1, 1.0], [0.1, 0.86], [0.12, 0.78], [0.3, 0.77], [0.72, 0.76], [0.86, 0.78], [0.88, 0.86], [0.9, 0.96], [0.9, 1.0]],
      holes: [[[0.41, 0.76], [0.72, 0.76], [0.72, 0.84], [0.58, 0.845], [0.41, 0.81]]],
    },
    exits: [
      {
        id: "puerta-alcoba", to: "alcoba", toExit: "cristalera-pajarera", label: "Alcoba de Aurelia",
        hotspot: [[0.09, 0.36], [0.17, 0.36], [0.17, 0.76], [0.09, 0.76]], approach: [0.15, 0.82],
      },
      {
        id: "escalerilla-rellano", to: "rellano", toExit: "escalerilla-pajarera", label: "Bajar al rellano",
        hotspot: [[0.35, 0.95], [0.65, 0.95], [0.65, 1.0], [0.35, 1.0]], approach: [0.5, 0.97],
      },
    ],
    props: [
      { id: "jaula-grande", label: "Jaula grande", hotspot: [[0.41, 0.28], [0.59, 0.28], [0.59, 0.76], [0.41, 0.76]], approach: [0.5, 0.87] },
      { id: "fuente-pajaros", label: "Bebedero de los pájaros", hotspot: [[0.6, 0.62], [0.7, 0.62], [0.7, 0.83], [0.6, 0.83]], approach: [0.66, 0.88] },
      { id: "jaulas-colgadas", label: "Jaulas colgadas", hotspot: [[0.6, 0.08], [0.72, 0.08], [0.72, 0.46], [0.6, 0.46]], approach: [0.7, 0.86] },
      { id: "torre-lejana", label: "La torre, a lo lejos", hotspot: [[0.75, 0.3], [0.86, 0.3], [0.86, 0.6], [0.75, 0.6]], approach: [0.8, 0.84] },
    ],
    poi: [[0.3, 0.88], [0.5, 0.93], [0.75, 0.88], [0.2, 0.95], [0.8, 0.95]],
    spawn: [0.45, 0.92],
    actorTint: 0xa8b4cc,
  },
};
