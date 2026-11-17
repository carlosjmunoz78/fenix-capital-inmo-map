/**
 * CEREBRO OS · Hostinger public LAB gate · no Supabase/admin execution surface.
 * Runs without network, account credentials, npm packages, GitHub Actions or mutations.
 * Archive fixture is the exact deployed V3 preflight ZIP in this directory.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const archive = fileURLToPath(new URL('./CEREBRO_HOSTINGER_LAB_PREFLIGHT_0EUR_V3.zip', import.meta.url));

function entriesFromZip(path) {
  const bytes = readFileSync(path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b073f6dc221648d55b0655ff3a857c357030209442e9a33237fb42f3ba4414f1', 'ZIP V3 must be the physically accepted immutable artifact');
  assert.ok(bytes.length < 128 * 1024, 'public probe archive must stay minimal');
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); --i) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, 'missing ZIP central directory');
  const count = bytes.readUInt16LE(eocd + 10);
  assert.ok(count > 0 && count <= 12, 'unexpected public artifact size');
  let cursor = bytes.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    assert.equal(bytes.readUInt32LE(cursor), 0x02014b50, 'invalid ZIP central header');
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedLength = bytes.readUInt32LE(cursor + 20);
    const uncompressedLength = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    assert.match(name, /^[a-zA-Z0-9_./-]+$/, 'unexpected ZIP path');
    assert.ok(!name.startsWith('/') && !name.split('/').includes('..'), 'path traversal');
    assert.ok(!entries.has(name), 'duplicate ZIP entry');
    assert.ok(uncompressedLength <= 64 * 1024, 'overly large source file');
    assert.equal(bytes.readUInt32LE(localOffset), 0x04034b50, 'invalid ZIP local header');
    const bodyOffset = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    const zipped = bytes.subarray(bodyOffset, bodyOffset + compressedLength);
    const plain = method === 8 ? inflateRawSync(zipped) : method === 0 ? zipped : null;
    assert.ok(plain && plain.length === uncompressedLength, 'unsupported or corrupt ZIP entry');
    entries.set(name, plain.toString('utf8'));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const files = entriesFromZip(archive);

test('V3 public archive has only four allowlisted files and no embedded secrets', () => {
  assert.deepEqual([...files.keys()].sort(), [
    'LEEME_HOSTINGER.txt', 'package.json', 'server.mjs', 'test/server.test.mjs'
  ].sort());
  for (const text of files.values()) {
    assert.doesNotMatch(text, /sb_secret_[A-Za-z0-9_-]{15,}|sb_publishable_[A-Za-z0-9_-]{15,}|eyJ[A-Za-z0-9_-]{120,}/);
  }
});

test('package cannot introduce npm dependencies, workers, cron or runtime commands', () => {
  const pkg = JSON.parse(files.get('package.json'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.deepEqual(pkg.dependencies || {}, {});
  assert.deepEqual(pkg.devDependencies || {}, {});
  assert.equal(pkg.scripts.start, 'node server.mjs');
  assert.ok(!Object.keys(pkg.scripts || {}).some(x => /cron|worker|deploy|auth|live|publish|migrate/i.test(x)));
});

test('entry only uses core HTTP, no database, command runner or privileged environment', () => {
  const entry = files.get('server.mjs');
  const imports = [...entry.matchAll(/\bimport\s+[^;\n]+?\s+from\s+['"]([^'"]+)['"]/g)].map(x => x[1]);
  assert.deepEqual(imports, ['node:http']);
  assert.doesNotMatch(entry, /\b(?:createClient|fetch|spawn|exec|readFile|writeFile|listenInBackground|setInterval)\s*\(/);
  assert.doesNotMatch(entry, /\bprocess\.env\.(?!PORT\b)[A-Z][A-Z0-9_]+/);
  assert.doesNotMatch(entry, /\bprocess\.env\s*\[/);
  assert.doesNotMatch(entry, /\b(?:https?:\/\/|auth\/v1|rest\/v1|service_role|sb_secret_|\bAuthorization\b)/);
  assert.match(entry, /^server\.listen\(port,\s*['"]0\.0\.0\.0['"]/m);
  const codeOnly = entry.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(codeOnly, /\b(?:require\.main|process\.argv\[1\]|realpathSync)\b/);
});

test('public status explicitly rejects Auth tests, PROD operations and background jobs', () => {
  const entry = files.get('server.mjs');
  assert.match(entry, /status:\s*['"]READY['"]/);
  assert.match(entry, /environment:\s*['"]LAB['"]/);
  assert.match(entry, /operation:\s*['"]READ_ONLY_PREFLIGHT['"]/);
  assert.match(entry, /owner_auth_test:\s*['"]NOT_RUN['"]/);
  assert.match(entry, /prod_execution:\s*['"]DISABLED['"]/);
  assert.match(entry, /background_jobs:\s*['"]DISABLED['"]/);
  assert.match(entry, /probe_version:\s*['"]V3['"]/);
  assert.match(entry, /req\.method === ['"]GET['"] \|\| head/);
  assert.match(entry, /reply\(res, 404,/);
});
