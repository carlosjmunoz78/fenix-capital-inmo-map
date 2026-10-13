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
function check(id, ok) { return Object.freeze({ id, ok: Boolean(ok) }); }
function accepted(evidence) { return Boolean(evidence?.accepted); }

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
const notionSnapshot = notionEvidenceFresh ? Object.freeze({
  accepted: true,
  evidence_scope: 'RECENT_AUTHORIZED_CONNECTOR_READ_ONLY',
  observed_at: liveEvidence.observed_at,
  sources_total: liveEvidence.notion_sources.length,
  method: liveEvidence.method ?? 'AUTHORIZED_CONNECTOR_READ_ONLY'
}) : null;

const repo = process.env.GITHUB_REPOSITORY ?? '';
const token = process.env.GITHUB_TOKEN ?? '';
const targetSha = process.env.TARGET_SHA || process.env.GITHUB_SHA || '';
let runs = [];

const currentShaEvidencePath = 'artifacts/knowledge-100/current-sha-evidence.json';
let currentShaEvidence = null;
try { currentShaEvidence = readJson(currentShaEvidencePath); } catch { currentShaEvidence = null; }
const currentShaEvidenceValid = Boolean(
  currentShaEvidence &&
  currentShaEvidence.state_type === 'CEREBRO_KNOWLEDGE_100_CURRENT_SHA_EVIDENCE' &&
  currentShaEvidence.target_sha === targetSha &&
  freshIso(currentShaEvidence.observed_at, 24 * HOUR) &&
  currentShaEvidence?.safety?.prod_write_authorized === false &&
  currentShaEvidence?.safety?.permission_expansion_authorized === false &&
  currentShaEvidence?.safety?.trading_access === false &&
  currentShaEvidence?.safety?.contains_customer_data === false &&
  currentShaEvidence?.safety?.contains_secrets === false &&
  currentShaEvidence?.safety?.additional_cost_eur === 0
);
function exactCurrentEvidence(key) {
  const item = currentShaEvidenceValid ? currentShaEvidence?.[key] : null;
  if (!item || item.accepted !== true) return null;
  return Object.freeze({
    accepted: true,
    evidence_scope: item.evidence_scope ?? 'EXACT_TARGET_SHA',
    target_sha: targetSha,
    observed_at: currentShaEvidence.observed_at
  });
}
const currentEvidence = Object.freeze({
  real_domain_contract: exactCurrentEvidence('real_domain_contract'),
  real_domain_probe: exactCurrentEvidence('real_domain_probe'),
  old_new_tribunal: exactCurrentEvidence('old_new_tribunal'),
  rollback_rehearsal: exactCurrentEvidence('rollback_rehearsal')
});
const currentRealDomain = accepted(currentEvidence.real_domain_contract) && accepted(currentEvidence.real_domain_probe)
  ? Object.freeze({
      accepted: true,
      evidence_scope: 'EXACT_TARGET_SHA_CONTRACT_PLUS_LIVE_PUBLIC_READ_ONLY',
      target_sha: targetSha,
      observed_at: currentShaEvidence.observed_at
    })
  : null;

async function loadRuns({ maxPages = 5 } = {}) {
  if (!repo || !token) return;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  const collected = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://api.github.com/repos/${repo}/actions/runs?per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub Actions read failed: ${res.status} page=${page}`);
    const body = await res.json();
    const pageRuns = Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
    collected.push(...pageRuns);
    if (pageRuns.length < 100) break;
  }
  runs = collected;
}

function normalizeWorkflowPath(value) {
  return String(value ?? '').split('@')[0].replace(/^\//, '');
}
function workflowMatches(run, spec) {
  const names = new Set(spec.names ?? []);
  const paths = new Set((spec.paths ?? []).map(normalizeWorkflowPath));
  return names.has(run?.name) || paths.has(normalizeWorkflowPath(run?.path));
}
function latestWorkflowEvidence(spec, {
  exactSha = false,
  maxAgeMs = 7 * DAY,
  evidenceScope = exactSha ? 'EXACT_TARGET_SHA' : 'RECENT_CANONICAL_GATE',
  ignoreSkipped = false
} = {}) {
  const candidates = runs
    .filter((run) => workflowMatches(run, spec))
    .filter((run) => !exactSha || !targetSha || run.head_sha === targetSha)
    .filter((run) => freshIso(run.updated_at || run.created_at, maxAgeMs))
    .filter((run) => !ignoreSkipped || run.conclusion !== 'skipped')
    .sort((a, b) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0));
  const hit = candidates[0];
  if (!hit) return null;
  const isAccepted = hit.status === 'completed' && hit.conclusion === 'success';
  return Object.freeze({
    accepted: isAccepted,
    evidence_scope: evidenceScope,
    id: hit.id,
    name: hit.name,
    path: normalizeWorkflowPath(hit.path),
    event: hit.event,
    status: hit.status,
    conclusion: hit.conclusion,
    head_sha: hit.head_sha,
    updated_at: hit.updated_at,
    html_url: hit.html_url
  });
}

await loadRuns().catch((error) => {
  console.error(`WARN: ${error.message}`);
  runs = [];
});

const WF = Object.freeze({
  humanQa: { names: ['CEREBRO Continuous Human QA V0'], paths: ['.github/workflows/cerebro-continuous-human-qa-v0.yml'] },
  runtimeSmoke: { names: ['PROD Runtime Smoke'], paths: ['.github/workflows/prod-runtime-smoke.yml'] },
  owner100: { names: ['CEREBRO Human Intelligence FULL_OWNER 100 V1'], paths: ['.github/workflows/cerebro-human-intelligence-owner100-v1.yml'] },
  promotionReadiness: { names: ['CEREBRO Human Intelligence Promotion Readiness V1'], paths: ['.github/workflows/cerebro-human-intelligence-promotion-readiness-v1.yml'] },
  sessionRegression: { names: ['CEREBRO Session Context Regression Guard'], paths: ['.github/workflows/cerebro-session-context-regression-guard.yml'] },
  multichannel: { names: ['CEREBRO Multichannel Conversation Unification V1'], paths: ['.github/workflows/cerebro-multichannel-conversation-unification-v1.yml'] },
  learningIngress: { names: ['CEREBRO RSI Universal Learning Ingress V0'], paths: ['.github/workflows/cerebro-rsi-universal-learning-ingress-v0.yml'] },
  learningControlPlane: { names: ['CEREBRO RSI Learning Control Plane V0'], paths: ['.github/workflows/cerebro-rsi-learning-control-plane-v0.yml'] },
  realDomainEvidence: { names: ['CEREBRO RSI Real Domain Evidence Wiring V0'], paths: ['.github/workflows/cerebro-rsi-real-domain-evidence-wiring-v0.yml'] },
  tribunal: { names: ['CEREBRO RSI B3 OLD NEW Evaluation Tribunal V0'], paths: ['.github/workflows/cerebro-rsi-b3-old-new-evaluation-tribunal-v0.yml'] },
  rollbackRehearsal: { names: ['PROD Rollback Rehearsal'], paths: ['.github/workflows/prod-rollback-rehearsal.yml'] }
});

const workflowEvidence = Object.freeze({
  human_qa: latestWorkflowEvidence(WF.humanQa, { exactSha: true, maxAgeMs: 24 * HOUR, evidenceScope: 'EXACT_TARGET_SHA' }),
  prod_runtime_smoke: latestWorkflowEvidence(WF.runtimeSmoke, { maxAgeMs: 24 * HOUR, evidenceScope: 'RECENT_PROD_ENVIRONMENT' }),
  full_owner_100: latestWorkflowEvidence(WF.owner100, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  promotion_readiness: latestWorkflowEvidence(WF.promotionReadiness, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  session_context_regression: latestWorkflowEvidence(WF.sessionRegression, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  multichannel_unification: latestWorkflowEvidence(WF.multichannel, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  lrn001_ingress: latestWorkflowEvidence(WF.learningIngress, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  lrn001_control_plane: latestWorkflowEvidence(WF.learningControlPlane, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE', ignoreSkipped: true }),
  lrn001_real_domain: latestWorkflowEvidence(WF.realDomainEvidence, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE', ignoreSkipped: true }),
  old_new_tribunal: latestWorkflowEvidence(WF.tribunal, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_CANONICAL_GATE' }),
  prod_rollback_rehearsal: latestWorkflowEvidence(WF.rollbackRehearsal, { maxAgeMs: 7 * DAY, evidenceScope: 'RECENT_PROD_ENVIRONMENT' })
});

const memoryMigration = 'supabase/migrations/20261001183000_cerebro_conversational_learning_v1.sql';
const gatewayIndex = 'supabase/functions/cerebro-console-gateway-v0/index.ts';
const gatewayKnowledge = 'supabase/functions/cerebro-console-gateway-v0/knowledge.ts';
const memoryVerifier = 'scripts/verify-cerebro-conversational-learning.mjs';

const staticChecks = {
  internalKnowledge: [
    check('human_principle_schema', exists('cerebro/human-intelligence/knowledge/human-principle.schema.v1.json')),
    check('rights_gate', exists('cerebro/human-intelligence/knowledge/rights-gate.mjs')),
    check('human_gateway', exists('cerebro/human-intelligence/integration/human-gateway-v1.mjs')),
    check('knowledge_router', exists(gatewayKnowledge))
  ],
  masterDocs: [
    check('human_intelligence_readme', exists('cerebro/human-intelligence/README.md')),
    check('full_owner_contract', exists('cerebro/human-intelligence/FULL_OWNER_100_V1.md')),
    check('prod_promotion_authorization', exists('cerebro/human-intelligence/PROD_GRADUAL_PROMOTION_AUTHORIZATION_2026-10-13.md'))
  ],
  appCrm: [
    check('continuous_human_qa_workflow', exists('.github/workflows/cerebro-continuous-human-qa-v0.yml')),
    check('authenticated_app_flows', exists('tests/app-real-five-flows.spec.ts')),
    check('session_context_regression_guard', exists('.github/workflows/cerebro-session-context-regression-guard.yml'))
  ],
  notionRag: [
    check('notion_authorized_snapshot', notionEvidenceFresh),
    check('retrieval_engine_registered', exists('cerebro/engines/RAG-001') || exists('cerebro/rag') || exists(gatewayKnowledge))
  ],
  liveDataTools: [
    check('human_gateway', exists('cerebro/human-intelligence/integration/human-gateway-v1.mjs')),
    check('prod_runtime_smoke_workflow', exists('.github/workflows/prod-runtime-smoke.yml'))
  ],
  rolesPermissions: [
    check('interaction_contracts', exists('cerebro/human-intelligence/contracts/human-interaction-contracts.v1.json')),
    check('rights_gate', exists('cerebro/human-intelligence/knowledge/rights-gate.mjs')),
    check('channel_registry', exists('cerebro/multichannel/channel-registry.v1.json')),
    check('channel_access_policy', exists('supabase/functions/_shared/cerebro-channel-access-policy-v1.ts'))
  ],
  crossChannel: [
    check('channel_registry', exists('cerebro/multichannel/channel-registry.v1.json')),
    check('conversation_policy', exists('supabase/functions/_shared/cerebro-conversation-policy-v1.ts')),
    check('production_overlay', exists('cerebro/human-intelligence/integration/production-conversation-overlay-v1.mjs')),
    check('multichannel_gate', exists('.github/workflows/cerebro-multichannel-conversation-unification-v1.yml'))
  ],
  longitudinalMemory: [
    check('memory_migration', exists(memoryMigration)),
    check('memory_table', has(memoryMigration, /cerebro_conversation_memory/i)),
    check('memory_observe_rpc', has(memoryMigration, /fenix_prod_cerebro_memory_observe_server/i)),
    check('memory_search_rpc', has(memoryMigration, /fenix_prod_cerebro_memory_search_server/i)),
    check('structured_memory_v2', has(gatewayIndex, /STRUCTURED_CONVERSATIONAL_MEMORY_V2/)),
    check('bounded_last_10_turns', has(gatewayIndex, /LAST_10_BOUNDED_TURNS/)),
    check('explicit_supersession', has(gatewayIndex, /EXPLICIT_SUPERSESSION_V1/)),
    check('memory_verifier', exists(memoryVerifier)),
    check('memory_pollution_guard', has(memoryVerifier, /pollution|raw conversational turns|questions as facts|recall-only/i))
  ],
  learning: [
    check('learning_bridge', exists('cerebro/human-intelligence/integration/learning-bridge-v1.mjs')),
    check('qa_learning_bridge', has('.github/workflows/cerebro-continuous-human-qa-v0.yml', /qa-learning-bridge-v0|learning-signals/i)),
    check('universal_learning_ingress_workflow', exists('.github/workflows/cerebro-rsi-universal-learning-ingress-v0.yml')),
    check('learning_control_plane_workflow', exists('.github/workflows/cerebro-rsi-learning-control-plane-v0.yml')),
    check('notion_knowledge_foundry_snapshot', notionEvidenceFresh)
  ],
  provenance: [
    check('skill_provenance_runtime', exists('cerebro/runtime/skill-eval-enhancements-v1.mjs')),
    check('notion_authorized_snapshot', notionEvidenceFresh),
    check('target_sha', Boolean(targetSha))
  ],
  evaluationTribunal: [
    check('tribunal', exists('cerebro/human-intelligence/evaluation/tribunal-v1.mjs')),
    check('hard_gate_evaluator', exists('cerebro/human-intelligence/evaluation/hard-gate-evaluator.mjs')),
    check('old_new_tribunal_workflow', exists('.github/workflows/cerebro-rsi-b3-old-new-evaluation-tribunal-v0.yml'))
  ],
  rollback: [
    check('zero_router', exists('cerebro/human-intelligence/integration/prod-router-zero-v1.mjs')),
    check('promotion_controller', exists('cerebro/human-intelligence/integration/promotion-controller-v1.mjs')),
    check('rollback_contract', has('cerebro/human-intelligence/FULL_OWNER_100_V1.md', /rollback/i)),
    check('prod_rollback_rehearsal_workflow', exists('.github/workflows/prod-rollback-rehearsal.yml'))
  ]
};

const liveRequirements = {
  internalKnowledge: [
    ['full_owner_100', workflowEvidence.full_owner_100],
    ['session_context_regression', workflowEvidence.session_context_regression]
  ],
  masterDocs: [],
  appCrm: [
    ['human_qa_exact_target', workflowEvidence.human_qa]
  ],
  notionRag: [
    ['notion_authorized_snapshot', notionSnapshot]
  ],
  liveDataTools: [
    ['prod_runtime_smoke', workflowEvidence.prod_runtime_smoke]
  ],
  rolesPermissions: [
    ['full_owner_100', workflowEvidence.full_owner_100],
    ['multichannel_unification', workflowEvidence.multichannel_unification]
  ],
  crossChannel: [
    ['multichannel_unification', workflowEvidence.multichannel_unification],
    ['session_context_regression', workflowEvidence.session_context_regression]
  ],
  longitudinalMemory: [
    ['session_context_regression', workflowEvidence.session_context_regression],
    ['prod_runtime_smoke', workflowEvidence.prod_runtime_smoke]
  ],
  learning: [
    ['lrn001_ingress', workflowEvidence.lrn001_ingress],
    ['current_sha_real_domain', currentRealDomain]
  ],
  provenance: [
    ['notion_authorized_snapshot', notionSnapshot]
  ],
  evaluationTribunal: [
    ['current_sha_old_new_tribunal', currentEvidence.old_new_tribunal],
    ['promotion_readiness', workflowEvidence.promotion_readiness]
  ],
  rollback: [
    ['current_sha_rollback_rehearsal', currentEvidence.rollback_rehearsal],
    ['full_owner_100', workflowEvidence.full_owner_100]
  ]
};

const frontDefinitions = [
  [1, 'internalKnowledge', 'Conocimiento interno CEREBRO'],
  [2, 'masterDocs', 'Documentación maestra'],
  [3, 'appCrm', 'App / CRM'],
  [4, 'notionRag', 'Notion / RAG / bases de conocimiento'],
  [5, 'liveDataTools', 'Datos vivos y herramientas autorizadas'],
  [6, 'rolesPermissions', 'Políticas / permisos / alcance por rol'],
  [7, 'crossChannel', 'Contexto común entre canales'],
  [8, 'longitudinalMemory', 'Memoria longitudinal'],
  [9, 'learning', 'Aprendizaje LRN-001 por resultados'],
  [10, 'provenance', 'Procedencia / evidencia'],
  [11, 'evaluationTribunal', 'Evaluación / tribunal'],
  [12, 'rollback', 'OLD vs NEW / shadow / rollback']
];

const fronts = frontDefinitions.map(([id, key, name]) => {
  const staticItems = staticChecks[key] ?? [];
  const liveItems = liveRequirements[key] ?? [];
  const staticOk = staticItems.every((item) => item.ok);
  const liveOk = liveItems.every(([, evidence]) => accepted(evidence));
  const status = staticOk && liveOk ? 'GREEN' : staticOk ? 'HOLD_LIVE_EVIDENCE' : 'FAIL_STATIC_INVARIANT';
  return {
    id,
    key,
    name,
    status,
    static_ok: staticOk,
    live_ok: liveOk,
    static_checks: staticItems,
    missing_static_checks: staticItems.filter((item) => !item.ok).map((item) => item.id),
    live_evidence_refs: Object.fromEntries(liveItems),
    missing_live_evidence: liveItems.filter(([, evidence]) => !accepted(evidence)).map(([evidenceKey]) => evidenceKey)
  };
});

const green = fronts.filter((front) => front.status === 'GREEN').length;
const failed = fronts.filter((front) => front.status === 'FAIL_STATIC_INVARIANT').length;
const report = {
  schema_version: '1.2.0',
  state_type: 'CEREBRO_CONVERSATIONAL_KNOWLEDGE_100_ACCEPTANCE_V0',
  company_id: 'fenix',
  engine_id: 'KNOWLEDGE-100-GATE',
  environment: 'PROD_READ_ONLY_ACCEPTANCE',
  version: 'v0.3',
  generated_at: now.toISOString(),
  target_sha: targetSha || null,
  actions_runs_scanned: runs.length,
  numerator_green: green,
  denominator: fronts.length,
  percentage: Number(((green / fronts.length) * 100).toFixed(2)),
  decision: failed > 0 ? 'FAIL' : green === fronts.length ? 'CONFIRMED_OPERATIONAL' : 'HOLD',
  fronts,
  live_evidence: {
    notion_snapshot: notionSnapshot,
    current_sha: currentShaEvidenceValid ? currentShaEvidence : null,
    workflows: workflowEvidence
  },
  evidence_policy: {
    latest_matching_run_wins: true,
    skipped_wrapper_runs_are_non_evidence_not_regressions: true,
    stale_success_cannot_mask_newer_completed_failure: true,
    exact_target_sha_required_for: [
      'continuous_human_qa',
      'real_domain_contract_and_live_readonly_probe',
      'old_new_tribunal_contract',
      'rollback_no_deploy_rehearsal'
    ],
    recent_prod_environment_allowed_for: ['prod_runtime_smoke'],
    recent_canonical_gate_allowed_for: [
      'full_owner_100', 'promotion_readiness', 'session_context_regression', 'multichannel_unification', 'lrn001_ingress'
    ]
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
