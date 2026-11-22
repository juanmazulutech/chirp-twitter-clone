// Regenerates the committed seed avatars (ADR-16):
//   npm run avatars:generate -w @chirp/api
// Deterministic: the same personas and DiceBear version always produce the same files.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSeedAvatar, SEED_AVATAR_DIR } from '../seed-data/avatars';
import { seedPersonas } from '../seed-data/users';

export interface GenerateAvatarsOptions {
  /** Where to write; the committed folder unless a test passes another. */
  directory?: string;
  write?: (message: string) => void;
}

export async function generateAvatars({
  directory = SEED_AVATAR_DIR,
  write = (message) => process.stdout.write(message),
}: GenerateAvatarsOptions = {}): Promise<string[]> {
  await mkdir(directory, { recursive: true });
  const written = await Promise.all(
    seedPersonas.map(async ({ username }) => {
      const path = join(directory, `${username}.svg`);
      await writeFile(path, renderSeedAvatar(username));
      return path;
    }),
  );
  write(`Generated ${written.length} avatars in ${directory}\n`);
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await generateAvatars();
