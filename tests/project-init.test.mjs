import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Next.js project should be initialized under app023/', async () => {
  const pkgUrl = new URL('../app023/package.json', import.meta.url);
  const pkgRaw = await readFile(pkgUrl, 'utf8');
  const pkg = JSON.parse(pkgRaw);
  assert.ok(
    pkg.dependencies?.next,
    'Expected Next.js dependency to be present in package.json'
  );
});
