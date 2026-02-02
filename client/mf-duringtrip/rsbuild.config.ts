import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginModuleFederation } from "@module-federation/rsbuild-plugin";

export default defineConfig({
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
    port: 3003,
  },
  html: {
    title: "During Trip MFE",
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
});
