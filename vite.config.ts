import { defineConfig } from "vite";

// A tiny static game — no framework plugins needed.
export default defineConfig({
  server: { host: true, port: 5173 },
  build: { target: "es2022" },
});
