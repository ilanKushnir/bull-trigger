import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    mockReset: true,
    setupFiles: ['./vitest.setup.ts']
  }
}); 