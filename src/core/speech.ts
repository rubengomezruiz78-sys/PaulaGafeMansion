/**
 * Entender lo que Paula dice al micrófono (lógica pura).
 * El reconocedor devuelve varias alternativas; se prueba con todas.
 */

/** Minúsculas, sin tildes ni signos, espacios simples. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TENS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

/**
 * Número dicho en cifras o con palabras («sesenta y tres», «mil doscientos»).
 * Devuelve null si no hay ningún número.
 */
export function parseSpanishNumber(text: string): number | null {
  const n = normalize(text);
  const digits = n.match(/\d+/);
  if (digits) return Number(digits[0]);
  let total = 0;
  let current = 0;
  let found = false;
  for (const w of n.split(" ")) {
    if (w === "y") continue;
    if (w in UNITS) current += UNITS[w];
    else if (w in TENS) current += TENS[w];
    else if (w in HUNDREDS) current += HUNDREDS[w];
    else if (w === "mil") {
      total += (current || 1) * 1000;
      current = 0;
    } else {
      if (found) break; // el número ya terminó («sesenta y tres campanadas»)
      continue;
    }
    found = true;
  }
  return found ? total + current : null;
}

const ORDINALS: [RegExp, number][] = [
  [/\b(primer[ao]?|uno|una|1)\b/, 0],
  [/\b(segund[ao]|dos|2)\b/, 1],
  [/\b(tercer[ao]?|tres|3)\b/, 2],
  [/\b(cuart[ao]|cuatro|4)\b/, 3],
  [/\b(quint[ao]|cinco|5)\b/, 4],
  [/\b(sext[ao]|seis|6)\b/, 5],
];

/**
 * Qué opción ha dicho: por su número («la dos», «la segunda») o por su texto
 * (la que más palabras comparte). Devuelve el índice o null.
 */
export function matchChoice(heard: readonly string[], options: readonly string[]): number | null {
  const opts = options.map(normalize);
  for (const h of heard.map(normalize)) {
    // Texto casi exacto primero (evita que «Hasta luego» se lea como número).
    // (por palabras enteras: «cuando» no contiene la nota «do»)
    const exact = opts.findIndex((o) => o && ` ${h} `.includes(` ${o} `));
    if (exact >= 0) return exact;
  }
  for (const h of heard.map(normalize)) {
    const words = h.split(" ");
    if (words.length <= 3) {
      for (const [re, i] of ORDINALS) if (i < options.length && re.test(h)) return i;
    }
  }
  let best: number | null = null;
  let bestScore = 0;
  for (const h of heard.map(normalize)) {
    const said = new Set(h.split(" ").filter((w) => w.length > 2));
    opts.forEach((o, i) => {
      const ws = o.split(" ").filter((w) => w.length > 2);
      if (!ws.length) return;
      const score = ws.filter((w) => said.has(w)).length / ws.length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
  }
  return bestScore >= 0.34 ? best : null;
}

const NOTE_WORDS: Record<string, number> = { do: 0, re: 1, mi: 2, fa: 3, sol: 4, la: 5, si: 6 };

/**
 * Notas dichas en orden («do, mi, sol»). Devuelve las primeras `count` que
 * se oyen, o null si no hay suficientes en ninguna alternativa.
 */
export function parseNotes(heard: readonly string[], count: number): number[] | null {
  for (const h of heard) {
    const notes = normalize(h).split(" ").filter((w) => w in NOTE_WORDS).map((w) => NOTE_WORDS[w]);
    if (notes.length >= count) return notes.slice(0, count);
  }
  return null;
}

export type Dir = "up" | "down" | "left" | "right";

const DIR_WORDS: [RegExp, Dir][] = [
  [/^(arriba|sube|subir|norte)$/, "up"],
  [/^(abajo|baja|bajar|sur)$/, "down"],
  [/^(izquierda|izquierdo|oeste)$/, "left"],
  [/^(derecha|derecho|este)$/, "right"],
];

/** Direcciones dichas en orden («arriba, arriba, derecha»). */
export function parseDirections(heard: readonly string[]): Dir[] {
  for (const h of heard) {
    const dirs: Dir[] = [];
    for (const w of normalize(h).split(" ")) {
      const hit = DIR_WORDS.find(([re]) => re.test(w));
      if (hit) dirs.push(hit[1]);
    }
    if (dirs.length) return dirs;
  }
  return [];
}

/** Dos opciones nombradas en la misma frase («rojo y amarillo»), sin repetir. */
export function matchTwo(heard: readonly string[], options: readonly string[]): [number, number] | null {
  const opts = options.map(normalize);
  for (const h of heard.map(normalize)) {
    const found = opts
      .map((o, i) => ({ i, at: o ? ` ${h} `.indexOf(` ${o} `) : -1 }))
      .filter((f) => f.at >= 0)
      .sort((a, b) => a.at - b.at);
    if (found.length >= 2) return [found[0].i, found[1].i];
  }
  return null;
}
