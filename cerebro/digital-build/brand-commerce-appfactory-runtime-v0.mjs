import crypto from 'node:crypto';

const ENVIRONMENT = 'PREPROD';
const CONTEXT_VERSION = 'v0';
const VERSION = 'brand-commerce-appfactory-v0';
const OWNER_ENGINE = 'FACT-001';
const CAPABILITY_ID = 'BRAND-COMMERCE-APPFACTORY';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

export const HUMAN_REQUIRED_REASONS = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const HUMAN_SET = new Set(HUMAN_REQUIRED_REASONS);

export const PHASE15_BLOCKS = Object.freeze({
  BRANDBOOT: 176,
  BRAND_TOKENS: 177,
  CLAUDE_COMMERCE_AGENTS: 178,
  SHOPPING_AGENT: 179,
  MERCHANT_AGENT: 180,
  APP_FACTORY: 181,
  BLINK: 182,
  APP_TEMPLATES: 183,
  TEXT_TO_CAD: 184
});

export const CAPABILITY_CATALOG = Object.freeze({
  BRANDBOOT_001: Object.freeze({ block: 176, decision: 'REUSE_EXISTING_LAB_CANDIDATE', owner: 'BRANDBOOT-001', physical_state: 'SEPARATE_GOVERNED_CANDIDATE', install: false }),
  BRAND_TOKENS: Object.freeze({ block: 177, decision: 'BUILD_DETERMINISTIC', owner: 'FACT-001', physical_state: 'PREPROD_LOCAL', install: false }),
  CLAUDE_COMMERCE_AGENTS: Object.freeze({ block: 178, decision: 'REFERENCE_PATTERN_ONLY', owner: 'SALE-001/PAY-001/INV-001', physical_state: 'NO_PROVIDER_BINDING', install: false }),
  SHOPPING_AGENT: Object.freeze({ block: 179, decision: 'BUILD_PLAN_ONLY', owner: 'SALE-001', physical_state: 'PREPROD_PLAN_ONLY', install: false }),
  MERCHANT_AGENT: Object.freeze({ block: 180, decision: 'BUILD_PLAN_ONLY', owner: 'SALE-001/PAY-001/INV-001', physical_state: 'PREPROD_PLAN_ONLY', install: false }),
  APP_FACTORY: Object.freeze({ block: 181, decision: 'WRAP_FACT_APPBOOT', owner: 'FACT-001/APPBOOT-001', physical_state: 'PREPROD_SCAFFOLD_PLAN', install: false }),
  BLINK: Object.freeze({ block: 182, decision: 'REFERENCE_NO_INSTALL', owner: 'FACT-001', physical_state: 'CATALOG_ONLY', install: false }),
  APP_TEMPLATES: Object.freeze({ block: 183, decision: 'BUILD_TEMPLATES', owner: 'FACT-001/APPBOOT-001', physical_state: 'PREPROD_SCAFFOLD_PLAN', install: false }),
  TEXT_TO_CAD: Object.freeze({ block: 184, decision: 'CATALOG_SPECIALIZED', owner: 'FACT-001', physical_state: 'CATALOG_ONLY', install: false })
});

const FORBIDDEN_KEYS = new Set([
  'email','phone','full_name','address','dni','nie','nif','iban','bank_account',
  'password','secret','token','jwt','api_key','apikey','access_token','refresh_token','private_key',
  'card_number','cvv','pan','raw_payment','raw_customer','raw_contract'
]);

function text(value, label, max = 240) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}
function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label} must be an opaque safe reference`);
  return out;
}
function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < min || out > max) throw new TypeError(`${label} invalid`);
  return out;
}
function stableHash(value, size = 32) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, size);
}
function assertPlainData(value, label = 'input', seen = new WeakSet()) {
  if (value === null || ['string','boolean','undefined'].includes(typeof value)) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${label} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${label} contains circular data`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertPlainData(item, `${label}[${index}]`, seen));
      return;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`${label} must contain plain data`);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (descriptor.get || descriptor.set) throw new TypeError(`${label}.${key} accessor forbidden`);
      if (!descriptor.enumerable) continue;
      if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error(`PII/secret/payment field forbidden: ${label}.${key}`);
      assertPlainData(descriptor.value, `${label}.${key}`, seen);
    }
  } finally { seen.delete(value); }
}
function humanReason(value) {
  const out = text(value, 'human_required_reason', 80).toUpperCase();
  if (!HUMAN_SET.has(out)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return out;
}
function blocked(code, reason, detail, extra = {}) {
  return Object.freeze({
    allowed: false,
    status: 'BLOCKED',
    code,
    blocker: 'HUMAN_REQUIRED',
    human_required_reason: humanReason(reason),
    detail,
    external_side_effect_executed: false,
    prod_authorized: false,
    ...extra
  });
}
function normalizeContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('context object required');
  assertPlainData(raw, 'context');
  const context = Object.freeze({
    company_id: text(raw.company_id, 'context.company_id', 120),
    engine_id: text(raw.engine_id, 'context.engine_id', 80),
    capability_id: text(raw.capability_id, 'context.capability_id', 120),
    environment: text(raw.environment, 'context.environment', 40).toUpperCase(),
    version: text(raw.version, 'context.version', 80)
  });
  if (context.engine_id !== OWNER_ENGINE) throw new Error(`context.engine_id must be ${OWNER_ENGINE}`);
  if (context.capability_id !== CAPABILITY_ID) throw new Error(`context.capability_id must be ${CAPABILITY_ID}`);
  if (context.environment !== ENVIRONMENT) throw new Error('phase15 V0 accepts exact PREPROD only');
  if (context.version !== CONTEXT_VERSION) throw new Error(`context.version must be exact ${CONTEXT_VERSION}`);
  return context;
}
function commonGate(raw) {
  assertPlainData(raw, 'request');
  const context = normalizeContext(raw.context);
  const targetCompany = raw.target_company_id == null ? context.company_id : text(raw.target_company_id, 'target_company_id', 120);
  if (targetCompany !== context.company_id) return blocked('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company execution denied.');
  const confidence = finite(raw.confidence ?? 1, 'confidence', { min: 0, max: 1 });
  if (confidence < 0.75) return blocked('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (raw.high_risk === true) return blocked('HIGH_RISK_CASE', 'HIGH_RISK', 'High-risk case requires human handling.');
  if (raw.customer_human_request === true) return blocked('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (raw.prod_write_requested === true || raw.publish_requested === true || raw.deploy_requested === true) {
    return blocked('PROD_OR_PUBLIC_WRITE_DISABLED', 'POLICY_CONFLICT', 'Phase15 V0 cannot deploy, publish or write PROD.');
  }
  const spendCents = finite(raw.spend_cents ?? 0, 'spend_cents', { min: 0, max: Number.MAX_SAFE_INTEGER });
  if (raw.purchase_requested === true || raw.subscription_requested === true || spendCents > 0) {
    return blocked('SPEND_DISABLED', 'MONEY_LIMIT', 'Additional spend is disabled in V0.');
  }
  if (raw.network_call_requested === true || raw.install_requested === true || raw.external_provider_requested === true) {
    return blocked('PHYSICAL_EXTERNAL_EXECUTION_DISABLED', 'POLICY_CONFLICT', 'External installation/provider execution is not authorized in V0.');
  }
  if (raw.signature_requested === true) return blocked('SIGNATURE_REQUIRED', 'SIGNATURE_REQUIRED', 'Signature remains a human/legal boundary.');
  return Object.freeze({ allowed: true, context, confidence });
}

function color(value, label) {
  const out = text(value, label, 7);
  if (!HEX.test(out)) throw new TypeError(`${label} must be #RRGGBB`);
  return out.toUpperCase();
}
function slug(value, label) {
  const out = text(value, label, 80).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(out)) throw new TypeError(`${label} invalid slug`);
  return out;
}

export function buildBrandTokens(raw) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const brandRef = safeRef(raw.brand_contract_ref, 'brand_contract_ref');
  const sourceEngine = text(raw.source_engine_id ?? 'BRANDBOOT-001', 'source_engine_id', 80);
  if (sourceEngine !== 'BRANDBOOT-001') return blocked('BRAND_SOURCE_NOT_CANONICAL_CANDIDATE', 'POLICY_CONFLICT', 'Brand tokens must consume the governed BRANDBOOT-001 contract candidate.');
  const palette = raw.palette ?? {};
  assertPlainData(palette, 'palette');
  const primary = color(palette.primary, 'palette.primary');
  const secondary = color(palette.secondary, 'palette.secondary');
  const background = color(palette.background ?? '#FFFFFF', 'palette.background');
  const foreground = color(palette.foreground ?? '#111111', 'palette.foreground');
  const headingFont = text(raw.typography?.heading ?? 'system-ui', 'typography.heading', 100);
  const bodyFont = text(raw.typography?.body ?? 'system-ui', 'typography.body', 100);
  const baseSpacing = finite(raw.base_spacing_px ?? 8, 'base_spacing_px', { min: 2, max: 32 });
  const radius = finite(raw.radius_px ?? 8, 'radius_px', { min: 0, max: 64 });
  const tokens = Object.freeze({
    schema_version: '1.0.0',
    brand_contract_ref: brandRef,
    company_id: gate.context.company_id,
    color: Object.freeze({ primary, secondary, background, foreground }),
    typography: Object.freeze({ heading: headingFont, body: bodyFont }),
    spacing: Object.freeze({ xs: baseSpacing / 2, sm: baseSpacing, md: baseSpacing * 2, lg: baseSpacing * 3, xl: baseSpacing * 4 }),
    radius: Object.freeze({ sm: Math.max(0, radius / 2), md: radius, lg: radius * 2 })
  });
  return Object.freeze({
    allowed: true,
    status: 'PLANNED',
    block: PHASE15_BLOCKS.BRAND_TOKENS,
    capability: 'BRAND_TOKENS',
    owner_engine: OWNER_ENGINE,
    source_engine: sourceEngine,
    tokens,
    tokens_hash: stableHash(tokens),
    outputs: Object.freeze(['design-tokens.json','brand.css']),
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_cents: 0
  });
}

export function buildCommerceAgentPlan(raw) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const mode = text(raw.mode, 'mode', 40).toUpperCase();
  const allowedModes = new Set(['CLAUDE_COMMERCE_REFERENCE','SHOPPING_AGENT','MERCHANT_AGENT']);
  if (!allowedModes.has(mode)) throw new Error(`unsupported commerce mode: ${mode}`);
  const catalogRef = safeRef(raw.catalog_ref, 'catalog_ref');
  const policyRef = safeRef(raw.commerce_policy_ref, 'commerce_policy_ref');
  const routes = mode === 'SHOPPING_AGENT'
    ? ['SALE-001','COM-001']
    : mode === 'MERCHANT_AGENT'
      ? ['SALE-001','PAY-001','INV-001','COM-001']
      : ['SALE-001','PAY-001','INV-001'];
  const block = mode === 'SHOPPING_AGENT'
    ? PHASE15_BLOCKS.SHOPPING_AGENT
    : mode === 'MERCHANT_AGENT'
      ? PHASE15_BLOCKS.MERCHANT_AGENT
      : PHASE15_BLOCKS.CLAUDE_COMMERCE_AGENTS;
  return Object.freeze({
    allowed: true,
    status: 'PLAN_ONLY',
    block,
    mode,
    company_id: gate.context.company_id,
    catalog_ref: catalogRef,
    commerce_policy_ref: policyRef,
    composed_engines: Object.freeze(routes),
    provider_binding: false,
    charge_authorized: false,
    refund_authorized: false,
    order_mutation_authorized: false,
    external_side_effect_executed: false,
    additional_cost_cents: 0
  });
}

export function buildAppFactoryPlan(raw) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const surface = text(raw.surface, 'surface', 40).toUpperCase();
  if (!['WEB_APP','PWA','MOBILE_TEMPLATE'].includes(surface)) throw new Error(`unsupported app surface: ${surface}`);
  const appSlug = slug(raw.app_slug, 'app_slug');
  const brandTokensRef = safeRef(raw.brand_tokens_ref, 'brand_tokens_ref');
  const requirementsRef = safeRef(raw.requirements_ref, 'requirements_ref');
  const plan = Object.freeze({
    app_slug: appSlug,
    surface,
    brand_tokens_ref: brandTokensRef,
    requirements_ref: requirementsRef,
    engines: Object.freeze(['FACT-001','APPBOOT-001']),
    artifacts: Object.freeze(['app-manifest.json','design-tokens.json','app-shell','tests','rollback.md','rebuild.md']),
    deploy: false,
    publish: false,
    prod_write: false
  });
  return Object.freeze({
    allowed: true,
    status: 'SCAFFOLD_PLAN_ONLY',
    block: PHASE15_BLOCKS.APP_FACTORY,
    app_factory_block: PHASE15_BLOCKS.APP_FACTORY,
    templates_block: PHASE15_BLOCKS.APP_TEMPLATES,
    company_id: gate.context.company_id,
    plan,
    plan_hash: stableHash(plan),
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_cents: 0
  });
}

export function catalogSpecializedCapability(raw) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;
  const capability = text(raw.capability, 'capability', 40).toUpperCase().replaceAll('-', '_');
  if (!['BLINK','TEXT_TO_CAD'].includes(capability)) throw new Error(`unsupported specialized capability: ${capability}`);
  return Object.freeze({
    allowed: true,
    status: 'CATALOG_ONLY',
    block: capability === 'BLINK' ? PHASE15_BLOCKS.BLINK : PHASE15_BLOCKS.TEXT_TO_CAD,
    capability,
    decision: capability === 'BLINK' ? 'REFERENCE_NO_INSTALL' : 'CATALOG_SPECIALIZED',
    install_authorized: false,
    provider_binding: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_cents: 0
  });
}

export function phase15AutoPlan(raw) {
  const gate = commonGate(raw);
  if (!gate.allowed) return gate;

  const brandboot = Object.freeze({
    allowed: true,
    status: 'REUSED_CONTRACT_SOURCE',
    block: PHASE15_BLOCKS.BRANDBOOT,
    capability: 'BRANDBOOT-001',
    canonical_registry_promotion_claimed: false,
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_cents: 0
  });

  const brand = buildBrandTokens(raw.brand);
  if (!brand.allowed) return brand;

  const claudeInput = raw.claude_commerce ?? { ...raw.shopping, mode: 'CLAUDE_COMMERCE_REFERENCE' };
  const claudeReference = buildCommerceAgentPlan(claudeInput);
  if (!claudeReference.allowed) return claudeReference;

  const shopping = buildCommerceAgentPlan(raw.shopping);
  if (!shopping.allowed) return shopping;
  const merchant = buildCommerceAgentPlan(raw.merchant);
  if (!merchant.allowed) return merchant;
  const app = buildAppFactoryPlan(raw.app);
  if (!app.allowed) return app;
  const blink = catalogSpecializedCapability(raw.blink);
  if (!blink.allowed) return blink;
  const cad = catalogSpecializedCapability(raw.text_to_cad);
  if (!cad.allowed) return cad;

  const fingerprint = stableHash({
    company_id: gate.context.company_id,
    brand: brand.tokens_hash,
    claude_reference: claudeReference,
    shopping,
    merchant,
    app: app.plan_hash,
    blink: blink.block,
    cad: cad.block
  });

  return Object.freeze({
    allowed: true,
    status: 'PREPROD_AUTOMATION_PLAN_READY',
    version: VERSION,
    context_version: CONTEXT_VERSION,
    company_id: gate.context.company_id,
    blocks: Object.freeze(Object.values(PHASE15_BLOCKS)),
    brandboot_state: 'EXISTING_LAB_CANDIDATE_NOT_PROMOTED_BY_THIS_RUNTIME',
    steps: Object.freeze([brandboot, brand, claudeReference, shopping, merchant, app, blink, cad]),
    idempotency_key: `phase15:${gate.context.company_id}:${fingerprint}`,
    observable_metadata: Object.freeze({ capability_id: CAPABILITY_ID, environment: ENVIRONMENT, version: VERSION, context_version: CONTEXT_VERSION, fingerprint }),
    automatic_ordinary_flow: true,
    external_side_effect_executed: false,
    prod_authorized: false,
    additional_cost_cents: 0
  });
}

export const PHASE15_RUNTIME = Object.freeze({
  environment: ENVIRONMENT,
  context_version: CONTEXT_VERSION,
  version: VERSION,
  owner_engine: OWNER_ENGINE,
  capability_id: CAPABILITY_ID,
  blocks: PHASE15_BLOCKS,
  catalog: CAPABILITY_CATALOG,
  external_execution_enabled: false,
  prod_enabled: false,
  additional_cost_cents: 0
});