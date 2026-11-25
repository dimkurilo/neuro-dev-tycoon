import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Финальная сборка — один самодостаточный dist/index.html: JS и CSS инлайнятся плагином,
// base './' позволяет открывать файл напрямую по file:// без сервера.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
