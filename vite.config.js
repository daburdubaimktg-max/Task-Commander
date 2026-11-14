import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Relative base: the built site works under any GitHub Pages sub-path
  // (https://<user>.github.io/<repo>/) and the service worker stays inside that folder.
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Task Command Center",
        short_name: "Tasks",
        description: "Personal offline task manager",
        display: "standalone",
        start_url: "./",
        scope: "./",
        background_color: "#080810",
        theme_color: "#080810",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"] },
    }),
  ],
  test: { environment: "node", include: ["tests/**/*.test.js"] },
});
