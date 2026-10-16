import crypto from 'node:crypto';
import { decideSkillCapabilityAutonomy } from './skill-capability-autonomy-closure-v1.mjs';

export const FACT_SKILL_NATIVE_VERSION = '1.0.0';
export const FACT_SKILL_NATIVE_ROUTE = 'capability://FACT-SKILL-NATIVE/v1/admit';
export const FACT_SKILL_NATIVE_FULL_GATES = Object.freeze([
  'registry_versioning',
  'multi_company_fields',
  'manifest_contracts_events',
  'permissions_policy',
  'real_implementation_or_wrapper',
  'gateway_router_integration',
  'tests_integration_e2e',
  'evaluation_tribunal',
  'old_vs_new_when_applicable',
  'observability_idempotency_cost',
  'fallbacks',
  'backup_rollback_rebuild',
  'runbook_changelog_dependencies',
  'preprod_green_evidence'
]);

const PREPROD = 'PREPROD';
const HUMAN_REQUIRED_CODES = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  return value.trim();
}
function bool(value) { return value === true; }
function arr(value) { return Array.isArray(value) ? value : []; }
function uniq(value) { return [...new Set(arr(value).filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()))].sort(); }
function sha(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

function normalize(raw = {}) {
  const company_id = text(raw.company_id, 'company_id');
  const engine_id = raw.engine_id == null ? 'FACT-001' : text(raw.engine_id, 'engine_id');
  const environment = raw.environment == null ? PREPROD : text(raw.environment, 'environment');
  const version = raw.version == null ? FACT_SKILL_NATIVE_VERSION : text(raw.version, 'version');
  if (engine_id !== 'FACT-001') throw new Error('FACT-SKILL-NATIVE must be owned by FACT-001');
  if (environment !== PREPROD) throw new Error('FACT-SKILL-NATIVE v1 is PREPROD-only');

  const candidate = raw.candidate ?? {};
  const skill_id = text(candidate.skill_id, 'candidate.skill_id');
  const skill_version = text(candidate.skill_version, 'candidate.skill_version');
  const source_ref = text(candidate.source_ref, 'candidate.source_ref');
  const manifest_sha256 = text(candidate.manifest_sha256, 'candidate.manifest_sha256');
  if (!/^[a-f0-9]{64}$/i.test(manifest_sha256)) throw new Error('candidate.manifest_sha256 must be sha256');

  const evidence = raw.evidence ?? {};
  const security = raw.security ?? {};
  const lifecycle = raw.lifecycle ?? {};
  const observed = arr(raw.observed_registry);
  const bindings = uniq(raw.impact?.existing_engine_bindings);

  return Object.freeze({
    company_id, engine_id, environment, version,
    skill_id, skill_version, source_ref, manifest_sha256: manifest_sha256.toLowerCase(),
    license_spdx: candidate.license_spdx == null ? null : String(candidate.license_spdx).trim(),
    risk_class: raw.risk_class ?? 'LOW',
    bindings,
    observed,
    evidence,
    security,
    lifecycle,
    needed_now: raw.demand?.needed_now !== false,
    additional_cost_eur: Math.max(0, Number(raw.cost?.additional_cost_eur ?? 0) || 0),
    zero_cost_alternative: bool(raw.cost?.zero_cost_alternative),
    roi_positive: bool(raw.cost?.roi_positive),
    money_limit_exceeded: bool(raw.cost?.money_limit_exceeded),
    requested_permissions: uniq(raw.permissions?.requested),
    allowed_permissions: uniq(raw.permissions?.allowed),
    policy_locked: bool(raw.policy?.locked),
    permissions_locked: bool(raw.permissions?.locked),
    rollback_ready: bool(lifecycle.rollback_ready),
    rebuild_ready: bool(lifecycle.rebuild_ready),
    backup_ready: bool(lifecycle.backup_ready),
    runbook_ready: bool(lifecycle.runbook_ready),
    changelog_ready: bool(lifecycle.changelog_ready),
    dependencies_mapped: bool(lifecycle.dependencies_mapped),
    router_connected: bool(lifecycle.router_connected),
    integration_e2e_green: bool(lifecycle.integration_e2e_green),
    observability_connected: bool(lifecycle.observability_connected),
    idempotency_proven: bool(lifecycle.idempotency_proven),
    fallback_ready: bool(lifecycle.fallback_ready),
    preprod_green_evidence: bool(lifecycle.preprod_green_evidence),
    learning_hooks_connected: bool(lifecycle.learning_hooks_connected)
  });
}

function permissionsSubset(base) {
  const allowed = new Set(base.allowed_permissions);
  return base.requested_permissions.every((permission) => allowed.has(permission));
}

function exactDuplicate(base) {
  return base.observed.some((item) => item?.skill_id === base.skill_id && item?.skill_version === base.skill_version && String(item?.manifest_sha256 ?? '').toLowerCase() === base.manifest_sha256);
}

function gateMap(base, decision) {
  const oldVsNewPass = base.evidence?.old_vs_new?.decision === 'PASS';
  const tribunalPass = base.evidence?.tribunal?.decision === 'PASS';
  const evalPass = base.evidence?.evaluation?.decision === 'PASS';
  const provenanceGreen = base.security?.provenance_ok === true && base.security?.supply_chain_ok === true && base.security?.license_ok === true;
  const policyGreen = base.policy_locked && base.permissions_locked && permissionsSubset(base);
  const implementationGreen = decision.decision === 'ENVOLVER' || decision.decision === 'REUTILIZAR';
  const docsGreen = base.runbook_ready && base.changelog_ready && base.dependencies_mapped;
  const resilienceGreen = base.backup_ready && base.rollback_ready && base.rebuild_ready;
  const obsGreen = base.observability_connected && base.idempotency_proven && base.additional_cost_eur === 0;

  return Object.freeze({
    registry_versioning: true,
    multi_company_fields: true,
    manifest_contracts_events: provenanceGreen,
    permissions_policy: policyGreen,
    real_implementation_or_wrapper: implementationGreen,
    gateway_router_integration: base.router_connected,
    tests_integration_e2e: base.integration_e2e_green,
    evaluation_tribunal: evalPass && tribunalPass,
    old_vs_new_when_applicable: oldVsNewPass,
    observability_idempotency_cost: obsGreen,
    fallbacks: base.fallback_ready,
    backup_rollback_rebuild: resilienceGreen,
    runbook_changelog_dependencies: docsGreen,
    preprod_green_evidence: base.preprod_green_evidence
  });
}

function event(base, type, payload = {}) {
  return Object.freeze({
    event_id: `evt:${sha({ type, skill_id: base.skill_id, skill_version: base.skill_version, company_id: base.company_id, payload }).slice(0, 24)}`,
    type,
    company_id: base.company_id,
    engine_id: base.engine_id,
    environment: base.environment,
    version: base.version,
    payload: Object.freeze(payload)
  });
}

export function runFactSkillNative(raw = {}) {
  const base = normalize(raw);
  const duplicate = exactDuplicate(base);
  const permissionScopeGreen = permissionsSubset(base);
  const evidenceComplete = [
    base.security?.provenance_ok,
    base.security?.supply_chain_ok,
    base.security?.license_ok,
    base.evidence?.old_vs_new?.decision === 'PASS',
    base.evidence?.evaluation?.decision === 'PASS',
    base.evidence?.tribunal?.decision === 'PASS',
    base.lifecycle.integration_e2e_green,
    base.lifecycle.observability_connected,
    base.lifecycle.idempotency_proven,
    base.lifecycle.preprod_green_evidence,
    permissionScopeGreen
  ].every(Boolean);

  const decision = decideSkillCapabilityAutonomy({
    company_id: base.company_id,
    version: base.version,
    environment: base.environment,
    skill_id: base.skill_id,
    skill_version: base.skill_version,
    risk_class: base.risk_class,
    source_ref: base.source_ref,
    impact: { existing_engine_bindings: base.bindings },
    duplicate: { exact: duplicate },
    evidence: { complete: evidenceComplete, confidence: Number(base.evidence?.confidence ?? 0) },
    security: {
      provenance_ok: base.security?.provenance_ok === true,
      supply_chain_ok: base.security?.supply_chain_ok === true,
      license_ok: base.security?.license_ok === true,
      incident: base.security?.incident === true,
      legal_required: base.security?.legal_required === true
    },
    policy_conflict: base.security?.policy_conflict === true,
    policy_locked: base.policy_locked,
    permissions_locked: base.permissions_locked && permissionScopeGreen,
    rollback_ready: base.rollback_ready,
    rebuild_ready: base.rebuild_ready,
    internal_wrapper_ready: base.lifecycle.internal_wrapper_ready === true,
    external_code_execution_required: base.lifecycle.external_code_execution_required === true,
    demand: { needed_now: base.needed_now },
    old_vs_new: {
      decision: base.evidence?.old_vs_new?.decision ?? 'MORE_EVIDENCE',
      reasons: uniq(base.evidence?.old_vs_new?.reasons)
    },
    tribunal: {
      decision: base.evidence?.tribunal?.decision ?? 'MORE_EVIDENCE',
      human_required: base.evidence?.tribunal?.human_required ?? null
    },
    cost: {
      additional_cost_eur: base.additional_cost_eur,
      zero_cost_alternative: base.zero_cost_alternative,
      roi_positive: base.roi_positive,
      money_limit_exceeded: base.money_limit_exceeded
    }
  });

  if (decision.human_required && !HUMAN_REQUIRED_CODES.has(decision.human_required)) throw new Error('non-canonical HUMAN_REQUIRED emitted');
  const gates = gateMap(base, decision);
  const failed_gates = FACT_SKILL_NATIVE_FULL_GATES.filter((gate) => gates[gate] !== true);
  const nativeFull = failed_gates.length === 0 && ['ENVOLVER','REUTILIZAR'].includes(decision.decision) && decision.human_required == null;
  const registration_id = `skillreg:${sha({ company_id: base.company_id, skill_id: base.skill_id, skill_version: base.skill_version, manifest_sha256: base.manifest_sha256 }).slice(0, 28)}`;
  const idempotency_key = sha({ route: FACT_SKILL_NATIVE_ROUTE, registration_id, environment: base.environment, version: base.version });

  const events = [
    event(base, 'skill.native.discovery.accepted', { registration_id, duplicate }),
    event(base, 'skill.native.impact.evaluated', { bindings: base.bindings, decision: decision.decision }),
    event(base, 'skill.native.tribunal.completed', { decision: base.evidence?.tribunal?.decision ?? 'MORE_EVIDENCE' })
  ];
  if (base.learning_hooks_connected) events.push(event(base, 'skill.native.learning.feedback', { registration_id, full: nativeFull }));

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_FACT_SKILL_NATIVE_RECEIPT',
    capability_id: 'FACT-SKILL-NATIVE',
    company_id: base.company_id,
    engine_id: base.engine_id,
    environment: base.environment,
    version: base.version,
    route: FACT_SKILL_NATIVE_ROUTE,
    registration: Object.freeze({ registration_id, skill_id: base.skill_id, skill_version: base.skill_version, manifest_sha256: base.manifest_sha256, source_ref: base.source_ref, versioned: true, duplicate }),
    discovery_import: Object.freeze({ metadata_imported: true, external_skill_code_executed: false }),
    security: Object.freeze({ provenance_green: base.security?.provenance_ok === true, supply_chain_green: base.security?.supply_chain_ok === true, license_green: base.security?.license_ok === true, permission_scope_green: permissionScopeGreen }),
    impact_analysis: Object.freeze({ existing_engine_bindings: base.bindings, create_new_engine_authorized: false }),
    decision,
    full_gates: gates,
    failed_gates: Object.freeze(failed_gates),
    status: nativeFull ? 'NATIVE_FULL_PREPROD' : (decision.human_required ? 'HUMAN_REQUIRED' : 'HOLD'),
    native_full: nativeFull,
    promotion: Object.freeze({ preprod_registration_authorized: nativeFull, prod_authorized: false, prod_write_authorized: false, auto_merge_authorized: false }),
    learning: Object.freeze({ hooks_connected: base.learning_hooks_connected, event_count: events.length }),
    events: Object.freeze(events),
    observability: Object.freeze({ connected: base.observability_connected, audit: true, idempotency_key }),
    finops: Object.freeze({ additional_cost_eur: base.additional_cost_eur, target_eur: 0, paid_fallback: false }),
    fallback: Object.freeze({ ready: base.fallback_ready, strategy: 'KEEP_PREVIOUS_VERSION_OR_USE_EXISTING_CAPABILITY' }),
    backup: Object.freeze({ ready: base.backup_ready, strategy: 'VERSIONED_REGISTRY_SNAPSHOT' }),
    rollback: Object.freeze({ ready: base.rollback_ready, strategy: 'DISABLE_BINDING_AND_RESTORE_PREVIOUS_VERSION' }),
    rebuild: Object.freeze({ ready: base.rebuild_ready, strategy: 'REPLAY_VERSIONED_MANIFEST_AND_FIRST_PARTY_WRAPPER' }),
    no_prod_mutation: true,
    no_customer_data: true,
    no_trading: true
  });
}
