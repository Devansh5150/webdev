import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./", // relative paths: the built site runs as static files, fully offline
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 2500 },
  test: { environment: "node", include: ["src/**/*.test.{js,ts}"] },
});
