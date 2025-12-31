import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const USE_ZEPHYR = process.env.USE_ZEPHYR === 'true';

// Conditionally import Zephyr plugin
const getPlugins = async () => {
  const plugins = [
    pluginReact(),
    pluginModuleFederation({
      name: 'mf_pretrip',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ];

  if (USE_ZEPHYR) {
    const { withZephyr } = await import('zephyr-rsbuild-plugin');
    plugins.push(withZephyr());
  }

  return plugins;
};

export default defineConfig(async () => ({
  plugins: await getPlugins(),
  server: {
    port: 3001,
  },
  html: {
    title: 'Pre-Trip MFE',
  },
}));
