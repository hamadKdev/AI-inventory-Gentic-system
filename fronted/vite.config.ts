import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const rawApiBase =
    env.VITE_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    'https://ai-inventory-gentic-system.vercel.app';
  const apiTarget = rawApiBase.trim().replace(/\/+$/, '');

  const rawN8nUrl =
    env.VITE_N8N_WEBHOOK_URL ||
    process.env.VITE_N8N_WEBHOOK_URL ||
    'https://hamadkdev.app.n8n.cloud/webhook/c1905487-fe80-441b-9de8-fb57700f45b9';

  let n8nOrigin = 'https://hamadkdev.app.n8n.cloud';
  let n8nPath = '/webhook/c1905487-fe80-441b-9de8-fb57700f45b9';
  try {
    const parsedN8n = new URL(rawN8nUrl.trim());
    n8nOrigin = parsedN8n.origin;
    n8nPath = parsedN8n.pathname + parsedN8n.search;
  } catch {
    // Keep default fallback if URL is placeholder
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/__api_proxy': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/__api_proxy/, ''),
        },
        '/__n8n_proxy': {
          target: n8nOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: () => n8nPath,
        },
      },
    },
  };
});
