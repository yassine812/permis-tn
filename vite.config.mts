import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@react-native\/assets-registry\/registry$/,
        replacement: 'react-native-web/dist/modules/AssetRegistry/index.js',
      },
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-svg$/,
        replacement: fileURLToPath(
          new URL(
            './node_modules/react-native-svg/lib/module/elements.web.js',
            import.meta.url,
          ),
        ),
      },
      {
        find: /^react-native-safe-area-context$/,
        replacement: fileURLToPath(
          new URL(
            './node_modules/react-native-safe-area-context/src/index.tsx',
            import.meta.url,
          ),
        ),
      },
    ],
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
  },
  define: {
    __DEV__: JSON.stringify(command === 'serve'),
  },
  server: { host: '127.0.0.1', port: 5189, strictPort: true },
  build: { outDir: 'preview-dist' },
}));
