import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-webpack-plugin";

export default defineConfig(
  withZephyr()({
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
            eager: false, // Change back to false for remotes
            strictVersion: false,
          },
          "react-dom": {
            singleton: true,
            requiredVersion: "^19.0.0",
            eager: false, // Change back to false for remotes
            strictVersion: false,
          },
        },
      }),
    ],
    server: {
      port: 3002,
    },
    html: {
      title: "Itinerary MFE",
    },
    output: {
      assetPrefix: "auto",
    },
  }),
);
