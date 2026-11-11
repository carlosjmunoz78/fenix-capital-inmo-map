// FACT-001 · non-mutating D1 schema-only signed-download probe. LAB only.
// Does not log signed URLs, credentials, SQL or response bodies. Never persists data.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const account = 'e39a57e1ac42650ca5a6d5307cf0ac8e';
const database = '1305f791-7c44-47f9-946b-f330a09c88aa';
const token = process.env.CEREBRO_CLOUDFLARE_API_TOKEN;
if (!token) throw new Error('PREFLIGHT_MISSING_CLOUDFLARE_TOKEN');
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/export`;

async function poll(body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`CF_EXPORT_API_STATUS_${res.status}`);
  const json = await res.json();
  if (!json.success || !json.result) throw new Error('CF_EXPORT_API_FAILED');
  return json.result;
}
const initial = {output_format:'polling',dump_options:{compatibility:'d1',no_data:true}};
let result = await poll(initial);
for (let attempt = 0; attempt < 5 && result.status !== 'complete'; attempt++) {
  if (!result.at_bookmark) throw new Error('CF_EXPORT_MISSING_BOOKMARK');
  await new Promise(resolve => setTimeout(resolve, 1000));
  result = await poll({...initial,current_bookmark:result.at_bookmark});
}
if (result.status !== 'complete') throw new Error('CF_EXPORT_NOT_COMPLETE');
const signed = result.result?.signed_url;
if (!signed) throw new Error('CF_EXPORT_MISSING_SIGNED_URL');
const url = new URL(signed);
if (url.protocol !== 'https:' || !url.hostname.endsWith('.eu.r2.cloudflarestorage.com')) {
  throw new Error('CF_EXPORT_HOST_NOT_ALLOWLISTED');
}
console.log('D1_EXPORT_SCHEMA_ONLY=COMPLETE');
let response;
try {
  response = await fetch(signed, {method:'GET',redirect:'error',signal:AbortSignal.timeout(25000)});
} catch {
  throw new Error('D1_DOWNLOAD_TRANSPORT_FAILED');
}
console.log('D1_DOWNLOAD_HTTP_STATUS=' + response.status);
if (!response.ok) {
  // No URL, body, headers or SQL are written to Actions logs.
  process.exitCode = 2;
} else {
  const cap = 2_000_000;
  const contentLength = Number(response.headers.get('content-length')||'0');
  if (contentLength > cap) throw new Error('D1_SCHEMA_EXCEEDS_SIZE_CAP');
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.byteLength > cap) throw new Error('D1_SCHEMA_EXCEEDS_SIZE_CAP');
  const sql = buf.toString('utf8');
  if (!sql.includes('CREATE TABLE')) throw new Error('D1_SCHEMA_DUMP_INVALID');
  console.log('D1_SCHEMA_DOWNLOAD_VERIFIED=true');
  console.log('D1_SCHEMA_BYTES=' + buf.byteLength);
  console.log('D1_SCHEMA_SHA256=' + createHash('sha256').update(buf).digest('hex'));
  // Validate rebuild semantics entirely in an ephemeral in-memory SQLite database.
  // Never write SQL to disk or print its contents.
  const restore = spawnSync('python3', ['-c', [
    'import sqlite3,sys',
    'sql=sys.stdin.read()',
    'db=sqlite3.connect(":memory:")',
    'db.executescript(sql)',
    'print(db.execute("SELECT count(*) FROM sqlite_master WHERE type = ? AND name NOT LIKE ?", ("table","sqlite_%")).fetchone()[0])',
  ].join(';')], { input: sql, encoding: 'utf8', timeout: 20000, maxBuffer: 100000 });
  if (restore.status !== 0) throw new Error('D1_SCHEMA_IN_MEMORY_RESTORE_FAILED');
  const restoredTables = Number(restore.stdout.trim());
  if (!Number.isInteger(restoredTables) || restoredTables < 10) throw new Error('D1_RESTORE_TABLE_COUNT_INVALID');
  console.log('D1_SCHEMA_IN_MEMORY_RESTORE=PASS');
  console.log('D1_RESTORED_TABLE_COUNT=' + restoredTables);
}
