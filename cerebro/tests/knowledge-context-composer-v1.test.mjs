import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT,
  composeKnowledgeContext,
  validateKnowledgeContextComposer
} from '../roles/knowledge-context-composer-v1.mjs';
import { listRoleProfiles } from '../roles/role-knowledge-runtime-v1.mjs';

const BASE = Object.freeze({
  company_id: 'fenix',
  domain_id: 'MORTGAGE',
  environment: 'PREPROD',
  version: 'v1'
});

test('composer contract is PREPROD-only, cost0 and no authority delta', () => {
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.environment, 'PREPROD');
  assert.deepEqual(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.composition_order, ['COMMON','DOMAIN','COMPANY','ROLE']);
  assert.deepEqual(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.effective_precedence, ['ROLE','COMPANY','DOMAIN','COMMON']);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.company_registry_durability, 'IN_MEMORY_REFERENCE_ONLY');
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.authority_delta, false);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.direct_knowledge_mutation, false);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.auto_apply, false);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.prod_authorized, false);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.prod_write_authorized, false);
  assert.equal(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.additional_cost_eur, 0);
});

test('all 11 verified roles compose against Fenix mortgage knowledge', () => {
  const roles = listRoleProfiles();
  assert.equal(roles.length, 11);
  for (const role of roles) {
    const result = composeKnowledgeContext({ ...BASE, role_id: role.role_id });
    assert.equal(result.status, 'COMPOSED_PREPROD_GREEN');
    assert.equal(result.context.company_id, 'fenix');
    assert.equal(result.context.domain_id, 'MORTGAGE');
    assert.equal(result.context.role_id, role.role_id);
    assert.deepEqual(result.composition_order, ['COMMON','DOMAIN','COMPANY','ROLE']);
    assert.deepEqual(result.effective_precedence, ['ROLE','COMPANY','DOMAIN','COMMON']);
    assert.equal(result.layers.role.knowledge.role_id, role.role_id);
    assert.equal(result.layers.company.knowledge_pack.knowledge_pack_id, 'KP-FENIX-MORTGAGE-OPS-V1');
    assert.equal(result.layers.domain.binding_state, 'PHYSICAL_RUNTIME_VERIFIED');
    assert.equal(result.layers.company.durability_state, 'IN_MEMORY_REFERENCE_ONLY');
    assert.equal(result.layers.company.durable_company_registry_verified, false);
    assert.equal(result.direct_knowledge_mutation, false);
    assert.equal(result.auto_apply, false);
    assert.equal(result.external_side_effect_executed, false);
    assert.equal(result.cost_eur, 0);
  }
});

test('mortgage domain binds all physically verified native capabilities', () => {
  const result = composeKnowledgeContext({ ...BASE, role_id: 'ENG-CODE' });
  assert.deepEqual(result.layers.domain.capabilities, [
    ['VIA-001', 'assessMortgageViability'],
    ['BNK-001', 'normalizeBankKnowledge'],
    ['BNK-002', 'rankBanks'],
    ['BNK-003', 'routeBank'],
    ['BNK-004', 'prepareBankPresentation'],
    ['BNK-005', 'planBankFollowup'],
    ['BNK-006', 'planNegotiation'],
    ['OFR-001', 'compareOffers']
  ]);
  assert.equal(result.layers.domain.knowledge_update_reference, 'KNW-001');
  assert.equal(result.layers.domain.knowledge_update_reference_state, 'REFERENCE_OBSERVED_IN_RUNTIME_NOT_PROMOTED_BY_COMPOSER');
});

test('Fenix mortgage pack contains source-backed process knowledge and volatile-bank safeguards', () => {
  const result = composeKnowledgeContext({ ...BASE, role_id: 'ENG-QA' });
  const pack = result.layers.company.knowledge_pack;
  assert.equal(pack.state, 'SOURCE_BACKED_PREPROD');
  assert.equal(pack.viability.initial_debt_ratio_reference_pct, 35);
  assert.equal(pack.viability.upper_review_reference_pct, 40);
  assert.equal(pack.bank_selection_observed.live_verification_required, true);
  assert.equal(pack.bank_selection_observed.not_bank_commitment, true);
  assert.equal(pack.self_employed.universal_bank_rule, false);
  assert.equal(pack.legal_fiscal.human_required_reason, 'LEGAL_REQUIRED');
  assert.equal(pack.legal_fiscal.automatic_instruction_forbidden, true);
  assert.match(pack.signature_and_close.payment_rule, /centimo/i);
  assert.equal(pack.case_learning.pipeline.length, 7);
});

test('company layer surfaces KBOOT registration and the real durability gap without inventing persistence', () => {
  const result = composeKnowledgeContext({ ...BASE, role_id: 'ENG-ARCHITECT' });
  assert.equal(result.layers.company.registry_engine.engine_id, 'COMP-REG-001');
  assert.equal(result.layers.company.tenant_engine.engine_id, 'TENANT-001');
  assert.equal(result.layers.company.knowledge_bootstrap_engine.engine_id, 'KBOOT-001');
  assert.equal(result.layers.company.knowledge_bootstrap_engine.mode, 'DETERMINISTIC_REFERENCE');
  assert.equal(result.layers.company.durability_state, 'IN_MEMORY_REFERENCE_ONLY');
  assert.equal(result.layers.company.cross_company_access, 'deny');
});

test('Sales remains company-scoped and gains knowledge without execution authority', () => {
  const result = composeKnowledgeContext({ ...BASE, role_id: 'AGT-SALES-EXECUTIVE' });
  assert.equal(result.layers.role.role.company_scope, 'fenix');
  assert.equal(result.layers.role.knowledge.role_id, 'AGT-SALES-EXECUTIVE');
  assert.equal(result.effective_authority.prod_write_authorized, false);
  assert.equal(result.effective_authority.external_side_effect_authorized, false);
  assert.equal(result.effective_authority.customer_data, false);
});

test('unknown company/domain and cross-company role use fail closed', () => {
  assert.throws(
    () => composeKnowledgeContext({ ...BASE, role_id: 'ENG-CODE', company_id: 'unknown-company' }),
    /knowledge pack missing/i
  );
  assert.throws(
    () => composeKnowledgeContext({ ...BASE, role_id: 'AGT-SALES-EXECUTIVE', company_id: 'other-company' }),
    /not available for company_id/i
  );
  assert.throws(
    () => composeKnowledgeContext({ ...BASE, role_id: 'ENG-CODE', domain_id: 'SEO' }),
    /unsupported or unverified domain_id/i
  );
});

test('PROD and requested authority escalation are rejected', () => {
  assert.throws(
    () => composeKnowledgeContext({ ...BASE, role_id: 'ENG-CODE', environment: 'PROD' }),
    /exact PREPROD only/i
  );
  for (const key of ['prod_authorized','prod_write_authorized','auto_apply','direct_knowledge_mutation','customer_data','trading_access','supabase_writes']) {
    assert.throws(
      () => composeKnowledgeContext({ ...BASE, role_id: 'ENG-CODE', requested_authority: { [key]: true } }),
      /authority escalation forbidden/i
    );
  }
});

test('live context is ephemeral and rejects raw PII/secrets', () => {
  const result = composeKnowledgeContext({
    ...BASE,
    role_id: 'ENG-DATA',
    live_context: { task_ref: 'case-fixture-001', requested_financing_pct: 90, flags: ['PREPROD_FIXTURE'] }
  });
  assert.equal(result.live_context.state, 'EPHEMERAL_NOT_CANONICAL_KNOWLEDGE');
  assert.equal(result.live_context.persisted, false);
  assert.equal(result.live_context.value.task_ref, 'case-fixture-001');
  for (const sample of [
    { email: 'x@example.test' },
    { nested: { dni: '00000000X' } },
    { access_token: 'secret' }
  ]) {
    assert.throws(
      () => composeKnowledgeContext({ ...BASE, role_id: 'ENG-DATA', live_context: sample }),
      /PII\/secret key forbidden/i
    );
  }
});

test('composer registry validation is green with explicit partial durability', () => {
  const validation = validateKnowledgeContextComposer();
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  assert.equal(validation.pack_count, 1);
  assert.deepEqual(validation.supported_domains, ['MORTGAGE']);
  assert.equal(validation.company_registry_durability, 'IN_MEMORY_REFERENCE_ONLY');
  assert.equal(validation.authority_delta, false);
  assert.equal(validation.direct_knowledge_mutation, false);
  assert.equal(validation.auto_apply, false);
  assert.equal(validation.external_side_effects, false);
  assert.equal(validation.cost_eur, 0);
});
