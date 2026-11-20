import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/aboutme.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  legalComments: 'none',
});
