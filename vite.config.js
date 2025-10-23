// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  base: './', // <-- Mantenha isso, é crucial
  plugins: [react()],
  server: {
    port: 5173,
    clearScreen: false,
  },
  build: {
    // --- CORREÇÃO AQUI ---
    // Como o 'root' é 'client', o 'outDir: "dist"' salvará
    // os arquivos na pasta 'concord/client/dist/'.
    outDir: 'dist', 
  },
});