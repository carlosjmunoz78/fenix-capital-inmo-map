import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1,
  listEngineeringSpecialistBindings,
  buildEngineeringSpecialistContext,
  validateEngineeringSpecialistBindings
} from '../engineering/engineering-specialist-context-v1.mjs';

test('all 10 physically verified engineering specialists are bound to canonical roles', () => {
  const result = validateEngineeringSpecialistBindings();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.binding_count, 10);
  assert.equal(result.source_registry_status, 'ALL_ENGINEERING_SPECIALISTS_FULL_SAFE_PREPROD');
  assert.equal(result.environment, 'PREPROD');
  assert.equal(result.authority_delta, false);
  assert.equal(result.external_side_effects, false);
  assert.equal(result.cost_eur, 0);
});

test('legacy specialist names map one-to-one to governed role identities', () => {
  assert.deepEqual(ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1, {
    ARQUITECTO: 'ENG-ARCHITECT',
    CODE: 'ENG-CODE',
    SYSTEMS: 'ENG-SYSTEMS',
    MATH: 'ENG-MATH',
    DATA: 'ENG-DATA',
    SECURITY: 'ENG-SECURITY',
    QA: 'ENG-QA',
    INTEGRATOR: 'ENG-INTEGRATOR',
    TECH_SCOUT: 'ENG-TECH-SCOUT',
    PERFORMANCE: 'ENG-PERFORMANCE'
  });
  const bindings = listEngineeringSpecialistBindings();
  assert.equal(bindings.length, 10);
  assert.ok(bindings.every((item) => item.source_state === 'FULL_SAFE_PREPROD'));
  assert.ok(bindings.every((item) => item.role_state === 'FULL_SAFE_PREPROD'));
});

test('architect execution context receives architect knowledge and original evidence', () => {
  const context = buildEngineeringSpecialistContext({
    specialist: 'ARQUITECTO',
    company_id: 'fenix'
  });
  assert.equal(context.role_id, 'ENG-ARCHITECT');
  assert.equal(context.original_specialist_evidence.status, 'FULL_SAFE_PREPROD');
  assert.equal(context.knowledge_pack.knowledge_pack_id, 'KP-ENG-ARCHITECT-V1');
  assert.ok(context.knowledge_pack.operating_rules.includes('wrap before replace'));
  assert.equal(context.authority_delta, false);
  assert.equal(context.external_side_effect_executed, false);
  assert.equal(context.cost_eur, 0);
});

test('TECH_SCOUT execution context receives zero-cost and adoption knowledge', () => {
  const context = buildEngineeringSpecialistContext({
    specialist: 'TECH_SCOUT',
    company_id: 'fenix'
  });
  assert.equal(context.role_id, 'ENG-TECH-SCOUT');
  assert.ok(context.knowledge_pack.operating_rules.includes('zero-cost first'));
  assert.ok(context.knowledge_pack.operating_rules.includes('prove at least one real internal consumer'));
  assert.ok(context.knowledge_pack.evaluation.includes('license compatible'));
});

test('SECURITY execution context carries least privilege and secret rules', () => {
  const context = buildEngineeringSpecialistContext({
    specialist: 'SECURITY',
    company_id: 'fenix'
  });
  assert.equal(context.role_id, 'ENG-SECURITY');
  assert.ok(context.knowledge_pack.operating_rules.includes('never expose secrets'));
  assert.ok(context.knowledge_pack.operating_rules.includes('least privilege'));
});

test('unknown aliases, directors and synthetic identities fail closed', () => {
  for (const specialist of ['Creador de Skills', 'DIRECTOR_ENGINEERING', 'SH-001']) {
    assert.throws(
      () => buildEngineeringSpecialistContext({ specialist, company_id: 'fenix' }),
      /unknown engineering specialist/
    );
  }
});

test('PROD and authority escalation are inherited as fail-closed guards', () => {
  assert.throws(
    () => buildEngineeringSpecialistContext({ specialist: 'CODE', company_id: 'fenix', environment: 'PROD' }),
    /exact PREPROD only/
  );
  assert.throws(
    () => buildEngineeringSpecialistContext({
      specialist: 'CODE',
      company_id: 'fenix',
      requested_authority: { prod_write: true }
    }),
    /authority escalation forbidden/
  );
});
