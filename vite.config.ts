import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Using base:'./' makes GitHub Pages deployments easier without editing repo name.
// This is a single-page app (no routing), so relative assets are safe.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
