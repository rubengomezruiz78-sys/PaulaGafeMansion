import { defineConfig } from "vite";
import path from "node:path";

const projectRoot = __dirname;

// Juego v2 (Phaser). public/ solo contiene lo que el juego usa; el arte fuente
// vive en art/ y el juego v1 en legacy/ (fuera del APK).
export default defineConfig({
  root: path.join(projectRoot, "game-web"),
  base: "./",
  publicDir: path.join(projectRoot, "public"),
  server: { host: true },
  build: {
    outDir: path.join(projectRoot, "android", "app", "src", "main", "assets"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 2000,
  },
});
