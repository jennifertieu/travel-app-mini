import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-rsbuild-plugin";

const useZephyr = process.env.USE_ZEPHYR === "true";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: "shell",
      filename: "remoteEntry.js",
      remotes: {
        pretrip_main: "mf_pretrip@http://localhost:3001/mf-manifest.json",
        itinerary_main: "mf_itinerary@http://localhost:3002/mf-manifest.json",
        duringtrip_main: "mf_duringtrip@http://localhost:3003/mf-manifest.json",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: "^19.0.0",
          eager: true,
          strictVersion: false,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: "^19.0.0",
          eager: true,
          strictVersion: false,
        },
        "@tanstack/react-router": {
          singleton: true,
          eager: false,
          strictVersion: false,
        },
      },
    }),
    ...(useZephyr ? [withZephyr()] : []),
  ],
  server: {
    port: 2000,
  },
  html: {
    title: "Travel App",
  },
});
