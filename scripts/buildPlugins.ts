import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';
import { valenceSdkAlias } from './valenceSdkAlias';

const TOOL = join('.tools', 'valence-plugin.mjs');

await build({
  entryPoints: [join('node_modules', '@valence', 'plugin-sdk', 'src', 'cli', 'valencePlugin.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile: TOOL,
  plugins: [valenceSdkAlias()],
  logLevel: 'warning',
});

for (const plugin of readdirSync('plugins')) {
  await build({
    entryPoints: [join('plugins', plugin, 'src', 'plugin.ts')],
    bundle: true,
    platform: 'neutral',
    format: 'iife',
    target: 'es2023',
    minify: true,
    legalComments: 'none',
    outfile: join('plugins', plugin, 'dist', 'plugin.js'),
    tsconfig: 'tsconfig.json',
    plugins: [valenceSdkAlias()],
    logLevel: 'warning',
  });
  execFileSync('node', [TOOL, 'pack', join('plugins', plugin), '--out', 'packages'], {
    stdio: 'inherit',
  });
}
