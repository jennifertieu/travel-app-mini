import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-webpack-plugin";

export default defineConfig(
  withZephyr()({
    plugins: [
      pluginReact(),
      pluginModuleFederation({
        name: "mf_pretrip",
        filename: "remoteEntry.js",
        exposes: {
          "./App": "./src/App.tsx",
          "./place-search": "./src/lib/place-search.ts",
          "./unfurl": "./src/lib/unfurl.ts",
          "./IdeaDetailModal": "./src/components/modals/IdeaDetailModal.tsx",
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
        // Explicitly disable DTS
        dts: false,
        dev: {
          disableDts: true,
        },
      }),
    ],
    server: {
      port: 3001,
    },
    html: {
      title: "Pre-Trip MFE",
    },
    output: {
      assetPrefix: "auto",
    },
    resolve: {
      alias: {
        "@": "./src",
      },
    },
    // Add environment variable to disable DTS
    define: {
      "process.env.DISABLE_DTS": JSON.stringify("true"),
    },
  }),
);
