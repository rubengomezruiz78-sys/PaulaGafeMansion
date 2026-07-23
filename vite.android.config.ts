import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const projectRoot = __dirname;

export default defineConfig({
  root: path.join(projectRoot, "android-web"),
  base: "/",
  publicDir: path.join(projectRoot, "public"),
  plugins: [react()],
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
