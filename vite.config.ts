import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { industryStats, injectIndustryStatsJsonLd } from './src/lib/industry-stats';

function industryStatsJsonLdPlugin(): Plugin {
  return {
    name: 'industry-stats-jsonld',
    transformIndexHtml(html) {
      return injectIndustryStatsJsonLd(html, industryStats);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), industryStatsJsonLdPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', '.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
