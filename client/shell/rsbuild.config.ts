import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-webpack-plugin";

export default defineConfig(
  withZephyr()({
    plugins: [
      pluginReact(),
      pluginModuleFederation({
        name: "shell",
        filename: "remoteEntry.js",
        remotes: {
          // Development: Use same aliases for consistency
          pretrip_main: "mf_pretrip@http://localhost:3001/remoteEntry.js",
          itinerary_main: "mf_itinerary@http://localhost:3002/remoteEntry.js",
          duringtrip_main: "mf_duringtrip@http://localhost:3003/remoteEntry.js",
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: "^19.0.0",
            eager: true, // Keep eager for shell (host)
            strictVersion: false,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^19.0.0",
            eager: true, // Keep eager for shell (host)
            strictVersion: false,
          },
          "@tanstack/react-router": {
            singleton: true,
            eager: false,
            strictVersion: false,
          },
        },
      }),
    ],
    server: {
      port: 2000,
    },
    html: {
      title: "Travel App",
    },
  }),
);
