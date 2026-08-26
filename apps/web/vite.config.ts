import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/auth': 'http://127.0.0.1:3000',
      '/v1': 'http://127.0.0.1:3000',
    },
  },
  build: {
    minify: 'terser',
    outDir: 'dist/browser',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const localeMatch =
            /packages\/i18n\/(?:dist|src)\/catalogs\/locales\/(de-DE|en-GB|es-ES)\//u.exec(id);
          if (localeMatch?.[1] !== undefined) return `locale-${localeMatch[1]}`;
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-aria') || id.includes('@react-aria')) return 'accessibility';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
    terserOptions: {
      compress: {
        passes: 3,
      },
      format: {
        comments: false,
      },
      mangle: true,
    },
  },
});
