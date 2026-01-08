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
      remotes: {
        mf_pretrip: "mf_pretrip@http://localhost:3001/remoteEntry.js",
        mf_itinerary: "mf_itinerary@http://localhost:3002/remoteEntry.js",
        mf_duringtrip: "mf_duringtrip@http://localhost:3003/remoteEntry.js",
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



