import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

const USE_ZEPHYR = process.env.USE_ZEPHYR === "true";

// Conditionally import Zephyr plugin
const getPlugins = async () => {
  const plugins = [
    pluginReact(),
    pluginModuleFederation({
      name: "shell",
      filename: "remoteEntry.js",
      remotes: USE_ZEPHYR
        ? {
            // Production: Use unique aliases to prevent Zephyr auto-resolution
            // Latest builds with assetPrefix: "auto"
            pretrip_main:
              "mf_pretrip@https://thomas-nguyen-203-mf-pretrip-travel-app-lgt-champ-d3340488a-ze.zephyrcloud.app/remoteEntry.js",
            itinerary_main:
              "mf_itinerary@https://thomas-nguyen-204-mf-itinerary-travel-app-lgt-cha-a92a0e053-ze.zephyrcloud.app/remoteEntry.js",
            duringtrip_main:
              "mf_duringtrip@https://thomas-nguyen-205-mf-duringtrip-travel-app-lgt-ch-16c713679-ze.zephyrcloud.app/remoteEntry.js",
          }
        : {
            // Development: Use same aliases for consistency
            pretrip_main: "mf_pretrip@http://localhost:3001/remoteEntry.js",
            itinerary_main: "mf_itinerary@http://localhost:3002/remoteEntry.js",
            duringtrip_main:
              "mf_duringtrip@http://localhost:3003/remoteEntry.js",
          },
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
        "@tanstack/react-router": { singleton: true },
      },
    }),
  ];

  if (USE_ZEPHYR) {
    const { withZephyr } = await import("zephyr-rsbuild-plugin");
    plugins.push(withZephyr());
  }

  return plugins;
};

export default defineConfig(async () => ({
  plugins: await getPlugins(),
  server: {
    port: 2000,
  },
  html: {
    title: "Travel App",
  },
}));
