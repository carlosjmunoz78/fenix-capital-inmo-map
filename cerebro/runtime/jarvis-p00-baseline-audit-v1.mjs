import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import childProcess from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runtime-artifacts/jarvis-v1');
fs.mkdirSync(OUT, { recursive: true });
const skip = new Set(['.git','node_modules','.next','dist','build','coverage','runtime-artifacts']);
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full).replaceAll('\\','/');
    if (ent.isDirectory()) walk(full); else files.push(rel);
  }
}
walk(ROOT);
files.sort();

const extCounts = {};
for (const f of files) {
  const ext = path.extname(f).toLowerCase() || '<none>';
  extCounts[ext] = (extCounts[ext] || 0) + 1;
}
const picks = (re) => files.filter((f) => re.test(f));
let gitHead = process.env.GITHUB_SHA || null;
if (!gitHead) {
  try { gitHead = childProcess.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); } catch {}
}
const packageFiles = files.filter((f) => /(^|\/)package\.json$/.test(f));
const packageScripts = {};
for (const f of packageFiles.slice(0, 30)) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
    packageScripts[f] = Object.keys(p.scripts || {});
  } catch {}
}
const keyCandidates = {
  cerebro_files: picks(/^cerebro\//),
  workflows: picks(/^\.github\/workflows\//),
  supabase: picks(/(^|\/)supabase\//i),
  migrations: picks(/migration|migrations/i),
  gateway: picks(/gateway/i),
  orchestrator: picks(/orchestrat/i),
  router: picks(/router/i),
  auth: picks(/auth/i),
  browser: picks(/browser|computer-use|computer_use/i),
  backup_rollback_rebuild: picks(/backup|rollback|rebuild/i),
  observability: picks(/observab|telemetr|metrics|logging/i),
  contracts: picks(/contract/i)
};
for (const k of Object.keys(keyCandidates)) keyCandidates[k] = keyCandidates[k].slice(0, 500);

const evidenceFingerprint = crypto.createHash('sha256').update(files.join('\n')).digest('hex');
const report = {
  schema: 'JARVIS_P00_BASELINE_AUDIT_V1',
  generated_at: new Date().toISOString(),
  environment: 'PREPROD',
  read_only_audit: true,
  production_writes: false,
  git_head: gitHead,
  repository_file_count: files.length,
  repository_path_fingerprint_sha256: evidenceFingerprint,
  extension_counts: extCounts,
  package_scripts: packageScripts,
  inventories: Object.fromEntries(Object.entries(keyCandidates).map(([k,v]) => [k,{count:v.length, paths:v}])),
  status: 'PARCIAL',
  evidence_note: 'Read-only repository baseline generated. External/live systems still require their own evidence before CONFIRMED_OPERATIONAL.',
  next_block: 'Reconcile P00 inventory against live deployments, identity, data, policy and observability evidence.'
};
fs.writeFileSync(path.join(OUT,'p00-repository-baseline.json'), JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status, repository_file_count:report.repository_file_count, git_head:report.git_head, next_block:report.next_block},null,2));
