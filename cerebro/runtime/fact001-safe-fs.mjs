import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function exists(file) {
  try { fs.lstatSync(file); return true; } catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

function assertNoSymlinkComponents(target) {
  const root = path.parse(target).root;
  let cursor = target;
  while (cursor !== root) {
    if (exists(cursor) && fs.lstatSync(cursor).isSymbolicLink()) {
      throw new Error(`FACT-001 destination contains symbolic link component: ${cursor}`);
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}

export function assertSafeFactoryDestination(input, { forbidden = [], markers = [] } = {}) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('FACT-001 destination must be a non-empty path');
  const target = path.resolve(input);
  const root = path.parse(target).root;
  const forbiddenExact = new Set([
    root,
    path.resolve(os.homedir()),
    path.resolve(os.tmpdir()),
    ...forbidden.map((entry) => path.resolve(entry))
  ]);
  if (forbiddenExact.has(target)) throw new Error(`FACT-001 refuses unsafe destination: ${target}`);
  assertNoSymlinkComponents(target);
  if (exists(target)) {
    const stat = fs.lstatSync(target);
    if (!stat.isDirectory()) throw new Error(`FACT-001 destination is not a directory: ${target}`);
    const entries = fs.readdirSync(target);
    if (entries.length > 0 && markers.length > 0 && !markers.some((marker) => exists(path.join(target, marker)))) {
      throw new Error(`FACT-001 refuses to replace unowned non-empty directory: ${target}`);
    }
  }
  return target;
}

export function atomicReplaceFactoryDirectory(input, build, options = {}) {
  const target = assertSafeFactoryDestination(input, options);
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  assertNoSymlinkComponents(parent);

  const base = path.basename(target);
  const stage = fs.mkdtempSync(path.join(parent, `.${base}.fact001-stage-`));
  const backup = path.join(parent, `.${base}.fact001-backup-${process.pid}-${Date.now()}`);
  let movedExisting = false;
  let promoted = false;
  try {
    const result = build(stage);
    if (exists(target)) {
      fs.renameSync(target, backup);
      movedExisting = true;
    }
    try {
      fs.renameSync(stage, target);
      promoted = true;
    } catch (error) {
      if (movedExisting && !exists(target) && exists(backup)) fs.renameSync(backup, target);
      movedExisting = false;
      throw error;
    }
    if (movedExisting && exists(backup)) fs.rmSync(backup, { recursive: true, force: true });
    movedExisting = false;
    return result;
  } finally {
    if (!promoted && exists(stage)) fs.rmSync(stage, { recursive: true, force: true });
    if (movedExisting && !exists(target) && exists(backup)) fs.renameSync(backup, target);
    if (exists(backup) && exists(target)) fs.rmSync(backup, { recursive: true, force: true });
  }
}
