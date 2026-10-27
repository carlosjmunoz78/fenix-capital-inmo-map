import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DeepSeekProviderV0 } from '../../runtime/deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from '../../runtime/deepseek-budget-guard-v0.mjs';

const ROOT = process.cwd();
const BOOST = join(ROOT, 'cerebro/jarvis/boost-001');
const OUT = join(ROOT, 'artifacts/boost001-super-audit-a01-a03-a04-r3');
const IDS = ['A01', 'A03', 'A04'];
const MAX_OUTPUT_TOKENS = 16_000;
const SPENT_EUR = Number(process.env.DEEPSEEK_SUPER_AUDIT_SPENT_EUR ?? '0.25');
const PROJECTED_EUR = Number(process.env.DEEPSEEK_SUPER_AUDIT_PROJECTED_EUR ?? '0.15');

if (process.env.CEREBRO_ALLOW_PAID_SUPER_AUDIT !== 'YES') throw new Error('SUPER AUDIT not authorised');
if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing');

const guard = new DeepSeekBudgetGuardV0({ initialHardCapEur: 200, monthlyVariableCeilingEur: 10, autoRecharge: false });
const authorization = guard.authorize({ phase: 'bootstrap', spentEur: SPENT_EUR, projectedCostEur: PROJECTED_EUR });
if (!authorization.allowed) throw new Error(`Budget guard denied r3: ${authorization.result}`);

function json(name) { return JSON.parse(readFileSync(join(BOOST, name), 'utf8')); }
function git(args, fallback = '') {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).trim(); }
  catch { return fallback; }
}
function redact(v) {
  return String(v)
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|secret|password|passwd|token|client[_-]?secret)\s*[:=]\s*)["']?[^\s,"'}]+/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,})\b/g, '[REDACTED_TOKEN]');
}
function clip(v, max) {
  const s = redact(v);
  return s.length <= max ? s : `${s.slice(0, max)}\n...[TRUNCATED ${s.length - max} chars]`;
}
function parseOutput(text) {
  const s = String(text ?? '').trim();
  try { return JSON.parse(s); } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) { try { return JSON.parse(fenced.trim()); } catch {} }
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return null;
}

const patterns = {
  A01: 'FACT-001|GOV-001|POL-001|HEX-001|Factory|Engine Registry|promotion gate|tribunal|QA|EVA',
  A03: 'RUNTIME-001|EVT-001|JOB-001|ROUTE-001|FINOPS-001|AIBUD-001|router|runtime|cost guard|budget|continuous.supervisor|durable.worker',
  A04: 'IAM|credential.broker|vault|standing.permission|kill.switch|multi.account|tenant|secret|permission|scope|identity|revocation',
};
const scope = ['cerebro/**', 'docs/**', 'scripts/**', 'src/**', '.github/workflows/**'];
function grep(pattern, ref = null) {
  const args = ['grep', '-n', '-I', '-E', pattern];
  if (ref) args.push(ref);
  args.push('--', ...scope);
  return git(args);
}

const queue = json('audit-queue.v1.json');
const prompts = json('audit-prompts.v1.json');
const baseline = json('baseline-live-evidence.v1.json');
const state = json('state.v1.json');
const manifest = json('boost-manifest.v1.json');
const role = prompts.roles.find((x) => x.id === 'EVIDENCE_AUDITOR');
if (!role) throw new Error('EVIDENCE_AUDITOR missing');

const head = git(['rev-parse', 'HEAD']);
const main = git(['rev-parse', 'origin/main']);
const divergence = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD']);
const mainOnlyCommits = clip(git(['log', '--oneline', '--max-count=25', 'HEAD..origin/main']), 4_000);
const mainDelta = clip(git(['diff', '--name-status', 'HEAD...origin/main']), 5_000);
const preflight = Object.freeze({
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  workflow_run_id: process.env.GITHUB_RUN_ID ?? null,
  workflow_run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  repository: process.env.GITHUB_REPOSITORY ?? null,
  candidate_head: process.env.CEREBRO_PREFLIGHT_CANDIDATE_HEAD ?? head,
  live_main_head: process.env.CEREBRO_PREFLIGHT_MAIN_HEAD ?? main,
  main_delta: process.env.CEREBRO_PREFLIGHT_MAIN_DELTA ?? divergence,
  iam_routing_tests: process.env.CEREBRO_PREFLIGHT_IAM_ROUTING ?? 'NOT_RUN',
  durable_runtime_supervisor_tests: process.env.CEREBRO_PREFLIGHT_RUNTIME_SUPERVISOR ?? 'NOT_RUN',
  deepseek_provider_cost_budget_tests: process.env.CEREBRO_PREFLIGHT_DEEPSEEK_GUARDS ?? 'NOT_RUN',
  secret_values_included: false,
  physical_runtime_health_claimed: false,
});
const provider = new DeepSeekProviderV0();
mkdirSync(OUT, { recursive: true });

const results = [];
for (const id of IDS) {
  const work = queue.work_packages.find((x) => x.id === id);
  if (!work) throw new Error(`Work package ${id} missing`);
  const evidence = {
    candidate: clip(grep(patterns[id]), 7_000),
    live_main: clip(grep(patterns[id], 'origin/main'), 7_000),
  };

  const instructions = [
    prompts.shared_directive,
    role.mission,
    'This is the bounded r3 completion pass after an earlier HIGH-reasoning report was truncated at the response token cap.',
    'Keep reasoning quality HIGH, but make the visible final answer deliberately SHORT.',
    'READ ONLY. Do not claim any mutation or PROD action.',
    'Use only supplied evidence. File/workflow presence proves existence, not live runtime health.',
    'Current-workflow preflight PASS values are current-head test execution evidence because this DeepSeek step only runs after those steps succeed; they are not proof of a physically always-on host or PROD runtime health.',
    'Do not expose secrets. Treat any missing physical runtime evidence as POR_AUDITAR/EVIDENCE_GAP.',
    'Explicitly account for live-main drift from the supplied current SHAs, not stale baseline text.',
    'Return ONLY one valid compact JSON object. No markdown, no prose before or after.',
    `Schema: {"work_package":"${id}","role":"EVIDENCE_AUDITOR","overall_state":"HECHO|EXISTENTE|PARCIAL|DEFINIDO|PLANIFICADO|POR_AUDITAR","findings":[...],"contradictions":[...],"evidence_gaps":[...],"next_verifications":[...]}.`,
    `Each finding must contain: ${role.required_fields.join(', ')}.`,
    'Hard size limits for the visible JSON: findings <= 4; contradictions <= 2; evidence_gaps <= 4; next_verifications <= 5.',
    'Keep every string under 320 characters. Use path/SHA/run IDs as evidence refs rather than long explanations.',
    'Prioritise only blockers and high-value facts. Do not repeat the same main-drift point in multiple findings.',
  ].join('\n');

  const input = JSON.stringify({
    audit_contract: { queue_id: queue.queue_id, work_package: work, mutation_default: queue.mutation_default },
    live_context: {
      candidate_head: head,
      live_main_head: main,
      main_vs_candidate_left_right_count: divergence,
      main_only_commits: mainOnlyCommits,
      main_delta_files: mainDelta,
      current_workflow_preflight: preflight,
      baseline_recorded_at: baseline.recorded_at,
      baseline_reconciled_main_sha: baseline.reconciled_main_sha,
      baseline_relevant_observations: baseline.observations,
      boost_state_prepared: state.prepared,
      boost_state_post_canary_ci: state.post_canary_ci,
      boost_state_prod_touched: state.prod_touched,
      boost_manifest_status: manifest.status,
      boost_manifest_scope: manifest.scope,
    },
    targeted_repository_evidence: evidence,
  });

  const response = await provider.respond({
    model: 'deepseek-flash',
    instructions,
    input,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  }, { requestId: `jarvis-boost-001-${id.toLowerCase()}-evidence-auditor-r3` });

  const report = parseOutput(response.output_text);
  const record = {
    schema_version: '1.1', boost_id: 'JARVIS-BOOST-001', pass: 'r3', work_package: id,
    role: 'EVIDENCE_AUDITOR', read_only: true, candidate_head: head, live_main_head: main,
    current_workflow_preflight: preflight,
    provider: response.provider, model: response.model, request_id: response.request_id,
    response_id: response.response_id, response_status: response.status, usage: response.usage,
    valid_json: Boolean(report), report: report ?? { parse_error: true, raw_output: clip(response.output_text, 14_000) },
  };
  writeFileSync(join(OUT, `${id.toLowerCase()}-evidence-auditor-r3.json`), `${JSON.stringify(record, null, 2)}\n`);
  const summary = {
    work_package: id, response_status: response.status, valid_json: Boolean(report),
    input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens,
    reasoning_tokens: response.usage.reasoning_tokens, overall_state: report?.overall_state ?? 'PARSE_ERROR',
    findings: report?.findings?.length ?? 0, contradictions: report?.contradictions?.length ?? 0,
    evidence_gaps: report?.evidence_gaps?.length ?? 0,
  };
  results.push(summary);
  console.log(`CEREBRO_AUDIT_R3_RESULT::${JSON.stringify(summary)}`);
}

const batch = {
  schema_version: '1.1', boost_id: 'JARVIS-BOOST-001', pass: 'r3', batch: 'A01-A03-A04',
  mode: 'READ_ONLY', candidate_head: head, live_main_head: main, divergence,
  current_workflow_preflight: preflight,
  budget_authorization: authorization, auto_recharge: false, repo_mutation_attempted: false, results,
};
writeFileSync(join(OUT, 'summary.json'), `${JSON.stringify(batch, null, 2)}\n`);
console.log(`CEREBRO_AUDIT_R3_SUMMARY::${JSON.stringify(batch)}`);
if (results.some((x) => !x.valid_json || x.response_status !== 'completed')) process.exitCode = 2;
