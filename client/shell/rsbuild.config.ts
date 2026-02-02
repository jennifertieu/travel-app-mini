import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-rspack-plugin";

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: "shell",
      filename: "remoteEntry.js",
      remotes: {
        pretrip_main:
          "mf_pretrip@https://thomas-nguyen-207-travel-app-pretrip-travel-app-l-4da9edcda-ze.zephyrcloud.app/remoteEntry.js",
        itinerary_main:
          "mf_itinerary@https://thomas-nguyen-208-travel-app-itinerary-travel-app-ca488dd61-ze.zephyrcloud.app/remoteEntry.js",
        duringtrip_main:
          "mf_duringtrip@https://thomas-nguyen-209-travel-app-duringtrip-travel-ap-bcb0cdfbd-ze.zephyrcloud.app/remoteEntry.js",
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
  ],
  server: {
    port: 2000,
  },
  html: {
    title: "Travel App",
  },
  tools: {
    rspack: async (
      config,
      { addRules, prependPlugins, appendPlugins, mergeConfig },
    ) => {
      const zephyrConfig = await withZephyr()(config);
      return zephyrConfig;
    },
  },
});
