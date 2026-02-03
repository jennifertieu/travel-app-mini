import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-rspack-plugin";

export default defineConfig({
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
  define: {
    "process.env.DISABLE_DTS": JSON.stringify("true"),
  },
  tools: {
    rspack: async (
      config,
      { addRules, prependPlugins, appendPlugins, mergeConfig },
    ) => {
      if (process.env.USE_ZEPHYR === "true") {
        const zephyrConfig = await withZephyr()(config);
        return zephyrConfig;
      }
      return config;
    },
  },
});
