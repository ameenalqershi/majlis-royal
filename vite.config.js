import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Both LAN hosts serve a single level of static files.
  build: { assetsDir: '', target: 'es2020' },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
});
