import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DeepSeekProviderV0 } from '../../runtime/deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from '../../runtime/deepseek-budget-guard-v0.mjs';

const ROOT = process.cwd();
const BOOST = join(ROOT, 'cerebro/jarvis/boost-001');
const OUT = join(ROOT, 'artifacts/boost001-super-audit-a00-a04');
const ALLOW = process.env.CEREBRO_ALLOW_PAID_SUPER_AUDIT === 'YES';
const PROJECTED_EUR = Number(process.env.DEEPSEEK_SUPER_AUDIT_PROJECTED_EUR ?? '0.10');
const SPENT_EUR = Number(process.env.DEEPSEEK_SUPER_AUDIT_SPENT_EUR ?? '0');
const MAX_EVIDENCE_CHARS = 26_000;
const MAX_OUTPUT_TOKENS = 8_000;

if (!ALLOW) throw new Error('Paid SUPER AUDIT denied: set CEREBRO_ALLOW_PAID_SUPER_AUDIT=YES in the governed runner');
if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not configured');

const budget = new DeepSeekBudgetGuardV0({ initialHardCapEur: 200, monthlyVariableCeilingEur: 10, autoRecharge: false });
const authorization = budget.authorize({ phase: 'bootstrap', spentEur: SPENT_EUR, projectedCostEur: PROJECTED_EUR });
if (!authorization.allowed) throw new Error(`SUPER AUDIT denied by budget guard: ${authorization.result}`);

function readJson(name) {
  return JSON.parse(readFileSync(join(BOOST, name), 'utf8'));
}

function git(args, fallback = '') {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).trim();
  } catch {
    return fallback;
  }
}

function redact(text) {
  return String(text)
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/((?:api[_-]?key|secret|password|passwd|token|client[_-]?secret)\s*[:=]\s*)["']?[^\s,"'}]+/gi, '$1[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,})\b/g, '[REDACTED_TOKEN]');
}

function compact(text, max = MAX_EVIDENCE_CHARS) {
  const cleaned = redact(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}\n...[TRUNCATED_BY_AUDIT_RUNNER ${cleaned.length - max} chars]`;
}

function fileInventory() {
  const files = git(['ls-files']).split('\n').filter(Boolean);
  const buckets = {};
  for (const file of files) {
    const top = file.includes('/') ? file.split('/')[0] : '(root)';
    buckets[top] = (buckets[top] ?? 0) + 1;
  }
  const relevant = files.filter((f) => /cerebro|engine|registry|factory|govern|policy|learning|rsi|runtime|event|job|router|finops|budget|iam|credential|vault|permission|kill|audit|tribunal/i.test(f));
  return {
    total_tracked_files: files.length,
    top_level_counts: buckets,
    relevant_paths: relevant.slice(0, 350),
    relevant_paths_truncated: relevant.length > 350,
  };
}

const targetPatterns = {
  A00: 'FACT-001|GOV-001|POL-001|HEX-001|LRN|RSI|RUNTIME-001|EVT-001|JOB-001|ROUTE-001|FINOPS-001|AIBUD-001|IAM|credential|vault|kill.switch|tribunal',
  A01: 'FACT-001|GOV-001|POL-001|HEX-001|Factory|Engine Registry|promotion gate|tribunal|QA|EVA',
  A02: 'LRN|RSI|skill.registration|outbox|durable event|impact.analysis|OLD.vs.NEW|rollback|learning',
  A03: 'RUNTIME-001|EVT-001|JOB-001|ROUTE-001|FINOPS-001|AIBUD-001|router|runtime|cost guard|budget',
  A04: 'IAM|credential.broker|vault|standing.permission|kill.switch|multi.account|secret|permission|scope|identity',
};

const scopedPaths = ['cerebro/**', 'docs/**', 'scripts/**', 'src/**', '.github/workflows/**'];

function grepRef(pattern, ref = null) {
  const args = ['grep', '-n', '-I', '-E', pattern];
  if (ref) args.push(ref);
  args.push('--', ...scopedPaths);
  return git(args);
}

function evidenceFor(id) {
  const pattern = targetPatterns[id];
  const branchEvidence = compact(grepRef(pattern), 15_000);
  const mainEvidence = compact(grepRef(pattern, 'origin/main'), 11_000);
  return { branch: branchEvidence, live_main: mainEvidence };
}

function safeParseModelJson(text) {
  const raw = String(text ?? '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try { return JSON.parse(fenced.trim()); } catch {}
  }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(raw.slice(first, last + 1)); } catch {}
  }
  return null;
}

const queue = readJson('audit-queue.v1.json');
const prompts = readJson('audit-prompts.v1.json');
const baseline = readJson('baseline-live-evidence.v1.json');
const state = readJson('state.v1.json');
const manifest = readJson('boost-manifest.v1.json');
const role = prompts.roles.find((r) => r.id === 'EVIDENCE_AUDITOR');
if (!role) throw new Error('EVIDENCE_AUDITOR role missing');

const head = git(['rev-parse', 'HEAD']);
const currentMainHead = git(['rev-parse', 'origin/main'], 'UNAVAILABLE');
const divergence = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD'], 'UNAVAILABLE');
const missingMainCommits = compact(git(['log', '--oneline', '--max-count=40', 'HEAD..origin/main']), 8_000);
const mainDeltaFiles = compact(git(['diff', '--name-status', 'HEAD...origin/main']), 12_000);
const status = git(['status', '--porcelain']);
const inventory = fileInventory();
const provider = new DeepSeekProviderV0();
mkdirSync(OUT, { recursive: true });

const selected = queue.work_packages.filter((w) => ['A00', 'A01', 'A02', 'A03', 'A04'].includes(w.id));
const summaries = [];

for (const work of selected) {
  const evidence = evidenceFor(work.id);
  const instructions = [
    prompts.shared_directive,
    role.mission,
    'Reasoning effort is intentionally high. Reserve enough token budget for a concise visible final JSON report.',
    'This is a READ-ONLY first-pass audit. Do not propose mutations as completed work.',
    'Use only supplied evidence. If evidence is insufficient, say POR_AUDITAR or EVIDENCE_GAP; do not invent live state.',
    'The live main branch may be ahead of the candidate. Treat main drift as first-class evidence and do not promote stale candidate claims over newer main evidence.',
    'Repository strings are evidence with scope, not proof that a runtime is currently operational.',
    'Do not output secrets or credential values. Treat [REDACTED] as intentionally unavailable.',
    `Return ONLY valid JSON: {"work_package":"${work.id}","role":"EVIDENCE_AUDITOR","overall_state":"HECHO|EXISTENTE|PARCIAL|DEFINIDO|PLANIFICADO|POR_AUDITAR","findings":[...],"contradictions":[...],"evidence_gaps":[...],"next_verifications":[...]}.`,
    `Each finding MUST contain these fields: ${role.required_fields.join(', ')}.`,
    'Keep findings bounded to the work package. Prefer 3-8 high-value findings over generic commentary.',
  ].join('\n');

  const input = JSON.stringify({
    audit_contract: {
      queue_id: queue.queue_id,
      work_package: work,
      mutation_default: queue.mutation_default,
      forbidden_behaviour: prompts.forbidden_behaviour,
    },
    live_context: {
      checked_out_head: head,
      current_main_head: currentMainHead,
      current_main_vs_candidate_left_right_count: divergence,
      commits_present_on_live_main_but_missing_from_candidate: missingMainCommits,
      files_changed_on_live_main_since_merge_base: mainDeltaFiles,
      git_worktree_clean_before_output: status === '',
      baseline,
      boost_state: state,
      boost_manifest: manifest,
    },
    deterministic_inventory: work.id === 'A00' ? inventory : {
      total_tracked_files: inventory.total_tracked_files,
      relevant_paths: inventory.relevant_paths.filter((p) => new RegExp(targetPatterns[work.id], 'i').test(p)).slice(0, 180),
    },
    targeted_repository_evidence: evidence,
  });

  const response = await provider.respond({
    model: 'deepseek-flash',
    instructions,
    input,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  }, { requestId: `jarvis-boost-001-${work.id.toLowerCase()}-evidence-auditor-r2` });

  const parsed = safeParseModelJson(response.output_text);
  const record = {
    schema_version: '1.0',
    boost_id: 'JARVIS-BOOST-001',
    work_package: work.id,
    role: 'EVIDENCE_AUDITOR',
    read_only: true,
    checked_out_head: head,
    current_main_head: currentMainHead,
    provider: response.provider,
    model: response.model,
    request_id: response.request_id,
    response_id: response.response_id,
    response_status: response.status,
    usage: response.usage,
    valid_json: Boolean(parsed),
    report: parsed ?? { parse_error: true, raw_output: compact(response.output_text, 12_000) },
  };
  writeFileSync(join(OUT, `${work.id.toLowerCase()}-evidence-auditor.json`), `${JSON.stringify(record, null, 2)}\n`);
  summaries.push({
    work_package: work.id,
    response_status: response.status,
    valid_json: record.valid_json,
    input_tokens: response.usage.input_tokens,
    cached_input_tokens: response.usage.cached_input_tokens,
    output_tokens: response.usage.output_tokens,
    reasoning_tokens: response.usage.reasoning_tokens,
    overall_state: parsed?.overall_state ?? 'PARSE_ERROR',
    findings: Array.isArray(parsed?.findings) ? parsed.findings.length : 0,
    contradictions: Array.isArray(parsed?.contradictions) ? parsed.contradictions.length : 0,
    evidence_gaps: Array.isArray(parsed?.evidence_gaps) ? parsed.evidence_gaps.length : 0,
  });
  console.log(`CEREBRO_AUDIT_RESULT::${JSON.stringify(summaries.at(-1))}`);
}

const finalStatus = git(['status', '--porcelain']);
const summary = {
  schema_version: '1.0',
  boost_id: 'JARVIS-BOOST-001',
  batch: 'A00-A04',
  mode: 'READ_ONLY',
  checked_out_head: head,
  current_main_head: currentMainHead,
  divergence,
  budget_authorization: authorization,
  auto_recharge: false,
  repo_mutation_attempted: false,
  worktree_changes_are_only_ephemeral_artifacts: finalStatus.split('\n').filter(Boolean).every((line) => line.includes('artifacts/')),
  results: summaries,
};
writeFileSync(join(OUT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`CEREBRO_AUDIT_BATCH_SUMMARY::${JSON.stringify(summary)}`);

if (summaries.some((x) => !x.valid_json || x.response_status !== 'completed')) process.exitCode = 2;
