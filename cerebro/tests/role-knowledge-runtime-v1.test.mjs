import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_KNOWLEDGE_RUNTIME_V1_CONTRACT,
  listRoleProfiles,
  getRoleProfile,
  getRoleKnowledgePack,
  buildRoleKnowledgeContext,
  validateRoleKnowledgeRegistries
} from '../roles/role-knowledge-runtime-v1.mjs';

test('registry is internally consistent and contains the 11 verified nodes', () => {
  const result = validateRoleKnowledgeRegistries();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.role_count, 11);
  assert.equal(result.knowledge_pack_count, 11);
  assert.equal(result.environment, 'PREPROD');
  assert.equal(result.authority_delta, false);
  assert.equal(result.cost_eur, 0);
});

test('verified engineering specialists and sales executive are represented without invented reporting edges', () => {
  const roles = listRoleProfiles();
  assert.equal(roles.filter((role) => role.class === 'SPECIALIST_ROLE').length, 10);
  assert.equal(roles.filter((role) => role.class === 'AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY').length, 1);
  for (const role of roles) {
    assert.equal(role.reports_to, null);
    assert.equal(role.reports_to_state, 'UNRESOLVED');
    assert.equal(role.environment, 'PREPROD');
  }
});

test('architect receives specialized additive knowledge with no authority delta', () => {
  const context = buildRoleKnowledgeContext({
    role_id: 'ENG-ARCHITECT',
    company_id: 'fenix',
    environment: 'PREPROD'
  });
  assert.equal(context.role.role_id, 'ENG-ARCHITECT');
  assert.equal(context.knowledge.knowledge_pack_id, 'KP-ENG-ARCHITECT-V1');
  assert.ok(context.knowledge.expertise.includes('dependency mapping'));
  assert.equal(context.learning.authority_delta, false);
  assert.equal(context.promotion.prod_allowed, false);
  assert.equal(context.external_side_effect_executed, false);
  assert.equal(context.cost_eur, 0);
});

test('tech scout explicitly prioritizes zero-cost and consumer adoption evidence', () => {
  const pack = getRoleKnowledgePack('ENG-TECH-SCOUT');
  assert.ok(pack.operating_rules.includes('zero-cost first'));
  assert.ok(pack.operating_rules.includes('prove at least one real internal consumer'));
  assert.ok(pack.evaluation.includes('license compatible'));
  assert.ok(pack.evaluation.includes('consumer evidence exists'));
});

test('sales executive stays PLAN_ONLY and scoped to fenix', () => {
  const role = getRoleProfile('AGT-SALES-EXECUTIVE');
  assert.equal(role.state, 'PLAN_ONLY');
  assert.equal(role.company_scope, 'fenix');
  const pack = getRoleKnowledgePack('AGT-SALES-EXECUTIVE');
  assert.ok(pack.operating_rules.includes('PLAN_ONLY until explicit authorization'));
  assert.ok(pack.operating_rules.includes('no outreach by default'));
  assert.ok(pack.operating_rules.includes('no CRM write by default'));
  assert.throws(
    () => buildRoleKnowledgeContext({ role_id: 'AGT-SALES-EXECUTIVE', company_id: 'otherco', environment: 'PREPROD' }),
    /not available for company_id/
  );
});

test('PROD is rejected fail-closed', () => {
  assert.throws(
    () => buildRoleKnowledgeContext({ role_id: 'ENG-CODE', company_id: 'fenix', environment: 'PROD' }),
    /exact PREPROD only/
  );
});

test('authority escalation is rejected fail-closed', () => {
  for (const key of ROLE_KNOWLEDGE_RUNTIME_V1_CONTRACT.forbidden_authority) {
    assert.throws(
      () => buildRoleKnowledgeContext({
        role_id: 'ENG-SECURITY',
        company_id: 'fenix',
        environment: 'PREPROD',
        requested_authority: { [key]: true }
      }),
      /authority escalation forbidden/
    );
  }
});

test('aliases, synthetic personas and unverified directors do not resolve as canonical roles', () => {
  assert.throws(() => getRoleProfile('Creador de Skills'), /unknown role_id/);
  assert.throws(() => getRoleProfile('SH-001'), /unknown role_id/);
  assert.throws(() => getRoleProfile('DIRECTOR-ENGINEERING'), /unknown role_id/);
});
