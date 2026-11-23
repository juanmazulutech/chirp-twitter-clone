import { defineConfig, type Options } from 'tsup';

// Production build for the Docker image (ADR-20). Packages in `dependencies` stay external and
// are installed in the image; `@chirp/shared` has no build of its own (ADR-02), so it is bundled.
const shared: Options = {
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  clean: true,
  noExternal: ['@chirp/shared'],
};

export default defineConfig([
  { ...shared, entry: { server: 'src/server.ts' }, outDir: 'dist' },
  // Next to the seed's source, so `../seed-assets/avatars` resolves from the bundle as well.
  { ...shared, entry: { seed: 'prisma/seed.ts' }, outDir: 'prisma/dist' },
]);
