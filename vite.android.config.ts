import { defineConfig, type Plugin } from "vite";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const projectRoot = __dirname;

// Número de versión del juego para las actualizaciones OTA: el número de
// commits de la rama (sube solo en cada cambio y sale igual en el PC que en
// GitHub). La app compara el del APK con el del manifiesto publicado.
function versionWeb(): number {
  if (process.env.VERSION_WEB) return Number(process.env.VERSION_WEB);
  try {
    return Number(execSync("git rev-list --count HEAD", { cwd: projectRoot }).toString().trim());
  } catch {
    return 0;
  }
}

function sellarVersion(): Plugin {
  return {
    name: "sellar-version-web",
    writeBundle(opciones) {
      const datos = { version: versionWeb(), fecha: new Date().toISOString() };
      fs.writeFileSync(path.join(opciones.dir ?? "", "version-web.json"), JSON.stringify(datos));
    },
  };
}

// Juego v2 (Phaser). public/ solo contiene lo que el juego usa; el arte fuente
// vive en art/ y el juego v1 en legacy/ (fuera del APK).
export default defineConfig({
  root: path.join(projectRoot, "game-web"),
  base: "./",
  publicDir: path.join(projectRoot, "public"),
  server: { host: true },
  plugins: [sellarVersion()],
  build: {
    outDir: path.join(projectRoot, "android", "app", "src", "main", "assets"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 2000,
  },
});
