import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-rsbuild-plugin";

const useZephyr = process.env.USE_ZEPHYR === "true";

// Rsbuild only exposes PUBLIC_* by default; we use VITE_* (e.g. VITE_SUPABASE_*) in .env.local
const { publicVars } = loadEnv({ prefixes: ["PUBLIC_", "VITE_"] });

export default defineConfig({
  source: {
    define: publicVars,
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: "mf_itinerary",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.tsx",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "^19.0.0",
          eager: false,
          strictVersion: false,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^19.0.0",
          eager: false,
          strictVersion: false,
        },
      },
      dts: false,
      dev: {
        disableDts: true,
      },
    }),
    ...(useZephyr ? [withZephyr()] : []),
  ],
  server: {
    port: 3002,
  },
  html: {
    title: "Itinerary MFE",
    favicon: "./public/favicon.svg",
  },
  output: {
    assetPrefix: "auto",
  },
});
