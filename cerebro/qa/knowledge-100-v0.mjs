import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const outPath = outIdx >= 0 ? argv[outIdx + 1] : 'artifacts/knowledge-100/report.json';
const now = new Date();
const nowMs = now.getTime();
const HOUR = 3600000;
const DAY = 24 * HOUR;

function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function text(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function has(p, re) { return exists(p) && re.test(text(p)); }
function freshIso(value, maxAgeMs) {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) && nowMs >= t && nowMs - t <= maxAgeMs;
}
function readJson(p) { return JSON.parse(text(p)); }

const evidencePath = 'cerebro/qa/evidence/knowledge-100-live-evidence.v0.json';
let liveEvidence = null;
try { liveEvidence = readJson(evidencePath); } catch { liveEvidence = null; }
const notionEvidenceFresh = Boolean(
  liveEvidence &&
  freshIso(liveEvidence.observed_at, 24 * HOUR) &&
  liveEvidence.additional_cost_eur === 0 &&
  liveEvidence.contains_secrets === false &&
  liveEvidence.contains_customer_data === false &&
  Array.isArray(liveEvidence.notion_sources) &&
  liveEvidence.notion_sources.length >= 3
);

const repo = process.env.GITHUB_REPOSITORY ?? '';
const token = process.env.GITHUB_TOKEN ?? '';
const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
let runs = [];
async function loadRuns() {
  if (!repo || !token) return;
  const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  if (!res.ok) throw new Error(`GitHub Actions read failed: ${res.status}`);
  const body = await res.json();
  runs = body.workflow_runs ?? [];
}
function successfulRun(name, { exactSha = false, maxAgeMs = 7 * DAY } = {}) {
  const hit = runs.find((r) =>
    r.name === name &&
    r.status === 'completed' &&
    r.conclusion === 'success' &&
    (!exactSha || !targetSha || r.head_sha === targetSha) &&
    freshIso(r.updated_at || r.created_at, maxAgeMs)
  );
  return hit ? { id: hit.id, head_sha: hit.head_sha, updated_at: hit.updated_at, html_url: hit.html_url } : null;
}

await loadRuns().catch((error) => {
  console.error(`WARN: ${error.message}`);
  runs = [];
});

const humanQa = successfulRun('CEREBRO Continuous Human QA V0', { exactSha: true, maxAgeMs: 24 * HOUR });
const runtimeSmoke = successfulRun('PROD Runtime Smoke', { exactSha: true, maxAgeMs: 24 * HOUR });
const owner100 = successfulRun('CEREBRO Human Intelligence FULL_OWNER 100 V1', { exactSha: false, maxAgeMs: 7 * DAY });
const promotionReadiness = successfulRun('CEREBRO Human Intelligence Promotion Readiness V1', { exactSha: false, maxAgeMs: 7 * DAY });

const checks = {
  internalKnowledge: [
    exists('cerebro/human-intelligence/knowledge/human-principle.schema.v1.json'),
    exists('cerebro/human-intelligence/knowledge/rights-gate.mjs'),
    exists('cerebro/human-intelligence/integration/human-gateway-v1.mjs')
  ],
  masterDocs: [
    exists('cerebro/human-intelligence/README.md'),
    exists('cerebro/human-intelligence/FULL_OWNER_100_V1.md'),
    exists('cerebro/human-intelligence/PROD_GRADUAL_PROMOTION_AUTHORIZATION_2026-10-13.md')
  ],
  appCrm: [
    exists('.github/workflows/cerebro-continuous-human-qa-v0.yml'),
    exists('tests/app-real-five-flows.spec.ts')
  ],
  notionRag: [notionEvidenceFresh],
  liveDataTools: [exists('cerebro/human-intelligence/integration/human-gateway-v1.mjs')],
  rolesPermissions: [
    exists('cerebro/human-intelligence/contracts/human-interaction-contracts.v1.json'),
    exists('cerebro/human-intelligence/knowledge/rights-gate.mjs'),
    exists('cerebro/multichannel/channel-registry.v1.json')
  ],
  crossChannel: [
    exists('cerebro/multichannel/channel-registry.v1.json'),
    exists('cerebro/human-intelligence/integration/production-conversation-overlay-v1.mjs')
  ],
  longitudinalMemory: [
    notionEvidenceFresh,
    has('cerebro/human-intelligence/FULL_OWNER_100_V1.md', /memory|continuity|memoria/i)
  ],
  learning: [
    exists('cerebro/human-intelligence/integration/learning-bridge-v1.mjs'),
    has('.github/workflows/cerebro-continuous-human-qa-v0.yml', /qa-learning-bridge-v0|learning-signals/i),
    notionEvidenceFresh
  ],
  provenance: [
    exists('cerebro/runtime/skill-eval-enhancements-v1.mjs'),
    notionEvidenceFresh,
    Boolean(targetSha)
  ],
  evaluationTribunal: [
    exists('cerebro/human-intelligence/evaluation/tribunal-v1.mjs'),
    exists('cerebro/human-intelligence/evaluation/hard-gate-evaluator.mjs')
  ],
  rollback: [
    exists('cerebro/human-intelligence/integration/prod-router-zero-v1.mjs'),
    exists('cerebro/human-intelligence/integration/promotion-controller-v1.mjs'),
    has('cerebro/human-intelligence/FULL_OWNER_100_V1.md', /rollback/i)
  ]
};

const fronts = [
  { id: 1, key: 'internalKnowledge', name: 'Conocimiento interno CEREBRO', live: [owner100] },
  { id: 2, key: 'masterDocs', name: 'Documentación maestra', live: [] },
  { id: 3, key: 'appCrm', name: 'App / CRM', live: [humanQa] },
  { id: 4, key: 'notionRag', name: 'Notion / RAG / bases de conocimiento', live: [notionEvidenceFresh] },
  { id: 5, key: 'liveDataTools', name: 'Datos vivos y herramientas autorizadas', live: [runtimeSmoke] },
  { id: 6, key: 'rolesPermissions', name: 'Políticas / permisos / alcance por rol', live: [owner100] },
  { id: 7, key: 'crossChannel', name: 'Contexto común entre canales', live: [humanQa, owner100] },
  { id: 8, key: 'longitudinalMemory', name: 'Memoria longitudinal', live: [humanQa, notionEvidenceFresh] },
  { id: 9, key: 'learning', name: 'Aprendizaje LRN-001 por resultados', live: [humanQa, notionEvidenceFresh] },
  { id: 10, key: 'provenance', name: 'Procedencia / evidencia', live: [notionEvidenceFresh] },
  { id: 11, key: 'evaluationTribunal', name: 'Evaluación / tribunal', live: [humanQa, promotionReadiness] },
  { id: 12, key: 'rollback', name: 'OLD vs NEW / shadow / rollback', live: [runtimeSmoke, owner100] }
].map((front) => {
  const staticOk = (checks[front.key] ?? []).every(Boolean);
  const liveOk = front.live.every(Boolean);
  const status = staticOk && liveOk ? 'GREEN' : staticOk ? 'HOLD_LIVE_EVIDENCE' : 'FAIL_STATIC_INVARIANT';
  return { id: front.id, key: front.key, name: front.name, status, static_ok: staticOk, live_ok: liveOk };
});

const green = fronts.filter((f) => f.status === 'GREEN').length;
const failed = fronts.filter((f) => f.status === 'FAIL_STATIC_INVARIANT').length;
const report = {
  schema_version: '1.0.0',
  state_type: 'CEREBRO_CONVERSATIONAL_KNOWLEDGE_100_ACCEPTANCE_V0',
  company_id: 'fenix',
  engine_id: 'KNOWLEDGE-100-GATE',
  environment: 'PROD_READ_ONLY_ACCEPTANCE',
  version: 'v0',
  generated_at: now.toISOString(),
  target_sha: targetSha || null,
  numerator_green: green,
  denominator: fronts.length,
  percentage: Number(((green / fronts.length) * 100).toFixed(2)),
  decision: failed > 0 ? 'FAIL' : green === fronts.length ? 'CONFIRMED_OPERATIONAL' : 'HOLD',
  fronts,
  live_evidence: {
    notion_snapshot_fresh: notionEvidenceFresh,
    continuous_human_qa: humanQa,
    prod_runtime_smoke: runtimeSmoke,
    full_owner_100: owner100,
    promotion_readiness: promotionReadiness
  },
  safety: {
    prod_write_authorized: false,
    permission_expansion_authorized: false,
    trading_access: false,
    contains_customer_data: false,
    contains_secrets: false,
    additional_cost_eur: 0,
    canonical_learning_single_conversation_promotion: false
  }
};

fs.mkdirSync(path.dirname(path.join(ROOT, outPath)), { recursive: true });
fs.writeFileSync(path.join(ROOT, outPath), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

if (failed > 0) process.exitCode = 1;
