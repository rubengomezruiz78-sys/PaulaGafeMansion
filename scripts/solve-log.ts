/** Muestra cómo termina la partida el solucionador: `npx vite-node scripts/solve-log.ts` */
import { solveGame } from "../src/content/solver";
import { validateContent } from "../src/content/validate";

const problems = validateContent();
if (problems.length) console.log("Problemas de contenido:\n" + problems.join("\n"));
const r = solveGame();
console.log(`terminada: ${r.finished} (vueltas: ${r.rounds})`);
console.log(r.log.join("\n"));
