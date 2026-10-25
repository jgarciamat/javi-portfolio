import { realpathSync } from 'fs';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import type { OutputBundle, OutputChunk } from 'rollup';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/** Libraries jsPDF imports on demand for .html() and SVG, which the app never calls. */
const JSPDF_OPTIONAL = ['html2canvas', 'canvg', 'dompurify'];

/**
 * The files a lazy chunk needs (itself, its static imports and its CSS), minus those the entry
 * already preloads.
 */
function chunkFiles(bundle: OutputBundle, endsWith: string): string[] {
  const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === 'chunk');
  const entry = chunks.find((c) => c.isEntry);
  const target = chunks.find((c) => c.moduleIds.some((id) => id.endsWith(endsWith)));
  if (!entry || !target) throw new Error(`[preload-hints] chunk not found: ${endsWith}`);
  const closure = (start: OutputChunk, seen = new Set<string>()): Set<string> => {
    if (seen.has(start.fileName)) return seen;
    seen.add(start.fileName);
    start.viteMetadata?.importedCss.forEach((css) => seen.add(css));
    for (const name of start.imports) closure(bundle[name] as OutputChunk, seen);
    return seen;
  };
  const loaded = closure(entry);
  return Array.from(closure(target))
    .filter((file) => !loaded.has(file))
    .map((file) => `/${file}`);
}

/**
 * Writes into index.html the hashed files of the dashboard and of the English texts, as meta
 * tags. public/theme-init.js preloads the first ones when there is a session and the second
 * ones when the language is English, so they download in parallel with the main chunk instead
 * of after it. The landing page and Spanish visitors download nothing more.
 */
function preloadHints(): Plugin {
  return {
    name: 'preload-hints',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const meta = (name: string, files: string[]) => ({
          tag: 'meta',
          attrs: { name, content: files.join(' ') },
          injectTo: 'head-prepend' as const,
        });
        return [
          meta('session-preload', chunkFiles(ctx.bundle, '/DashboardPage.tsx')),
          meta('locale-preload', chunkFiles(ctx.bundle, '/locales/en.json')),
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    preloadHints(),
    VitePWA({
      registerType: 'prompt',
      // El manifest ya está en public/site.webmanifest — no lo regeneramos
      manifest: false,
      workbox: {
        // Activa el nuevo SW inmediatamente cuando el usuario confirma la actualización
        skipWaiting: true,
        clientsClaim: true,
        // Precachea todos los assets del build
        // (plus the logo the splash and the headers show, so the offline shell has it)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'logo-*.webp'],
        // Big files few people use are fetched when first needed, not by every visitor: the
        // receipt scanner, the PDF reader and writer, and the images only shared links or the
        // manifest ask for. (Keep a single `globIgnores`: a second one overrides this list.)
        globIgnores: [
          'ocr/**',
          '**/pdf-*.js',
          '**/jspdf*',
          '**/html2canvas*',
          '**/index.es-*',
          '**/purify*',
          'og-image.png',
          'logo-192.png',
          'google*.html',
          'logo-512.png',
          'icon-512.png',
          'logo-mark.png',
          // The layout of the Renta (25 pages): loaded when its preview is opened.
          '**/form-layout-100-*.js',
          // The crypto console's chart (TradingView Lightweight Charts): online only anyway.
          '**/PriceChart-*.js',
        ],
        // Shows the push notifications and opens the app when one is tapped.
        importScripts: ['push-sw.js'],
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
  build: {
    rollupOptions: {
      output: {
        // Libraries change less often than the app: their own chunk survives deploys in the cache.
        manualChunks(id) {
          // Its own named chunk, so the offline precache can leave it out (globIgnores above).
          if (/taxforms\/data\/100\.json/.test(id)) return 'form-layout-100';
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
          ) {
            return 'react';
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: '@modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@core', replacement: path.resolve(__dirname, './src/core') },
      { find: '@locales', replacement: path.resolve(__dirname, './src/locales') },
      // jsPDF's optional helpers, unused by the app (see stubs/jspdf-optional.js).
      ...JSPDF_OPTIONAL.map((name) => ({
        find: new RegExp(`^${name}$`),
        replacement: path.resolve(__dirname, './stubs/jspdf-optional.js'),
      })),
    ],
  },
  server: {
    port: 5176,
    // A worktree may link node_modules to another checkout: its real folder must be servable too,
    // or the PDF reader's worker (pdf.js, loaded by URL) gets a 403 and the previews never open.
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        realpathSync(path.resolve(__dirname, 'node_modules')),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
