import { fileURLToPath, URL } from "node:url";

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), {
    name: "precache-home-app",
    closeBundle() {
      const assets = readdirSync("dist/assets").map(name => `${base}assets/${name}`);
      const worker = readFileSync("dist/sw.js", "utf8");
      writeFileSync("dist/sw.js", worker.replace("/* BUILD_ASSETS */", assets.map(name => JSON.stringify(name)).join(",")));
    },
  }],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { proxy: { "/v1": { target: "http://127.0.0.1:18080" } } },
});
