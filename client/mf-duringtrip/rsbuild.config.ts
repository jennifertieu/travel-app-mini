import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";
import { withZephyr } from "zephyr-rsbuild-plugin";

const useZephyr = process.env.USE_ZEPHYR === "true";

export default defineConfig(() => {
  return {
    plugins: [
      pluginReact(),
      pluginModuleFederation({
        name: "mf_duringtrip",
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
      port: 3003,
    },
    html: {
      title: "During Trip MFE",
      favicon: "./public/favicon.svg",
    },
    output: {
      assetPrefix: "auto",
    },
    resolve: {
      alias: {
        "@": "./src",
      },
    },
    source: {
      define: {
        "process.env.DISABLE_DTS": JSON.stringify("true"),
      },
    },
  };
});
