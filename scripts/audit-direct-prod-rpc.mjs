import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const CALL_RE = /supabase\.rpc\(\s*['"](fenix_prod_[A-Za-z0-9_]+)['"]/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

const rows = [];
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = CALL_RE.exec(text))) {
    const prefix = text.slice(0, match.index);
    const line = prefix.split('\n').length;
    rows.push({ file: path.relative('.', file).replaceAll('\\', '/'), line, rpc: match[1] });
  }
}

rows.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rpc.localeCompare(b.rpc));
const uniqueRpcs = [...new Set(rows.map((row) => row.rpc))].sort();
const output = {
  schema_version: 1,
  mode: 'READ_ONLY_STATIC_AUDIT',
  direct_call_count: rows.length,
  unique_rpc_count: uniqueRpcs.length,
  unique_rpcs: uniqueRpcs,
  callers: rows,
  safe_to_revoke_authenticated_execute: rows.length === 0,
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (process.argv.includes('--require-zero') && rows.length !== 0) process.exitCode = 2;
