import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@contracts': fileURLToPath(new URL('./src/contracts', import.meta.url)),
      '@design-system': fileURLToPath(new URL('./src/design-system', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@mocks': fileURLToPath(new URL('./src/mocks', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'tests/visual/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/domain/**/*.{ts,tsx}',
        'src/features/role-switch/model/**/*.{ts,tsx}',
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 75,
        'src/domain/**': {
          statements: 90,
          lines: 90,
          functions: 90,
          branches: 85,
        },
      },
    },
  },
});
