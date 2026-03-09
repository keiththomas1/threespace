import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';
import { readFileSync } from 'fs';

const glslPlugin: Plugin = {
  name: 'glsl',
  setup(build) {
    build.onLoad({ filter: /\.(glsl|vs|fs|vert|frag)$/ }, (args) => {
      const source = readFileSync(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(source)}`,
        loader: 'js',
      };
    });
  },
};

export default defineConfig({
  entry: ['scripts/index.ts', 'scripts/player/index.ts', 'scripts/editor/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  target: 'es2018',
  tsconfig: './tsconfig.build.json',
  sourcemap: true,
  outDir: 'dist',
  esbuildPlugins: [glslPlugin],
  // Keep runtime deps external — consumers supply their own copies.
  external: ['three', 'animejs', 'a-color-picker', 'dom-to-image'],
});
