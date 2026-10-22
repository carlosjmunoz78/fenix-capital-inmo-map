import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSalesExecutiveKnowledgeContext,
  validateSalesExecutiveKnowledgeBinding
} from '../revenue/sales-executive-knowledge-context-v1.mjs';

test('sales executive knowledge binding preserves physical PLAN_ONLY gates', () => {
  const result = validateSalesExecutiveKnowledgeBinding();
  assert.equal(result.ok, true, result.error ?? 'binding invalid');
  assert.equal(result.profile_id, 'sales_executive');
  assert.equal(result.profile_status, 'planned');
  assert.equal(result.execution_mode, 'PLAN_ONLY');
  assert.equal(result.authority_delta, false);
  assert.equal(result.external_side_effects, false);
  assert.equal(result.cost_eur, 0);
});

test('sales executive gains specialized knowledge without gaining side-effect authority', () => {
  const context = buildSalesExecutiveKnowledgeContext({ company_id: 'fenix' });
  assert.equal(context.role_id, 'AGT-SALES-EXECUTIVE');
  assert.equal(context.role_context.knowledge.knowledge_pack_id, 'KP-AGT-SALES-EXECUTIVE-V1');
  assert.ok(context.role_context.knowledge.expertise.includes('lead qualification'));
  assert.ok(context.role_context.knowledge.operating_rules.includes('no outreach by default'));
  assert.ok(context.role_context.knowledge.operating_rules.includes('no CRM write by default'));
  assert.equal(context.preparation_contract.may_qualify, true);
  assert.equal(context.preparation_contract.may_prepare_next_action, true);
  assert.equal(context.preparation_contract.may_prepare_draft, true);
  assert.equal(context.preparation_contract.may_prepare_approval_packet, true);
  assert.equal(context.preparation_contract.may_send, false);
  assert.equal(context.preparation_contract.may_write_crm, false);
  assert.equal(context.preparation_contract.may_deliver, false);
  assert.equal(context.preparation_contract.may_write_prod, false);
  assert.equal(context.preparation_contract.external_side_effect_authorized, false);
  assert.equal(context.preparation_contract.human_blocker, 'HUMAN_REQUIRED');
  assert.equal(context.preparation_contract.human_checkpoint, 'customer_human_request');
});

test('sales executive remains fenix-scoped and PREPROD-only', () => {
  assert.throws(
    () => buildSalesExecutiveKnowledgeContext({ company_id: 'otherco' }),
    /not available for company_id/
  );
  assert.throws(
    () => buildSalesExecutiveKnowledgeContext({ company_id: 'fenix', environment: 'PROD' }),
    /exact PREPROD only/
  );
});

test('sales executive rejects authority escalation requests', () => {
  for (const key of ['prod_authority', 'prod_write', 'auto_merge', 'external_install', 'customer_data', 'trading']) {
    assert.throws(
      () => buildSalesExecutiveKnowledgeContext({
        company_id: 'fenix',
        requested_authority: { [key]: true }
      }),
      /authority escalation forbidden/
    );
  }
});
