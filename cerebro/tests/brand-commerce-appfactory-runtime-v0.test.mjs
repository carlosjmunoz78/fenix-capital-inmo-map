import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASE15_BLOCKS,
  CAPABILITY_CATALOG,
  PHASE15_RUNTIME,
  buildBrandTokens,
  buildCommerceAgentPlan,
  buildAppFactoryPlan,
  catalogSpecializedCapability,
  phase15AutoPlan
} from '../digital-build/brand-commerce-appfactory-runtime-v0.mjs';

const company = 'fenix';
const context = Object.freeze({
  company_id: company,
  engine_id: 'FACT-001',
  capability_id: 'BRAND-COMMERCE-APPFACTORY',
  environment: 'PREPROD',
  version: 'v0'
});
const base = (extra = {}) => ({ context, confidence: 0.99, ...extra });
const brand = (extra = {}) => base({
  brand_contract_ref: 'brand:fenix:v1',
  source_engine_id: 'BRANDBOOT-001',
  palette: { primary: '#112233', secondary: '#AABBCC', background: '#FFFFFF', foreground: '#111111' },
  typography: { heading: 'Montserrat', body: 'Inter' },
  base_spacing_px: 8,
  radius_px: 10,
  ...extra
});
const shopping = (extra = {}) => base({ mode: 'SHOPPING_AGENT', catalog_ref: 'catalog:fenix:v1', commerce_policy_ref: 'policy:commerce:v1', ...extra });
const merchant = (extra = {}) => base({ mode: 'MERCHANT_AGENT', catalog_ref: 'catalog:fenix:v1', commerce_policy_ref: 'policy:commerce:v1', ...extra });
const app = (extra = {}) => base({ surface: 'PWA', app_slug: 'fenix-client', brand_tokens_ref: 'brandtokens:fenix:v1', requirements_ref: 'req:fenix:pwa:v1', ...extra });
const blink = (extra = {}) => base({ capability: 'BLINK', ...extra });
const cad = (extra = {}) => base({ capability: 'TEXT_TO_CAD', ...extra });

test('phase15 block contract is exact 176-184 and no new owner engine is invented', () => {
  assert.deepEqual(Object.values(PHASE15_BLOCKS), [176,177,178,179,180,181,182,183,184]);
  assert.equal(PHASE15_RUNTIME.owner_engine, 'FACT-001');
  assert.equal(PHASE15_RUNTIME.context_version, 'v0');
  assert.equal(PHASE15_RUNTIME.prod_enabled, false);
  assert.equal(PHASE15_RUNTIME.external_execution_enabled, false);
  assert.equal(CAPABILITY_CATALOG.BRANDBOOT_001.decision, 'REUSE_EXISTING_LAB_CANDIDATE');
});

test('brand token generation is deterministic, local and zero-cost', () => {
  const a = buildBrandTokens(brand());
  const b = buildBrandTokens(brand());
  assert.equal(a.allowed, true);
  assert.equal(a.status, 'PLANNED');
  assert.equal(a.block, 177);
  assert.equal(a.tokens.color.primary, '#112233');
  assert.equal(a.tokens_hash, b.tokens_hash);
  assert.deepEqual(a.outputs, ['design-tokens.json','brand.css']);
  assert.equal(a.external_side_effect_executed, false);
  assert.equal(a.additional_cost_cents, 0);
});

test('brand tokens consume BRANDBOOT candidate instead of inventing another brand engine', () => {
  const out = buildBrandTokens(brand({ source_engine_id: 'MKT-001' }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'POLICY_CONFLICT');
});

test('cross-company access fails closed', () => {
  const out = buildBrandTokens(brand({ target_company_id: 'other-company' }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'SECURITY_INCIDENT');
});

test('low confidence fails closed with canonical HUMAN_REQUIRED reason', () => {
  const out = buildBrandTokens(brand({ confidence: 0.3 }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'LOW_CONFIDENCE');
});

test('raw PII and secret-shaped fields are rejected', () => {
  assert.throws(() => buildBrandTokens(brand({ email: 'hidden@example.test' })), /PII\/secret\/payment field forbidden/);
  assert.throws(() => buildCommerceAgentPlan(shopping({ api_key: 'secret' })), /PII\/secret\/payment field forbidden/);
});

test('PROD, deploy and public publishing remain disabled', () => {
  for (const key of ['prod_write_requested','deploy_requested','publish_requested']) {
    const out = buildAppFactoryPlan(app({ [key]: true }));
    assert.equal(out.allowed, false);
    assert.equal(out.human_required_reason, 'POLICY_CONFLICT');
  }
});

test('new spend and subscriptions are blocked by MONEY_LIMIT', () => {
  for (const extra of [{ spend_cents: 1 }, { purchase_requested: true }, { subscription_requested: true }]) {
    const out = buildCommerceAgentPlan(shopping(extra));
    assert.equal(out.allowed, false);
    assert.equal(out.human_required_reason, 'MONEY_LIMIT');
  }
  assert.throws(() => buildCommerceAgentPlan(shopping({ spend_cents: 'not-a-number' })), /spend_cents invalid/);
});

test('external providers and installs are not silently activated', () => {
  for (const extra of [{ network_call_requested: true }, { install_requested: true }, { external_provider_requested: true }]) {
    const out = catalogSpecializedCapability(blink(extra));
    assert.equal(out.allowed, false);
    assert.equal(out.human_required_reason, 'POLICY_CONFLICT');
  }
});

test('signature remains a human boundary', () => {
  const out = buildCommerceAgentPlan(merchant({ signature_requested: true }));
  assert.equal(out.allowed, false);
  assert.equal(out.human_required_reason, 'SIGNATURE_REQUIRED');
});

test('shopping agent composes existing SALE and COM engines with no provider binding', () => {
  const out = buildCommerceAgentPlan(shopping());
  assert.equal(out.allowed, true);
  assert.equal(out.block, 179);
  assert.deepEqual(out.composed_engines, ['SALE-001','COM-001']);
  assert.equal(out.provider_binding, false);
  assert.equal(out.order_mutation_authorized, false);
});

test('merchant agent composes existing SALE PAY INV COM engines and cannot charge', () => {
  const out = buildCommerceAgentPlan(merchant());
  assert.equal(out.allowed, true);
  assert.equal(out.block, 180);
  assert.deepEqual(out.composed_engines, ['SALE-001','PAY-001','INV-001','COM-001']);
  assert.equal(out.charge_authorized, false);
  assert.equal(out.refund_authorized, false);
});

test('Claude Commerce is a reference pattern only, not a provider dependency', () => {
  const out = buildCommerceAgentPlan(base({ mode: 'CLAUDE_COMMERCE_REFERENCE', catalog_ref: 'catalog:fenix:v1', commerce_policy_ref: 'policy:commerce:v1' }));
  assert.equal(out.allowed, true);
  assert.equal(out.block, 178);
  assert.equal(out.provider_binding, false);
  assert.equal(out.additional_cost_cents, 0);
});

test('App Factory wraps FACT and APPBOOT and emits rebuild/rollback scaffold plan', () => {
  const out = buildAppFactoryPlan(app());
  assert.equal(out.allowed, true);
  assert.equal(out.block, 181);
  assert.equal(out.app_factory_block, 181);
  assert.equal(out.templates_block, 183);
  assert.deepEqual(out.plan.engines, ['FACT-001','APPBOOT-001']);
  assert.ok(out.plan.artifacts.includes('rollback.md'));
  assert.ok(out.plan.artifacts.includes('rebuild.md'));
  assert.equal(out.plan.deploy, false);
  assert.equal(out.prod_authorized, false);
});

test('Blink and text-to-CAD are catalogued without installation', () => {
  const a = catalogSpecializedCapability(blink());
  const b = catalogSpecializedCapability(cad());
  assert.equal(a.block, 182);
  assert.equal(a.decision, 'REFERENCE_NO_INSTALL');
  assert.equal(a.install_authorized, false);
  assert.equal(b.block, 184);
  assert.equal(b.decision, 'CATALOG_SPECIALIZED');
});

test('ordinary Phase15 flow auto-plans every block with stable idempotency', () => {
  const request = base({ brand: brand(), shopping: shopping(), merchant: merchant(), app: app(), blink: blink(), text_to_cad: cad() });
  const a = phase15AutoPlan(request);
  const b = phase15AutoPlan(request);
  assert.equal(a.allowed, true);
  assert.equal(a.status, 'PREPROD_AUTOMATION_PLAN_READY');
  assert.deepEqual(a.blocks, [176,177,178,179,180,181,182,183,184]);
  assert.equal(a.context_version, 'v0');
  assert.equal(a.steps.some((step) => step.block === 176), true);
  assert.equal(a.steps.some((step) => step.block === 178), true);
  const appStep = a.steps.find((step) => step.app_factory_block === 181);
  assert.equal(appStep.templates_block, 183);
  assert.equal(a.automatic_ordinary_flow, true);
  assert.equal(a.external_side_effect_executed, false);
  assert.equal(a.prod_authorized, false);
  assert.equal(a.additional_cost_cents, 0);
  assert.equal(a.idempotency_key, b.idempotency_key);
});

test('exact PREPROD, FACT capability and v0 context are mandatory', () => {
  assert.throws(() => buildBrandTokens(brand({ context: { ...context, environment: 'PROD' } })), /exact PREPROD/);
  assert.throws(() => buildBrandTokens(brand({ context: { ...context, engine_id: 'APPBOOT-001' } })), /must be FACT-001/);
  assert.throws(() => buildBrandTokens(brand({ context: { ...context, version: 'v1' } })), /exact v0/);
});