import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // El manifest ya está en public/site.webmanifest — no lo regeneramos
      manifest: false,
      workbox: {
        // Activa el nuevo SW inmediatamente cuando el usuario confirma la actualización
        skipWaiting: true,
        clientsClaim: true,
        // Precachea todos los assets del build
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Las respuestas de /api nunca se cachean: son datos privados de cada usuario.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Desactivado: generaba frontend/dev-dist en cada `npm run dev`.
        // Actívalo temporalmente si necesitas depurar el service worker.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@core': path.resolve(__dirname, './src/core'),
      '@locales': path.resolve(__dirname, './src/locales'),
    },
  },
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
