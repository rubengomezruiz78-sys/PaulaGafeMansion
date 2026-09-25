// Vuelca las zonas a JSON para las herramientas de verificación (tools/).
import { ZONES } from "../src/content/zones";
process.stdout.write(JSON.stringify(ZONES));
