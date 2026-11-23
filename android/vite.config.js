import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The private file:// WebView calls Majlis.request via evaluateJavascript.
export default defineConfig({
  publicDir: false,
  build: {
    target: 'es2020',
    outDir: 'build/engine',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('../core/rooms.js', import.meta.url)),
      name: 'Majlis',
      formats: ['iife'],
      fileName: () => 'engine.js',
    },
  },
});
