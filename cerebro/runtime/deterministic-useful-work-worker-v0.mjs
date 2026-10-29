import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runEvidence, FANOUT_BLOCKS } from './max-fanout-block-worker-v1.mjs';

const PREPROD = 'PREPROD';
const OUT_ROOT = path.resolve(process.env.CEREBRO_USEFUL_WORK_OUT_DIR || 'artifacts/useful-work-v0');

const AUDITS = Object.freeze([
  ['A25','Engine Registry coverage',['engine','registry','manifest']],
  ['A26','Workflow execution inventory',['.github/workflows','workflow']],
  ['A27','Contract coverage',['contract','schema','policy']],
  ['A28','Rollback coverage',['rollback','restore']],
  ['A29','Backup and rebuild coverage',['backup','rebuild']],
  ['A30','Runbook coverage',['runbook','operations']],
  ['A31','Observability coverage',['telemetry','observability','metric']],
  ['A32','Cost guard coverage',['cost','budget','money_limit']],
  ['A33','Human exception coverage',['human_required','legal_required','low_confidence']],
  ['A34','Multi-company contract coverage',['company_id','engine_id','environment','version']],
  ['A35','PROD authority guard scan',['prod_authorized','prod_write_authorized','preprod']],
  ['A36','Trading isolation scan',['trading_access','trading','isolated']],
  ['A37','Supabase coupling scan',['supabase','edge function','rpc']],
  ['A38','Gateway and Console coverage',['gateway','console','jarvis']],
  ['A39','Browser lane coverage',['browser','bridge','computer-use']],
  ['A40','Factory scaffold coverage',['factory','scaffold','fact-001']],
  ['A41','Learning and Training coverage',['learning','training','tribunal']],
  ['A42','SEO engine coverage',['seo','search-console','keyword']],
  ['A43','Security control coverage',['security','kill_switch','credential']],
  ['A44','Event and job fabric coverage',['event','job','queue','outbox']],
  ['A45','Model Router coverage',['model','router','provider']],
  ['A46','Testing and acceptance coverage',['test','acceptance','e2e']],
  ['A47','Documentation and changelog coverage',['changelog','documentation','readme']],
]);

function arg(name) {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find(v => v.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : null;
}

function laneNumber(raw) {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0 || n > 47) throw new Error('lane must be an integer 0..47');
  return n;
}

function gitFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

function safeRead(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1_000_000) return '';
    return fs.readFileSync(file, 'utf8');
  } catch { return ''; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runAudit(lane) {
  const [auditId, title, terms] = AUDITS[lane - 25];
  const files = gitFiles();
  const hits = [];
  let scanned = 0;
  for (const file of files) {
    const lowerPath = file.toLowerCase();
    const pathHit = terms.some(term => lowerPath.includes(term.toLowerCase()));
    const text = pathHit ? safeRead(file) : '';
    const contentTerms = terms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
    if (pathHit || contentTerms.length) {
      hits.push({ path: file, matched_terms: [...new Set(contentTerms.length ? contentTerms : terms.filter(term => lowerPath.includes(term.toLowerCase())))] });
    }
    scanned += 1;
  }
  const report = Object.freeze({
    schema_version: '1.0',
    lane,
    audit_id: auditId,
    title,
    environment: PREPROD,
    company_id: 'fenix',
    engine_id: 'JOB-001',
    version: 'deterministic-useful-work-v0',
    generated_at: new Date().toISOString(),
    git_sha: process.env.GITHUB_SHA || null,
    files_scanned: scanned,
    matching_path_count: hits.length,
    matching_paths: hits.slice(0, 160),
    useful_work_product: 'deterministic governed coverage inventory',
    paid_ai_used: false,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
  });
  writeJson(path.join(OUT_ROOT, `lane-${String(lane).padStart(2,'0')}`, 'report.json'), report);
  return report;
}

async function main() {
  const lane = laneNumber(arg('lane'));
  let result;
  if (lane < FANOUT_BLOCKS.length) {
    result = await runEvidence(FANOUT_BLOCKS[lane].id);
    writeJson(path.join(OUT_ROOT, `lane-${String(lane).padStart(2,'0')}`, 'report.json'), {
      schema_version: '1.0', lane, environment: PREPROD, company_id: 'fenix', engine_id: 'JOB-001',
      version: 'deterministic-useful-work-v0', useful_work_product: 'bounded mission evidence inventory',
      paid_ai_used: false, prod_authorized: false, prod_write_authorized: false, trading_access: false, result,
    });
  } else {
    result = runAudit(lane);
  }
  console.log(JSON.stringify({ ok: true, lane, environment: PREPROD, paid_ai_used: false, result_type: lane < 25 ? 'MISSION_EVIDENCE' : 'GOVERNANCE_AUDIT' }));
}

main().catch(error => { console.error(String(error?.stack || error)); process.exitCode = 1; });
