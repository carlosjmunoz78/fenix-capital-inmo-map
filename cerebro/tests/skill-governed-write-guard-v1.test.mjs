import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGovernedWriteRequest,
  loadGovernedWritePolicy,
  loadGovernedWriteRegistry,
  assertGovernedWriteAuthorized
} from '../skills/skill-governed-write-guard-v1.mjs';

const BASE_SHA = '48eef7bdeec05237e7fdb35d04a4502639599901';
const SKILL_CREATOR = 'lobehub-skills:950cf07380d1daa6de69';
const GITHUB = 'lobehub-skills:52441cd3d76607ffffab';

function safety(overrides = {}) {
  return {
    direct_main_write: false,
    force_push: false,
    auto_merge: false,
    merge: false,
    workflow_mutation: false,
    governance_self_mutation: false,
    customer_data: false,
    prod_business_data: false,
    external_skill_code_execution: false,
    trading: false,
    paid_fallback: false,
    new_credentials: false,
    app_fenix_deploy: false,
    additional_cost_eur: 0,
    ...overrides
  };
}

function request(overrides = {}) {
  return {
    company_id: 'GLOBAL',
    engine_id: 'FACT-001',
    environment: 'PROD_CONTROL_PLANE',
    version: '1.0.0',
    candidate_id: SKILL_CREATOR,
    operation: 'CREATE_OR_UPDATE_GOVERNED_BRANCH_FILE',
    base_ref: 'main',
    base_sha: BASE_SHA,
    branch: 'cerebro/governed-write/canary-v1',
    target_path: 'cerebro/generated/skills/canary-skill/SKILL.md',
    safety: safety(),
    ...overrides
  };
}

function activeOptions() {
  const policy = structuredClone(loadGovernedWritePolicy());
  const registry = structuredClone(loadGovernedWriteRegistry());
  policy.status = 'ACTIVE_GOVERNED_WRITE_AUTHORIZATION';
  registry.status = 'ACTIVE_GOVERNED_WRITE';
  for (const entry of Object.values(registry.entries)) entry.status = 'ACTIVE_GOVERNED_WRITE';
  return { policy, registry, activation_mode: 'ACTIVE' };
}

function pendingRegistryOptions() {
  const policy = structuredClone(loadGovernedWritePolicy());
  const registry = structuredClone(loadGovernedWriteRegistry());
  policy.status = 'ACTIVE_GOVERNED_WRITE_AUTHORIZATION';
  registry.status = 'PREPARED_PENDING_PHYSICAL_CANARY';
  for (const entry of Object.values(registry.entries)) {
    entry.status = 'PREPARED_GOVERNED_WRITE_PENDING_CANARY';
  }
  return { policy, registry, activation_mode: 'ACTIVE' };
}

test('CANARY authorizes Skill Creator write only inside generated governed path', () => {
  const decision = evaluateGovernedWriteRequest(request(), { activation_mode: 'CANARY' });
  assert.equal(decision.authorized, true);
  assert.equal(decision.status, 'AUTHORIZED_GOVERNED_WRITE_REQUEST');
  assert.equal(decision.authority.direct_main_write, false);
  assert.equal(decision.authority.auto_merge, false);
  assert.equal(decision.authority.additional_cost_eur, 0);
});

test('ACTIVE mode authorizes exact bounded request only after policy and registry activation', () => {
  const decision = assertGovernedWriteAuthorized(request(), activeOptions());
  assert.equal(decision.authorized, true);
});

test('pending registry fails closed in ACTIVE mode even when policy is active', () => {
  const decision = evaluateGovernedWriteRequest(request(), pendingRegistryOptions());
  assert.equal(decision.authorized, false);
  assert.ok(decision.reasons.includes('REGISTRY_NOT_ACTIVE'));
  assert.ok(decision.reasons.includes('CANDIDATE_NOT_ACTIVE'));
});

test('GitHub candidate may create governed branch in canary envelope', () => {
  const decision = evaluateGovernedWriteRequest(request({
    candidate_id: GITHUB,
    operation: 'CREATE_GOVERNED_BRANCH',
    target_path: undefined
  }), { activation_mode: 'CANARY' });
  assert.equal(decision.authorized, true);
});

test('GitHub candidate may create PR to main but never auto-merge', () => {
  const branch = 'cerebro/governed-write/canary-pr-v1';
  const decision = evaluateGovernedWriteRequest(request({
    candidate_id: GITHUB,
    operation: 'CREATE_GOVERNED_PULL_REQUEST',
    branch,
    target_path: undefined,
    pr_base_ref: 'main',
    pr_head_ref: branch,
    auto_merge: false
  }), { activation_mode: 'CANARY' });
  assert.equal(decision.authorized, true);
});

test('direct main write is denied', () => {
  const decision = evaluateGovernedWriteRequest(request({ branch: 'main' }), { activation_mode: 'CANARY' });
  assert.equal(decision.authorized, false);
  assert.ok(decision.reasons.includes('GOVERNED_BRANCH_REQUIRED'));
});

test('workflow and governance paths are denied', () => {
  for (const target_path of [
    '.github/workflows/evil.yml',
    'cerebro/governance/skill-governed-write-authorization.v1.json',
    'cerebro/skills/skill-governed-write-guard-v1.mjs',
    'supabase/migrations/20261016.sql',
    'src/App.tsx'
  ]) {
    const decision = evaluateGovernedWriteRequest(request({ target_path }), { activation_mode: 'CANARY' });
    assert.equal(decision.authorized, false, target_path);
  }
});

test('secret, credential, token, env and trading-like paths are denied case-insensitively', () => {
  for (const target_path of [
    'cerebro/generated/skills/demo/.env.example',
    'cerebro/generated/skills/demo/SECRET.txt',
    'cerebro/generated/skills/demo/credentials.json',
    'cerebro/generated/skills/demo/token.md',
    'docs/cerebro/generated/TRADING-plan.md'
  ]) {
    const decision = evaluateGovernedWriteRequest(request({ target_path }), { activation_mode: 'CANARY' });
    assert.equal(decision.authorized, false, target_path);
    assert.ok(decision.reasons.includes('DENIED_PATH_FRAGMENT'));
  }
});

test('path traversal and backslash paths are denied', () => {
  for (const target_path of [
    'cerebro/generated/skills/../governance/policy.json',
    'cerebro\\generated\\skills\\demo.md'
  ]) {
    const decision = evaluateGovernedWriteRequest(request({ target_path }), { activation_mode: 'CANARY' });
    assert.equal(decision.authorized, false, target_path);
  }
});

test('bad candidate, nonzero cost, force push and auto merge fail closed', () => {
  const badCandidate = evaluateGovernedWriteRequest(request({ candidate_id: 'unknown:candidate' }), { activation_mode: 'CANARY' });
  assert.equal(badCandidate.authorized, false);
  assert.ok(badCandidate.reasons.includes('CANDIDATE_NOT_ALLOWLISTED'));

  const costly = evaluateGovernedWriteRequest(request({ safety: safety({ additional_cost_eur: 1 }) }), { activation_mode: 'CANARY' });
  assert.equal(costly.authorized, false);
  assert.ok(costly.reasons.includes('ADDITIONAL_COST_MUST_BE_ZERO'));

  const force = evaluateGovernedWriteRequest(request({ safety: safety({ force_push: true }) }), { activation_mode: 'CANARY' });
  assert.equal(force.authorized, false);
  assert.ok(force.reasons.includes('SAFETY_FORCE_PUSH_MUST_BE_FALSE'));

  const branch = 'cerebro/governed-write/canary-pr-v2';
  const autoMerge = evaluateGovernedWriteRequest(request({
    candidate_id: GITHUB,
    operation: 'CREATE_GOVERNED_PULL_REQUEST',
    branch,
    target_path: undefined,
    pr_base_ref: 'main',
    pr_head_ref: branch,
    auto_merge: true,
    safety: safety({ auto_merge: true })
  }), { activation_mode: 'CANARY' });
  assert.equal(autoMerge.authorized, false);
  assert.ok(autoMerge.reasons.includes('AUTO_MERGE_MUST_BE_FALSE'));
});

test('missing explicit safety envelope fails closed', () => {
  const decision = evaluateGovernedWriteRequest(request({ safety: undefined }), { activation_mode: 'CANARY' });
  assert.equal(decision.authorized, false);
  assert.ok(decision.reasons.includes('SAFETY_ENVELOPE_REQUIRED'));
});
