import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import federation from "@originjs/vite-plugin-federation";
import path from "path";

const USE_ZEPHYR = process.env.USE_ZEPHYR === "true";

export default defineConfig(async () => {
  const plugins = [
    react(),
    federation({
      name: "mf_duringtrip",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "During Trip",
        short_name: "DuringTrip",
        description:
          "AI-powered travel assistant for real-time location-based recommendations",
        theme_color: "#3b82f6",
        icons: [
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ];

  // Conditionally add Zephyr plugin
  if (USE_ZEPHYR) {
    const { withZephyr } = await import("vite-plugin-zephyr");
    plugins.push(withZephyr());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3003,
    },
    build: {
      target: "esnext",
      minify: false,
      cssCodeSplit: false,
    },
  };
});
