import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertSafeFactoryDestination, atomicReplaceFactoryDirectory } from '../runtime/fact001-safe-fs.mjs';

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'fact001-safe-test-')); }

test('FACT-001 rejects filesystem root and temp root destinations', () => {
  assert.throws(() => assertSafeFactoryDestination(path.parse(process.cwd()).root), /refuses unsafe destination/);
  assert.throws(() => assertSafeFactoryDestination(os.tmpdir()), /refuses unsafe destination/);
});

test('FACT-001 refuses to replace an unowned non-empty directory', () => {
  const root = tempRoot();
  try {
    const target = path.join(root, 'target');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'keep.txt'), 'do-not-delete\n');
    assert.throws(() => atomicReplaceFactoryDirectory(target, () => {}, { markers: ['fact001-result.json'] }), /unowned non-empty directory/);
    assert.equal(fs.readFileSync(path.join(target, 'keep.txt'), 'utf8'), 'do-not-delete\n');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('FACT-001 rolls back an owned destination when staged build fails', () => {
  const root = tempRoot();
  try {
    const target = path.join(root, 'target');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'fact001-result.json'), '{}\n');
    fs.writeFileSync(path.join(target, 'old.txt'), 'old\n');
    assert.throws(() => atomicReplaceFactoryDirectory(target, (stage) => {
      fs.writeFileSync(path.join(stage, 'new.txt'), 'new\n');
      throw new Error('synthetic build failure');
    }, { markers: ['fact001-result.json'] }), /synthetic build failure/);
    assert.equal(fs.readFileSync(path.join(target, 'old.txt'), 'utf8'), 'old\n');
    assert.equal(fs.existsSync(path.join(target, 'new.txt')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('FACT-001 atomically replaces an owned destination after successful build', () => {
  const root = tempRoot();
  try {
    const target = path.join(root, 'target');
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'fact001-result.json'), '{}\n');
    fs.writeFileSync(path.join(target, 'old.txt'), 'old\n');
    const result = atomicReplaceFactoryDirectory(target, (stage) => {
      fs.writeFileSync(path.join(stage, 'fact001-result.json'), '{"status":"green"}\n');
      fs.writeFileSync(path.join(stage, 'new.txt'), 'new\n');
      return 'ok';
    }, { markers: ['fact001-result.json'] });
    assert.equal(result, 'ok');
    assert.equal(fs.existsSync(path.join(target, 'old.txt')), false);
    assert.equal(fs.readFileSync(path.join(target, 'new.txt'), 'utf8'), 'new\n');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
