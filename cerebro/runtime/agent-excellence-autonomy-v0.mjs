/**
 * CEREBRO OS · Agent excellence + self-initiated work policy V0.
 * Deterministic, side-effect-free candidate only. No credential grant,
 * deployment, owner-auth bypass, remote computer control or PROD authority.
 */
export const AGENT_EXCELLENCE_V0 = Object.freeze({
  policy_id: 'CEREBRO_AGENT_EXCELLENCE_AUTONOMY_V0',
  version: '0.1.0',
  environment: 'PREPROD',
  principal: 'OWNER_ONLY',
  supervisor_role: 'CEREBRO_SUPERVISOR',
  min_verified_samples: 30,
  excellence_reliability: 0.97,
  excellence_quality: 0.95,
  retraining_reliability_below: 0.9,
  replacement_review_reliability_below: 0.75,
  confidence_min: 0.85,
  max_additional_cost_eur: 0,
  allowed_low_risk_capabilities: Object.freeze([
    'READ_ONLY_AUDIT', 'DRAFT_INTERNAL_CONTENT',
    'RUN_APPROVED_PREPROD_TESTS', 'ANALYZE_SANITIZED_METRICS',
    'LEARN_SANDBOX', 'PROPOSE_OPTIMIZATION'
  ]),
  human_required_reasons: Object.freeze([
    'LEGAL_REQUIRED', 'SIGNATURE_REQUIRED', 'LOW_CONFIDENCE',
    'HIGH_RISK', 'POLICY_CONFLICT', 'SECURITY_INCIDENT',
    'MONEY_LIMIT', 'CUSTOMER_HUMAN_REQUEST'
  ])
});

const CAPABILITIES = new Set(AGENT_EXCELLENCE_V0.allowed_low_risk_capabilities);
const REASONS = new Set(AGENT_EXCELLENCE_V0.human_required_reasons);
const REQUIRED = ['company_id','engine_id','environment','version'];
const str = value => typeof value === 'string' && value.length > 0 && value.trim() === value && !value.includes('\0');
const num = value => typeof value === 'number' && Number.isFinite(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const unique = values => Array.isArray(values) && values.length > 0 && values.every(str) && (new Set(values)).size === values.length;
const wrap = (decision, code, extras = {}) => Object.freeze({
  schema_version:'0.1.0', decision, code, executor_authorized:false,
  prod_authorized:false, trading_access:false, self_grant_authorized:false,
  policy_id:AGENT_EXCELLENCE_V0.policy_id, ...extras
});
const hold = code => wrap('HOLD',code);
const human = (reason,code) => {
  if (!REASONS.has(reason)) throw new TypeError('invalid HUMAN_REQUIRED reason');
  return wrap('HUMAN_REQUIRED',code,{human_required:reason});
};

/** Requires a separately validated, owner-issued capability grant. */
export function evaluateSelfInitiatedWorkV0(input = {}) {
  if (!plain(input)) return hold('invalid_input');
  const {agent,supervisor,context,task,grant,now} = input;
  if (![agent,supervisor,context,task,grant].every(plain)) return hold('invalid_input');
  if (!REQUIRED.every(k=>str(context[k]))) return hold('context_missing');
  if (context.environment !== 'PREPROD' || /TRAD/i.test(context.engine_id)) return hold('environment_or_trading_denied');
  if (!str(agent.agent_id) || !str(agent.supervisor_id) || !str(supervisor.supervisor_id) ||
      agent.agent_id === supervisor.supervisor_id || agent.supervisor_id !== supervisor.supervisor_id ||
      supervisor.role !== AGENT_EXCELLENCE_V0.supervisor_role || supervisor.active !== true || supervisor.attested_by_runtime !== true)
    return hold('supervisor_not_attested');
  if (agent.company_id !== context.company_id || agent.engine_id !== context.engine_id ||
      agent.environment !== context.environment || agent.version !== context.version ||
      supervisor.company_id !== context.company_id) return hold('tenant_scope_denied');
  if (agent.enabled !== true || agent.revoked === true) return hold('agent_not_active');
  if (supervisor.kill_switch_active === true || grant.kill_switch_active === true) return hold('kill_switch_active');
  if (task.origin !== 'AGENT_SELF_INITIATED' || !str(task.task_id) || !str(task.reason)) return hold('not_grounded_self_initiative');
  if (!unique(task.evidence_refs)) return hold('evidence_missing');
  if (task.customer_human_request === true) return human('CUSTOMER_HUMAN_REQUEST','human_requested');
  if (task.legal_required === true) return human('LEGAL_REQUIRED','legal_gate');
  if (task.signature_required === true) return human('SIGNATURE_REQUIRED','signature_gate');
  if (task.security_incident === true) return human('SECURITY_INCIDENT','security_gate');
  if (task.policy_conflict === true) return human('POLICY_CONFLICT','policy_conflict');
  if (task.risk === 'HIGH' || task.risk === 'CRITICAL') return human('HIGH_RISK','risk_gate');
  if (task.risk !== 'LOW') return hold('risk_not_preapproved');
  if (!num(task.confidence) || task.confidence < AGENT_EXCELLENCE_V0.confidence_min || task.confidence > 1)
    return human('LOW_CONFIDENCE','confidence_gate');
  if (!num(task.estimated_additional_cost_eur) || task.estimated_additional_cost_eur < 0)
    return hold('cost_invalid');
  if (task.estimated_additional_cost_eur > 0) return human('MONEY_LIMIT','new_cost_denied');
  if (!str(task.capability) || !CAPABILITIES.has(task.capability)) return hold('unregistered_or_sensitive_capability');
  if (task.external_write === true || task.pc_remote_control === true || task.system_mutation === true || task.secret_access === true)
    return hold('physical_or_external_effect_outside_scoped_policy');
  if (grant.issuer !== 'OWNER_APPROVED_POLICY' || grant.owner_principal !== AGENT_EXCELLENCE_V0.principal ||
      grant.owner_approved !== true || grant.verified_by_gateway !== true || grant.revoked === true || !str(grant.policy_ref)) return hold('owner_policy_grant_missing');
  if (grant.agent_id !== agent.agent_id || grant.supervisor_id !== supervisor.supervisor_id ||
      grant.company_id !== context.company_id || grant.engine_id !== context.engine_id ||
      grant.environment !== context.environment || grant.version !== context.version) return hold('grant_scope_mismatch');
  if (!unique(grant.allowed_capabilities) || !grant.allowed_capabilities.includes(task.capability)) return hold('grant_capability_denied');
  if (grant.max_additional_cost_eur !== 0) return hold('grant_budget_invalid');
  const timeMs = Date.parse(now ?? new Date().toISOString());
  const validUntil = Date.parse(grant.expires_at);
  if (!Number.isFinite(timeMs) || !Number.isFinite(validUntil) || validUntil <= timeMs)
    return hold('grant_expired_or_invalid');
  if (!str(task.idempotency_key) || !str(task.rollback_ref) || !str(task.verification_plan_ref))
    return hold('idempotency_or_readback_missing');
  return wrap('ROUTE_TO_EXISTING_GOVERNED_EXECUTOR','low_risk_self_initiated_task_eligible',{
    agent_id:agent.agent_id,supervisor_id:supervisor.supervisor_id,
    task_id:task.task_id, company_id:context.company_id, engine_id:context.engine_id,
    environment:context.environment,version:context.version,capability:task.capability,
    owner_policy_ref:grant.policy_ref,
    route:'governed-execution-handoff-router-v1',
    note:'Policy route only. Executor must independently enforce original authorization, idempotency, rollback and semantic readback.'
  });
}

/** Evidence-based performance; cannot change effective privileges. */
export function evaluateAgentExcellenceV0(input = {}) {
  if (!plain(input)) return hold('invalid_merit_record');
  const {agent,supervisor,review,evidence} = input;
  if (![agent,supervisor,review,evidence].every(plain)) return hold('invalid_merit_record');
  if (!str(agent.agent_id) || !str(supervisor.supervisor_id) || !str(review.judge_id) ||
      agent.agent_id === supervisor.supervisor_id || agent.agent_id === review.judge_id ||
      supervisor.supervisor_id === review.judge_id ||
      agent.supervisor_id !== supervisor.supervisor_id ||
      supervisor.role !== AGENT_EXCELLENCE_V0.supervisor_role || supervisor.active !== true || supervisor.attested_by_runtime !== true)
    return hold('independent_supervision_and_judge_required');
  if (agent.environment !== 'PREPROD' || !str(agent.company_id) ||
      agent.company_id !== supervisor.company_id || agent.company_id !== review.company_id ||
      !str(agent.engine_id) || !str(agent.version) || agent.enabled !== true || agent.revoked === true || supervisor.kill_switch_active === true ||
      review.approved_evidence !== true || review.evidence_attested_by_runtime !== true || !str(review.evidence_bundle_hash))
    return hold('merit_scope_or_evidence_not_validated');
  const {verified_samples,verified_successes,quality_score,security_incidents,policy_violations,real_world_regressions,failed_rollback} = evidence;
  if (![verified_samples,verified_successes,security_incidents,policy_violations,real_world_regressions,failed_rollback].every(Number.isSafeInteger) ||
      verified_samples < 0 || verified_successes < 0 || verified_successes > verified_samples ||
      security_incidents < 0 || policy_violations < 0 || real_world_regressions < 0 || failed_rollback < 0 ||
      !num(quality_score) || quality_score < 0 || quality_score > 1)
    return hold('merit_metrics_invalid');
  if (verified_samples < AGENT_EXCELLENCE_V0.min_verified_samples)
    return wrap('GATHER_MORE_EVIDENCE','insufficient_samples',{samples:verified_samples,required:AGENT_EXCELLENCE_V0.min_verified_samples});
  const reliability = Number((verified_successes/verified_samples).toFixed(4));
  const metrics = Object.freeze({reliability,quality_score,verified_samples,security_incidents,policy_violations,real_world_regressions,failed_rollback});
  const audited = {agent_id:agent.agent_id,supervisor_id:supervisor.supervisor_id,judge_id:review.judge_id,metrics,
    privilege_change_applied:false,old_vs_new_required:true,rollback_required:true,owner_policy_required:true};
  if (security_incidents > 0 || policy_violations > 0 || failed_rollback > 0)
    return wrap('SUSPEND_CAPABILITY_AND_REVIEW','safety_failure_requires_independent_review',audited);
  if (real_world_regressions > 0)
    return wrap('RETRAIN_AND_REEVALUATE','outcome_regression_detected',audited);
  if (reliability >= AGENT_EXCELLENCE_V0.excellence_reliability && quality_score >= AGENT_EXCELLENCE_V0.excellence_quality && review.independent_tribunal_pass === true)
    return wrap('RECOMMEND_REWARD_CANDIDATES','excellence_proven_candidate',{
      ...audited,
      reward_candidates:Object.freeze(['ROLE_SPECIFIC_TRAINING','ADDITIONAL_NON_SENSITIVE_FUNCTIONS','PREAPPROVED_FREE_API_CAPABILITY','BOUNDED_AUTONOMY_EXPANSION']),
      note:'All rewards require a separate owner-approved capability grant; never issue credentials or budgets here.'
    });
  if (reliability < AGENT_EXCELLENCE_V0.replacement_review_reliability_below)
    return wrap('RECOMMEND_REPLACEMENT_REVIEW','underperformance_independent_review',{
      ...audited, safe_replacement_stages:Object.freeze(['INVENTORY','BACKUP','PARALLEL_CANDIDATE','OLD_VS_NEW','PREPROD_TESTS','ROLLBACK_READY','GRADUAL_PROMOTION'])
    });
  if (reliability < AGENT_EXCELLENCE_V0.retraining_reliability || quality_score < 0.9)
    return wrap('RETRAIN_AND_REEVALUATE','improvement_plan_required',audited);
  return wrap('MAINTAIN_WITH_MONITORING','meets_baseline_no_reward_promotion',audited);
}