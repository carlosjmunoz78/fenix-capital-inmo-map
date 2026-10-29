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
  ['A48','Notion continuity and sync coverage',['notion','knowledge','sync','database']],
  ['A49','WordPress and plugin dependency coverage',['wordpress','wpcode','plugin','staging']],
  ['A50','CRM workflow coverage',['crm','lead','pipeline','customer']],
  ['A51','App and device surface coverage',['app','pwa','mobile','tablet']],
  ['A52','Company bootstrap coverage',['company_registry','bootstrap','onboarding','company_id']],
  ['A53','Business discovery coverage',['business','discovery','footprint','scanner']],
  ['A54','Local SEO coverage',['local seo','google business','location','maps']],
  ['A55','Social media automation coverage',['social','instagram','facebook','linkedin','tiktok']],
  ['A56','Market and competitor intelligence coverage',['competitor','market','intelligence','research']],
  ['A57','Lead magnet and newsletter coverage',['lead','newsletter','download','consent']],
  ['A58','Browser identity and session coverage',['browser','profile','session','identity']],
  ['A59','Credential broker and secret isolation coverage',['credential','broker','secret','oidc']],
  ['A60','Task deduplication and idempotency coverage',['idempotent','dedupe','duplicate','job']],
  ['A61','Queue fairness and lease coverage',['lease','claim','queue','retry']],
  ['A62','PREPROD parity and promotion coverage',['preprod','promotion','prod','parity']],
  ['A63','Acceptance evidence and physical verification coverage',['acceptance','evidence','physical','gate']],
  ['A64','Data retention and privacy coverage',['retention','privacy','consent','pii']],
  ['A65','Incident response and kill-switch coverage',['incident','kill_switch','security','rollback']],
  ['A66','Zero-cost infrastructure coverage',['zero_cost','free','cost','self-hosted']],
  ['A67','Autonomy and human-exception state coverage',['autonomy','human_required','confidence','policy']],
]);

const PHASES = Object.freeze([
  ['P0','scope-evidence',['scope','evidence','inventory']],
  ['P1','contracts',['contract','schema','manifest','policy']],
  ['P2','dependencies',['dependency','depends','event','queue','gateway']],
  ['P3','tests-acceptance',['test','e2e','acceptance','tribunal']],
  ['P4','security-policy',['security','credential','permission','human_required','kill_switch']],
  ['P5','observability-cost',['telemetry','observability','metric','cost','budget']],
  ['P6','rollback-continuity',['rollback','backup','rebuild','restore','runbook']],
  ['P7','docs-handoff',['documentation','readme','changelog','handoff','training']],
]);

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const raw = process.argv.slice(2).find(v => v.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
}

function boundedInteger(raw, label, min, max) {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${label} must be an integer ${min}..${max}`);
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

function missionTerms(lane) {
  if (lane < FANOUT_BLOCKS.length) {
    return FANOUT_BLOCKS[lane].title.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 4).slice(0, 8);
  }
  return AUDITS[lane - 25][2];
}

function runCoverage({ lane, pass, title, terms, product }) {
  const files = gitFiles();
  const hits = [];
  let scanned = 0;
  for (const file of files) {
    const lowerPath = file.toLowerCase();
    const pathTerms = terms.filter(term => lowerPath.includes(term.toLowerCase()));
    const text = pathTerms.length ? safeRead(file) : '';
    const lowerText = text.toLowerCase();
    const contentTerms = terms.filter(term => lowerText.includes(term.toLowerCase()));
    if (pathTerms.length || contentTerms.length) {
      hits.push({ path: file, matched_terms: [...new Set([...pathTerms, ...contentTerms])] });
    }
    scanned += 1;
  }
  const report = Object.freeze({
    schema_version: '1.2', lane, pass, title, environment: PREPROD,
    company_id: 'fenix', engine_id: 'JOB-001', version: 'deterministic-useful-work-v2-max68',
    generated_at: new Date().toISOString(), git_sha: process.env.GITHUB_SHA || null,
    files_scanned: scanned, matching_path_count: hits.length, matching_paths: hits.slice(0, 160),
    useful_work_product: product, paid_ai_used: false, prod_authorized: false,
    prod_write_authorized: false, trading_access: false,
  });
  writeJson(path.join(OUT_ROOT, `lane-${String(lane).padStart(2,'0')}`, `pass-${pass}.json`), report);
  return report;
}

async function main() {
  const lane = boundedInteger(arg('lane'), 'lane', 0, 67);
  const pass = boundedInteger(arg('pass', '0'), 'pass', 0, 7);
  let result;

  if (pass === 0 && lane < FANOUT_BLOCKS.length) {
    result = await runEvidence(FANOUT_BLOCKS[lane].id);
    writeJson(path.join(OUT_ROOT, `lane-${String(lane).padStart(2,'0')}`, 'pass-0.json'), {
      schema_version: '1.2', lane, pass, environment: PREPROD, company_id: 'fenix', engine_id: 'JOB-001',
      version: 'deterministic-useful-work-v2-max68', useful_work_product: 'bounded mission evidence inventory',
      paid_ai_used: false, prod_authorized: false, prod_write_authorized: false, trading_access: false, result,
    });
  } else {
    const [phaseId, phaseTitle, phaseTerms] = PHASES[pass];
    const baseTerms = missionTerms(lane);
    const title = lane < 25 ? FANOUT_BLOCKS[lane].title : AUDITS[lane - 25][1];
    result = runCoverage({
      lane, pass,
      title: `${title} · ${phaseId} ${phaseTitle}`,
      terms: [...new Set([...baseTerms, ...phaseTerms])],
      product: `deterministic ${phaseTitle} coverage and gap evidence`,
    });
  }

  console.log(JSON.stringify({ ok: true, lane, pass, next_pass: pass < 7 ? pass + 1 : null, environment: PREPROD, paid_ai_used: false, max_lane: 67, result_type: pass === 0 && lane < 25 ? 'MISSION_EVIDENCE' : 'GOVERNANCE_PHASE' }));
}

main().catch(error => { console.error(String(error?.stack || error)); process.exitCode = 1; });
