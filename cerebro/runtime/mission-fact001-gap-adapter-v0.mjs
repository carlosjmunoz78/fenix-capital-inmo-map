import crypto from 'node:crypto';
import { FACT_SKILL_NATIVE_ROUTE } from './fact-skill-native-v1.mjs';
import { routeFactSkillNative } from './fact-skill-native-router-v1.mjs';

const PREPROD = 'PREPROD';

function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  return value.trim();
}

function slug(value) {
  return text(value, 'requested_capability')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'unknown-capability';
}

function validateHandoff(handoff) {
  if (!handoff || typeof handoff !== 'object') throw new Error('FACT001 handoff required');
  if (handoff.state_type !== 'CEREBRO_FACT001_CAPABILITY_GAP_HANDOFF') throw new Error('unsupported handoff state_type');
  if (handoff.engine_id !== 'FACT-001') throw new Error('FACT-001 ownership required');
  if (handoff.environment !== PREPROD) throw new Error('mission FACT handoff must be PREPROD');
  if (handoff.factory_first !== true || handoff.reuse_existing_first !== true) throw new Error('factory/reuse policy missing');
  if (handoff.factory_candidate_authorized !== true) throw new Error('factory candidate authorization required');
  if (handoff.factory_create_authorized !== false || handoff.registry_change_authorized !== false) throw new Error('unsafe factory mutation authorization');
  if (handoff.prod_authorized !== false || handoff.prod_write_authorized !== false || handoff.trading_access !== false) throw new Error('unsafe handoff authority');
  if (Number(handoff.additional_cost_eur ?? 0) !== 0) throw new Error('non-zero additional cost denied');
  text(handoff.handoff_id, 'handoff_id');
  text(handoff.company_id, 'company_id');
  text(handoff.requested_capability, 'requested_capability');
  return handoff;
}

export function buildFactSkillNativePayloadFromMissionGap(handoff, { observedRegistry = [] } = {}) {
  const safe = validateHandoff(handoff);
  const capability = slug(safe.requested_capability);
  const manifest_sha256 = sha({
    handoff_id: safe.handoff_id,
    company_id: safe.company_id,
    requested_capability: safe.requested_capability,
    source_engine_id: safe.source_engine_id ?? null,
    source_work_unit_id: safe.source_work_unit_id ?? null,
    source_fingerprint: safe.source_fingerprint ?? null
  });

  return Object.freeze({
    company_id: safe.company_id,
    engine_id: 'FACT-001',
    environment: PREPROD,
    version: '1.0.0',
    candidate: Object.freeze({
      skill_id: `mission-gap-${capability}`,
      skill_version: '0.0.0-gap',
      source_ref: `cerebro://mission-gap/${safe.handoff_id}`,
      manifest_sha256,
      license_spdx: 'INTERNAL-NO-EXTERNAL-CODE'
    }),
    risk_class: 'MEDIUM',
    observed_registry: Array.isArray(observedRegistry) ? observedRegistry : [],
    impact: Object.freeze({ existing_engine_bindings: [safe.source_engine_id].filter(Boolean) }),
    demand: Object.freeze({ needed_now: true }),
    evidence: Object.freeze({
      confidence: 0.78,
      old_vs_new: Object.freeze({ decision: 'MORE_EVIDENCE', reasons: ['MISSION_GAP_REQUIRES_GOVERNED_FACTORY_REVIEW'] }),
      evaluation: Object.freeze({ decision: 'MORE_EVIDENCE' }),
      tribunal: Object.freeze({ decision: 'MORE_EVIDENCE', human_required: null })
    }),
    security: Object.freeze({
      provenance_ok: true,
      supply_chain_ok: true,
      license_ok: true,
      incident: false,
      legal_required: false,
      policy_conflict: false
    }),
    policy: Object.freeze({ locked: true }),
    permissions: Object.freeze({ requested: [], allowed: [], locked: true }),
    cost: Object.freeze({ additional_cost_eur: 0, zero_cost_alternative: true, roi_positive: false, money_limit_exceeded: false }),
    lifecycle: Object.freeze({
      internal_wrapper_ready: false,
      external_code_execution_required: false,
      rollback_ready: false,
      rebuild_ready: false,
      backup_ready: false,
      runbook_ready: false,
      changelog_ready: false,
      dependencies_mapped: false,
      router_connected: true,
      integration_e2e_green: false,
      observability_connected: true,
      idempotency_proven: false,
      fallback_ready: true,
      preprod_green_evidence: false,
      learning_hooks_connected: true
    })
  });
}

export function consumeMissionCapabilityGapWithFact001(handoff, { observedRegistry = [] } = {}) {
  const payload = buildFactSkillNativePayloadFromMissionGap(handoff, { observedRegistry });
  const factReceipt = routeFactSkillNative({
    route: FACT_SKILL_NATIVE_ROUTE,
    payload,
    context: {
      gateway_authorized: true,
      company_id: payload.company_id,
      engine_id: 'FACT-001',
      environment: PREPROD
    }
  });

  if (factReceipt.engine_id !== 'FACT-001' || factReceipt.no_prod_mutation !== true || factReceipt.no_trading !== true) {
    throw new Error('FACT-001 receipt violated safety contract');
  }
  if (factReceipt.impact_analysis?.create_new_engine_authorized !== false) {
    throw new Error('FACT-001 gap unexpectedly authorized new engine creation');
  }
  if (factReceipt.finops?.additional_cost_eur !== 0) throw new Error('FACT-001 gap introduced additional cost');

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_MISSION_FACT001_GAP_CONSUMPTION_RECEIPT',
    handoff_id: handoff.handoff_id,
    company_id: payload.company_id,
    engine_id: 'FACT-001',
    environment: PREPROD,
    version: 'mission-fact001-gap-adapter-v0',
    requested_capability: handoff.requested_capability,
    route: FACT_SKILL_NATIVE_ROUTE,
    physically_consumed: true,
    factory_receipt_status: factReceipt.status,
    factory_decision: factReceipt.decision?.decision ?? null,
    failed_gates: factReceipt.failed_gates,
    registration_id: factReceipt.registration?.registration_id ?? null,
    idempotency_key: factReceipt.observability?.idempotency_key ?? null,
    event_count: factReceipt.events?.length ?? 0,
    create_new_engine_authorized: factReceipt.impact_analysis?.create_new_engine_authorized === true,
    preprod_registration_authorized: factReceipt.promotion?.preprod_registration_authorized === true,
    next_gate: factReceipt.native_full ? 'FACT001_PREPROD_REGISTRATION_REVIEW' : 'FACT001_COMPLETE_FAILED_GATES_AND_RETEST',
    additional_cost_eur: factReceipt.finops?.additional_cost_eur ?? 0,
    human_required: factReceipt.decision?.human_required ?? null,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    fact_receipt: factReceipt
  });
}
