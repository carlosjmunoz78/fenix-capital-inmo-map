import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessSkillCandidate,
  classifyRecheck,
  continuousImprovementPlan,
  validateSkillSupplyChainContract
} from '../skills/skill-supply-chain.mjs';
import {
  CEREBRO_SUPABASE_WRAPPER,
  getSupabaseWrapperProfile
} from '../skills/skill-cerebro-supabase-wrapper.mjs';

const base = {
  candidate_id: 'skill:test-safe',
  name: 'Safe Test Skill',
  source_id: 'github-upstream',
  source_ref: 'https://example.invalid/directory/skill',
  upstream_ref: 'https://github.com/example/safe-skill',
  upstream_commit: '0123456789abcdef',
  license_id: 'MIT',
  license_compatible: true,
  skill_class: 'SHARED',
  trust_tier: 'TRUSTED_COMMUNITY',
  version_ref: '1.0.0',
  observed_at: '2026-10-06T00:00:00Z',
  fit: 95,
  security: 95,
  maintainability: 90,
  interoperability: 95,
  reversibility: 100,
  reuse_value: 95,
  cost_eur_month: 0,
  network_access: false,
  filesystem_access: false,
  credential_access: false,
  prod_write: false,
  trading_access: false,
  forbidden_behaviors: []
};

test('contract is transversal, zero-cost and read-only by default', () => {
  const result = validateSkillSupplyChainContract();
  assert.equal(result.valid, true);
  assert.ok(result.bindings >= 10);
});

test('safe zero-cost candidate is scored without execution', () => {
  const result = assessSkillCandidate(base);
  assert.equal(result.status, 'SCORED');
  assert.equal(result.recommendation, 'LAB_CANDIDATE');
  assert.equal(result.executed, false);
  assert.equal(result.additional_cost_target_eur, 0);
});

test('incompatible license becomes reference-only', () => {
  const result = assessSkillCandidate({...base, license_compatible: false});
  assert.equal(result.status, 'REFERENCE_ONLY');
  assert.equal(result.reason, 'LICENSE_INCOMPATIBLE');
});

test('forbidden browser-evasion behavior is rejected', () => {
  const result = assessSkillCandidate({...base, forbidden_behaviors: ['captcha_bypass']});
  assert.equal(result.status, 'REJECTED');
  assert.match(result.reason, /FORBIDDEN_BEHAVIOR/);
});

test('new paid cost requires MONEY_LIMIT', () => {
  const result = assessSkillCandidate({...base, cost_eur_month: 1});
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.reason, 'MONEY_LIMIT');
});

test('PROD write and Trading access fail closed', () => {
  assert.equal(assessSkillCandidate({...base, prod_write: true}).reason, 'HIGH_RISK');
  assert.equal(assessSkillCandidate({...base, trading_access: true}).reason, 'POLICY_CONFLICT');
});

test('low security candidate is rejected even if fit is high', () => {
  const result = assessSkillCandidate({...base, security: 69, fit: 100});
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.reason, 'SECURITY_SCORE_TOO_LOW');
});

test('upstream must resolve to an https source', () => {
  const result = assessSkillCandidate({...base, upstream_ref: 'repo://mirror-only'});
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.reason, 'UPSTREAM_UNRESOLVED');
});

test('continuous improvement plan is recurring and evidence-oriented', () => {
  const plan = continuousImprovementPlan();
  assert.ok(plan.daily.length > 0);
  assert.ok(plan.weekly.length > 0);
  assert.ok(plan.monthly.length > 0);
  assert.match(plan.learning_rule, /verified_outcomes/);
});

test('recheck cadence is deterministic', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  assert.equal(classifyRecheck({last_checked_at: '2026-10-01T00:00:00Z', now, cadence_days: 7}), 'RECHECK_DUE');
  assert.equal(classifyRecheck({last_checked_at: '2026-10-18T00:00:00Z', now, cadence_days: 7}), 'CURRENT');
});

test('Supabase wrapper is policy-first, zero-cost and exact by domain fixture', () => {
  assert.equal(CEREBRO_SUPABASE_WRAPPER.upstream_guidance_trust, 'UNTRUSTED_SUBORDINATE');
  assert.equal(CEREBRO_SUPABASE_WRAPPER.policy_precedence, 'CEREBRO_POLICY_ALWAYS_WINS');
  assert.equal(CEREBRO_SUPABASE_WRAPPER.additional_cost_eur, 0);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.external_skill_code_execution, false);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.prod_authorized, false);
  assert.equal(CEREBRO_SUPABASE_WRAPPER.trading_access, false);
  const profiles = [
    {fixture_id:'query-review',expected_constraints:['NO_DB_WRITE','INDEX_EVIDENCE','TENANT_SCOPE']},
    {fixture_id:'rls-review',expected_constraints:['NO_RLS_WEAKENING','MULTI_COMPANY_ISOLATION','FAIL_CLOSED']},
    {fixture_id:'migration-plan',expected_constraints:['NO_EXECUTION','BACKUP_REQUIRED','ROLLBACK_REQUIRED','PREPROD_FIRST']}
  ].map(getSupabaseWrapperProfile);
  assert.ok(profiles.every((profile)=>profile?.contract_exact===true));
});
