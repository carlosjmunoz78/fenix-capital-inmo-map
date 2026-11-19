import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const values = [
  ['CEREBRO_BUILD_SOURCE_SHA', process.env.CEREBRO_BUILD_SOURCE_SHA],
  ['VERCEL_GIT_COMMIT_SHA', process.env.VERCEL_GIT_COMMIT_SHA],
  ['GITHUB_SHA', process.env.GITHUB_SHA],
].filter(([, value]) => typeof value === 'string' && value.trim());

try {
  const sha = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
  }).trim();
  if (SHA_PATTERN.test(sha)) values.push(['git HEAD', sha]);
} catch {
  // Build providers may omit .git; explicit source metadata remains supported.
}
for (const [origin, sha] of values) {
  if (!SHA_PATTERN.test(sha)) throw new Error(`SOURCE_STAMP_INVALID_SHA: ${origin}`);
}
const distinct = [...new Set(values.map(([, sha]) => sha.toLowerCase()))];
if (distinct.length > 1) throw new Error('SOURCE_STAMP_CONFLICT: checkout and build metadata disagree');
const sha = distinct[0];
if (!sha) {
  if (process.env.VERCEL_ENV === 'production' || process.env.CEREBRO_REQUIRE_SOURCE_STAMP === 'true') {
    throw new Error('SOURCE_STAMP_MISSING_FOR_PRODUCTION');
  }
  console.log('SOURCE_STAMP_SKIPPED_NO_GIT_METADATA');
} else {
  const output = join(process.cwd(), 'dist', 'PROD_SOURCE_SHA.txt');
  mkdirSync(join(process.cwd(), 'dist'), { recursive: true });
  writeFileSync(output, `${sha}\n`, { encoding: 'utf8', flag: 'w', mode: 0o644 });
  console.log('SOURCE_STAMP_EMITTED_SHA_VALID');
}
