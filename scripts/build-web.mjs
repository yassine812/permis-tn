import { build } from 'vite';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

await build();
const output = resolve('preview-dist');
async function filesIn(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    files.push(...(entry.isDirectory() ? await filesIn(path) : [path]));
  }
  return files;
}
const files = (await filesIn(output)).sort();
const hash = createHash('sha256');
const template = await readFile('web/service-worker.js', 'utf8');
hash.update(template);
for (const file of files) {
  hash.update(relative(output, file));
  hash.update(await readFile(file));
}
const version = hash.digest('hex').slice(0, 16);
const paths = files.map(file => relative(output, file).replaceAll('\\', '/'));
await writeFile(
  resolve(output, 'sw.js'),
  template
    .replace('__BUILD_VERSION__', version)
    .replaceAll('__PRECACHE_FILES__', JSON.stringify(paths)),
);
await writeFile(resolve(output, '.nojekyll'), '');
console.log(`Offline build ${version}: ${paths.length} files cached.`);
