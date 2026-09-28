import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: /^@ValenceSDK\/(.*)$/,
        replacement: `${join(import.meta.dirname, 'node_modules', '@valence', 'plugin-sdk', 'src')}/$1`,
      },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['plugins/*/src/**/*.test.ts', 'shared/**/*.test.ts'],
  },
});
