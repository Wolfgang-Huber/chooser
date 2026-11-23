import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'www');

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });

const files = [
  'index.html',
  'app.js',
  'styles.css',
  'manifest.webmanifest',
];

for (const file of files) {
  await cp(join(root, file), join(dest, file));
}

await cp(join(root, 'icons'), join(dest, 'icons'), { recursive: true });
