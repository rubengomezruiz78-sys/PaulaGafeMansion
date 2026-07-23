import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { rmSync } from "node:fs";

const projectRoot = __dirname;

// Recursos antiguos que ya no usa el juego: se excluyen del APK para reducir tamano.
const unusedLegacyAssets = [
  "character-baltasar.webp",
  "character-bruma.webp",
  "character-cast.png",
  "character-elvira.webp",
  "character-gafe.webp",
  "character-ines.webp",
  "character-paula-v2.png",
  "character-paula-walk.png",
  "character-paula.webp",
  "character-tomas.webp",
  "icon-paula-gafe-v2.png",
  "og.png",
  "file.svg",
  "globe.svg",
  "window.svg",
  "icon-256.png",
  "paula-gafe.ico",
];

export default defineConfig({
  root: path.join(projectRoot, "android-web"),
  base: "/",
  publicDir: path.join(projectRoot, "public"),
  plugins: [
    react(),
    {
      name: "exclude-unused-legacy-assets",
      apply: "build",
      closeBundle() {
        const assetsDir = path.join(projectRoot, "android", "app", "src", "main", "assets");
        for (const fileName of unusedLegacyAssets) {
          rmSync(path.join(assetsDir, fileName), { force: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      "next/image": path.join(projectRoot, "android-web", "apk-image.tsx"),
    },
  },
  build: {
    outDir: path.join(projectRoot, "android", "app", "src", "main", "assets"),
    emptyOutDir: true,
    sourcemap: false,
    target: "es2020",
  },
});
