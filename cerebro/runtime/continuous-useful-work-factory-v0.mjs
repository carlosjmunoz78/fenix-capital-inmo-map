import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const PREPROD = 'PREPROD';
const OUT_ROOT = path.resolve(process.env.CEREBRO_CONTINUOUS_WORK_OUT_DIR || 'artifacts/continuous-work-v0');

export const WORK_FAMILIES = Object.freeze([
  ['F00','Engine registry and manifest gaps',['engine','registry','manifest']],
  ['F01','Factory scaffold completeness',['factory','scaffold','fact-001']],
  ['F02','Contracts schemas and policies',['contract','schema','policy']],
  ['F03','Dependency and route maps',['dependency','depends','route','registry']],
  ['F04','Tests acceptance and tribunal',['test','acceptance','e2e','tribunal']],
  ['F05','Rollback backup rebuild continuity',['rollback','backup','rebuild','restore']],
  ['F06','Observability telemetry and metrics',['observability','telemetry','metric']],
  ['F07','Cost and money guards',['cost','budget','money_limit','additional_cost']],
  ['F08','Human exception policy',['human_required','legal_required','signature_required','low_confidence','high_risk']],
  ['F09','Multi-company contract',['company_id','engine_id','environment','version']],
  ['F10','Security credentials and kill switches',['security','credential','kill_switch','secret']],
  ['F11','Trading isolation',['trading','isolated']],
  ['F12','Supabase coupling and boundaries',['supabase','rpc','edge function']],
  ['F13','Gateway and CEREBRO Console',['gateway','console','jarvis']],
  ['F14','Browser and computer-use',['browser','bridge','computer-use','computer_use']],
  ['F15','Learning training and RSI',['learning','training','rsi','tribunal']],
  ['F16','SEO and Search Console',['seo','search-console','keyword','sitemap']],
  ['F17','Local SEO and business footprint',['local seo','local-seo','google business','maps']],
  ['F18','Social media systems',['social','facebook','instagram','linkedin','tiktok','youtube']],
  ['F19','Competitor and market intelligence',['competitor','market intelligence','research']],
  ['F20','CRM and App Fenix',['crm','app fenix','app-fenix','expediente']],
  ['F21','Notion integration',['notion']],
  ['F22','WordPress integration',['wordpress','wpcode','astra']],
  ['F23','Automation and event fabric',['automation','workflow','event','job','queue','outbox']],
  ['F24','Identity and account control',['identity','iam','account','credential']],
  ['F25','Model router and providers',['model router','model-router','provider','deepseek']],
  ['F26','App Factory and digital build',['appfact','app factory','digital-build','mobile']],
  ['F27','Documentation runbooks changelog',['documentation','runbook','changelog','readme']],
  ['F28','Accessibility semantics',['accessibility','aria','role=','semantic']],
  ['F29','Performance and reliability',['performance','latency','timeout','retry']],
  ['F30','Data contracts and migrations',['migration','data contract','table','rls']],
  ['F31','Newsletter and lead magnet systems',['newsletter','lead magnet','lead-magnet','brevo']],
  ['F32','Knowledge bootstrap and memory',['knowledge','memory','context']],
  ['F33','Company onboarding bootstrap',['company registry','business discovery','bootstrap']],
]);

const MODES = Object.freeze(['COVERAGE','DEBT','TEST','GOVERNANCE','DEPENDENCY','DOCS','QUALITY','CONTINUITY']);

function boundedInteger(raw, label, min, max) {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${label} must be an integer ${min}..${max}`);
  return n;
}

function hashMod(text, mod) {
  const digest = crypto.createHash('sha256').update(String(text)).digest();
  return digest.readUInt32BE(0) % mod;
}

function gitFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

function safeStat(file) {
  try { return fs.statSync(file); } catch { return null; }
}

function safeRead(file, maxBytes = 600_000) {
  try {
    const stat = safeStat(file);
    if (!stat?.isFile() || stat.size > maxBytes) return '';
    return fs.readFileSync(file, 'utf8');
  } catch { return ''; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildTaskDescriptor(laneRaw, cycleRaw) {
  const lane = boundedInteger(laneRaw, 'lane', 0, 67);
  const cycle = boundedInteger(cycleRaw, 'cycle', 0, 999_999);
  const familyIndex = (lane + cycle) % WORK_FAMILIES.length;
  const modeIndex = (Math.floor(cycle / WORK_FAMILIES.length) + lane) % MODES.length;
  const [family_id, family_title, terms] = WORK_FAMILIES[familyIndex];
  return Object.freeze({
    lane,
    cycle,
    family_id,
    family_title,
    terms: Object.freeze([...terms]),
    mode: MODES[modeIndex],
    shard_rotation: cycle % 68,
    task_key: `continuous:${lane}:${cycle}:${family_id}:${MODES[modeIndex]}`,
  });
}

function selectFiles(files, task) {
  const rotated = files.filter(file => ((hashMod(file, 68) + task.shard_rotation) % 68) === task.lane);
  const familyHits = rotated.filter(file => task.terms.some(term => file.toLowerCase().includes(term.toLowerCase())));
  const selected = familyHits.length ? familyHits : rotated;
  if (selected.length) return selected.slice(0, 120);
  return files.filter(file => ((hashMod(file, 17) + task.cycle) % 17) === (task.lane % 17)).slice(0, 80);
}

function inspectFiles(selected, task) {
  const findings = [];
  let todoCount = 0;
  let matchedFiles = 0;
  for (const file of selected) {
    const stat = safeStat(file);
    const text = safeRead(file);
    const lower = text.toLowerCase();
    const matchedTerms = task.terms.filter(term => lower.includes(term.toLowerCase()) || file.toLowerCase().includes(term.toLowerCase()));
    const debtMatches = text.match(/\b(TODO|FIXME|HACK|XXX|NOT_IMPLEMENTED|PENDING)\b/gi) || [];
    todoCount += debtMatches.length;
    if (matchedTerms.length) matchedFiles += 1;
    findings.push({
      path: file,
      bytes: stat?.size ?? null,
      matched_terms: [...new Set(matchedTerms)],
      debt_markers: debtMatches.length,
      has_test_name: /(?:^|\/).+\.test\.[cm]?[jt]sx?$/.test(file),
      has_doc_name: /(?:readme|runbook|changelog|contract|manifest)/i.test(file),
    });
  }
  return { findings, todoCount, matchedFiles };
}

function runOneTest(files, task) {
  const tests = files.filter(file => /\.test\.mjs$/.test(file));
  if (!tests.length || task.mode !== 'TEST') return null;
  const target = tests[(task.lane + task.cycle) % tests.length];
  const result = spawnSync(process.execPath, ['--test', target], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 2_000_000,
  });
  return {
    target,
    exit_code: result.status,
    signal: result.signal || null,
    passed: result.status === 0,
    stdout_tail: String(result.stdout || '').slice(-4000),
    stderr_tail: String(result.stderr || '').slice(-4000),
  };
}

export function executeContinuousWork({ lane, cycle, slot = 0 }) {
  if ((process.env.CEREBRO_SUPERVISOR_ENV || PREPROD) !== PREPROD) throw new Error('continuous work factory is PREPROD-only');
  if (process.env.CEREBRO_ALLOW_PAID_FANOUT === 'YES') throw new Error('paid AI is not permitted in continuous deterministic factory');
  if (process.env.CEREBRO_PROD_WRITE === 'true') throw new Error('PROD writes are not permitted');
  if (process.env.CEREBRO_TRADING_ACCESS === 'true') throw new Error('Trading access is not permitted');

  const execution_slot = boundedInteger(slot, 'slot', 0, 3);
  const evidence_write_mode = process.env.CEREBRO_CONTINUOUS_WORK_WRITE_MODE || 'cycle';
  if (!['cycle','rolling'].includes(evidence_write_mode)) throw new Error('CEREBRO_CONTINUOUS_WORK_WRITE_MODE must be cycle or rolling');
  const task = buildTaskDescriptor(lane, cycle);
  const files = gitFiles();
  const selected = selectFiles(files, task);
  const inspection = inspectFiles(selected, task);
  const test_result = runOneTest(files, task);

  const report = Object.freeze({
    schema_version: '1.1',
    generated_at: new Date().toISOString(),
    company_id: 'fenix',
    engine_id: 'JOB-001',
    environment: PREPROD,
    version: 'continuous-useful-work-factory-v0',
    execution_slot,
    evidence_write_mode,
    task,
    repository_file_count: files.length,
    selected_file_count: selected.length,
    matched_file_count: inspection.matchedFiles,
    debt_marker_count: inspection.todoCount,
    findings: inspection.findings,
    test_result,
    next_cycle: task.cycle === 999_999 ? 0 : task.cycle + 1,
    self_feeding_source: 'live git tree + rotating governance families + rotating file shards + deterministic test inventory',
    useful_work: true,
    paid_ai_used: false,
    additional_subscription_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
  });

  const laneDir = path.join(OUT_ROOT, `lane-${String(task.lane).padStart(2,'0')}`);
  const out = evidence_write_mode === 'rolling'
    ? path.join(laneDir, `slot-${execution_slot}.json`)
    : path.join(laneDir, `cycle-${String(task.cycle).padStart(6,'0')}.json`);
  writeJson(out, report);
  return report;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [k,v='true'] = arg.replace(/^--/, '').split('='); return [k,v];
  }));
  const report = executeContinuousWork({ lane: args.lane, cycle: args.cycle, slot: args.slot ?? 0 });
  console.log(JSON.stringify({
    ok: true,
    lane: report.task.lane,
    cycle: report.task.cycle,
    slot: report.execution_slot,
    family: report.task.family_id,
    mode: report.task.mode,
    evidence_write_mode: report.evidence_write_mode,
    selected_file_count: report.selected_file_count,
    debt_marker_count: report.debt_marker_count,
    test_passed: report.test_result?.passed ?? null,
    next_cycle: report.next_cycle,
    paid_ai_used: false,
    prod_write_authorized: false,
    trading_access: false,
  }));
}

const self = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (self) main().catch(error => { console.error(String(error?.stack || error)); process.exitCode = 1; });
