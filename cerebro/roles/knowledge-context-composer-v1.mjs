import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoleKnowledgeContext } from './role-knowledge-runtime-v1.mjs';
import { MultiCompanyBootstrap, getPhase4Registry } from '../multicompany/bootstrap.mjs';
import * as MortgageOperations from '../mortgage/mortgage-operations-native-v1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const PACKS_PATH = path.resolve(__dirname, '../registry/company-domain-knowledge-packs.v1.json');
const APP_CRM_PACK_PATH = path.resolve(__dirname, '../registry/fenix-app-crm-knowledge-pack.v1.json');
const COMPANY_DOMAIN_PACKS = JSON.parse(fs.readFileSync(PACKS_PATH, 'utf8'));
const APP_CRM_PACK = JSON.parse(fs.readFileSync(APP_CRM_PACK_PATH, 'utf8'));
const ALL_COMPANY_DOMAIN_PACKS = Object.freeze([...COMPANY_DOMAIN_PACKS.packs, APP_CRM_PACK]);

const EXACT_ENVIRONMENT = 'PREPROD';
const SUPPORTED_DOMAINS = Object.freeze(['MORTGAGE', 'APP_CRM']);
const FORBIDDEN_AUTHORITY = Object.freeze([
  'prod_authority',
  'prod_authorized',
  'prod_write',
  'prod_write_authorized',
  'auto_merge',
  'auto_apply',
  'direct_knowledge_mutation',
  'external_install',
  'external_side_effect_authorized',
  'customer_data',
  'trading',
  'trading_access',
  'supabase_writes'
]);
const FORBIDDEN_LIVE_KEYS = new Set([
  'email','phone','telephone','mobile','name','first_name','last_name','full_name','address',
  'dni','nif','nie','iban','token','jwt','secret','password','api_key','access_token','refresh_token'
]);

const MORTGAGE_BINDING = Object.freeze({
  domain_id: 'MORTGAGE',
  binding_state: 'PHYSICAL_RUNTIME_VERIFIED',
  runtime_path: 'cerebro/mortgage/mortgage-operations-native-v1.mjs',
  capabilities: Object.freeze([
    ['VIA-001', 'assessMortgageViability'],
    ['BNK-001', 'normalizeBankKnowledge'],
    ['BNK-002', 'rankBanks'],
    ['BNK-003', 'routeBank'],
    ['BNK-004', 'prepareBankPresentation'],
    ['BNK-005', 'planBankFollowup'],
    ['BNK-006', 'planNegotiation'],
    ['OFR-001', 'compareOffers']
  ]),
  knowledge_update_reference: 'KNW-001',
  knowledge_update_reference_state: 'REFERENCE_OBSERVED_IN_RUNTIME_NOT_PROMOTED_BY_COMPOSER'
});

const APP_CRM_BINDING = Object.freeze({
  domain_id: 'APP_CRM',
  binding_state: 'CURRENT_SOURCE_RUNTIME_VERIFIED_NOT_LIVE_DEPLOYMENT_ASSERTION',
  runtime_paths: Object.freeze([
    'src/appRpcCompat.ts',
    'supabase/functions/fenix-app-gateway/index.ts',
    'scripts/audit-app-rpc-migration-readiness.mjs'
  ]),
  capability_families: Object.freeze([
    'session_context',
    'navigation',
    'chat',
    'contactos',
    'expedientes',
    'tareas',
    'search',
    'documentos',
    'bancos',
    'envios_banco',
    'ofertas',
    'tasaciones',
    'firmas',
    'notificaciones'
  ]),
  historical_contract_reference: 'preprod-app-phase1@94a6c73',
  historical_contract_state: 'HISTORICAL_ONLY_NOT_CURRENT_RUNTIME_PROOF',
  live_deployment_state: 'NOT_ASSERTED_BY_COMPOSER'
});

const APP_CRM_REQUIRED_TOKENS = Object.freeze({
  'src/appRpcCompat.ts': Object.freeze([
    "case 'fenix_prod_contact_create'",
    "case 'fenix_prod_exp_create'",
    "case 'fenix_prod_exp_update'",
    "case 'fenix_prod_notifications_list_user'",
    "case 'fenix_prod_sign_create'",
    "fetchAppApi"
  ]),
  'supabase/functions/fenix-app-gateway/index.ts': Object.freeze([
    "p==='/session/context'&&req.method==='GET'",
    "p==='/navigation'&&req.method==='GET'",
    "p==='/expedientes'&&req.method==='POST'",
    "p==='/tareas'&&req.method==='GET'",
    "p==='/documentos'&&req.method==='GET'",
    "p==='/bancos'&&req.method==='GET'",
    "p==='/tasaciones'&&req.method==='GET'",
    "p==='/firmas'&&req.method==='POST'",
    "fenix_prod_actor_context_by_auth_server"
  ]),
  'scripts/audit-app-rpc-migration-readiness.mjs': Object.freeze([
    "mode: 'READ_ONLY_STATIC_READINESS_AUDIT'",
    'ready_for_controlled_gateway_deploy',
    'requiredCompat',
    'requiredServer',
    'requiredRoutes'
  ])
});

function clone(value) {
  return structuredClone(value);
}

function text(value, label, max = 160) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new TypeError(`${label} too long`);
  return normalized;
}

function assertEnvironment(environment) {
  if (environment !== EXACT_ENVIRONMENT) throw new Error('knowledge context composer v1 is exact PREPROD only');
}

function assertNoAuthorityEscalation(requestedAuthority = {}) {
  if (!requestedAuthority || typeof requestedAuthority !== 'object' || Array.isArray(requestedAuthority)) {
    throw new TypeError('requested_authority must be an object');
  }
  for (const key of FORBIDDEN_AUTHORITY) {
    if (requestedAuthority[key] === true) throw new Error(`authority escalation forbidden: ${key}`);
  }
}

function assertSafeLiveContext(value, pathLabel = 'live_context', seen = new WeakSet()) {
  if (value == null) return;
  if (['string','boolean','number'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError(`${pathLabel} contains non-finite number`);
    return;
  }
  if (typeof value !== 'object') throw new TypeError(`${pathLabel} contains unsupported value`);
  if (seen.has(value)) throw new TypeError(`${pathLabel} contains circular value`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertSafeLiveContext(item, `${pathLabel}[${index}]`, seen));
      return;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new TypeError(`${pathLabel} must contain plain objects only`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_LIVE_KEYS.has(key.toLowerCase())) throw new Error(`PII/secret key forbidden in live_context: ${key}`);
      assertSafeLiveContext(child, `${pathLabel}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

function validateMortgageBinding() {
  const errors = [];
  for (const [engineId, exportName] of MORTGAGE_BINDING.capabilities) {
    if (typeof MortgageOperations[exportName] !== 'function') errors.push(`${engineId}:${exportName}:missing`);
  }
  return errors;
}

function validateAppCrmBinding() {
  const errors = [];
  for (const [relativePath, tokens] of Object.entries(APP_CRM_REQUIRED_TOKENS)) {
    const absolutePath = path.resolve(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`APP_CRM:${relativePath}:missing`);
      continue;
    }
    const source = fs.readFileSync(absolutePath, 'utf8');
    for (const token of tokens) {
      if (!source.includes(token)) errors.push(`APP_CRM:${relativePath}:missing_token:${token}`);
    }
  }
  return errors;
}

function findCompanyDomainPack(companyId, domainId) {
  return ALL_COMPANY_DOMAIN_PACKS.find(
    (item) => item.company_id === companyId && item.domain_id === domainId
  ) ?? null;
}

function buildCommonLayer() {
  const registry = getPhase4Registry();
  return {
    layer: 'COMMON',
    state: 'PHYSICAL_GOVERNANCE_VERIFIED',
    environment: registry.environment,
    human_required_reasons: clone(registry.human_required_reasons),
    cross_company_access: registry.policy.cross_company_access,
    prod_execution_enabled: registry.prod_execution_enabled,
    additional_cost_target_eur: registry.additional_cost_target_eur,
    provenance: [
      'cerebro/registry/multicompany-bootstrap.json',
      'cerebro/registry/role-knowledge-packs.v1.json'
    ]
  };
}

function buildDomainLayer(domainId) {
  if (!SUPPORTED_DOMAINS.includes(domainId)) throw new Error(`unsupported or unverified domain_id: ${domainId}`);
  if (domainId === 'MORTGAGE') {
    const bindingErrors = validateMortgageBinding();
    if (bindingErrors.length) throw new Error(`mortgage runtime binding invalid: ${bindingErrors.join(',')}`);
    return {
      layer: 'DOMAIN',
      ...clone(MORTGAGE_BINDING),
      authority_delta: false,
      external_side_effects: false,
      additional_cost_eur: 0
    };
  }
  const bindingErrors = validateAppCrmBinding();
  if (bindingErrors.length) throw new Error(`APP_CRM runtime binding invalid: ${bindingErrors.join(',')}`);
  return {
    layer: 'DOMAIN',
    ...clone(APP_CRM_BINDING),
    authority_delta: false,
    external_side_effects: false,
    additional_cost_eur: 0
  };
}

function buildCompanyLayer({ companyId, domainId, version }) {
  const registry = getPhase4Registry();
  const engineMap = new Map(registry.engines.map((engine) => [engine.engine_id, engine]));
  for (const required of ['COMP-REG-001','TENANT-001','KBOOT-001']) {
    if (!engineMap.has(required)) throw new Error(`required multi-company engine missing: ${required}`);
  }

  const runtime = new MultiCompanyBootstrap({ environment: EXACT_ENVIRONMENT, version });
  const registration = runtime.registerCompany({ company_id: companyId, profile: {} });
  if (!registration.accepted || registration.company.state !== 'REGISTERED_PREPROD') {
    throw new Error('company structural PREPROD registration failed');
  }
  const companyPack = findCompanyDomainPack(companyId, domainId);
  if (!companyPack) throw new Error(`verified company/domain knowledge pack missing: ${companyId}/${domainId}`);

  return {
    layer: 'COMPANY',
    company_id: companyId,
    domain_id: domainId,
    state: 'SOURCE_BACKED_PREPROD',
    registry_engine: clone(engineMap.get('COMP-REG-001')),
    tenant_engine: clone(engineMap.get('TENANT-001')),
    knowledge_bootstrap_engine: clone(engineMap.get('KBOOT-001')),
    durability_state: 'IN_MEMORY_REFERENCE_ONLY',
    durable_company_registry_verified: false,
    cross_company_access: registry.policy.cross_company_access,
    knowledge_pack: clone(companyPack),
    provenance: [
      'cerebro/multicompany/bootstrap.mjs',
      'cerebro/multicompany/company-reg-tenant-preprod.mjs',
      'cerebro/registry/multicompany-bootstrap.json',
      domainId === 'APP_CRM'
        ? 'cerebro/registry/fenix-app-crm-knowledge-pack.v1.json'
        : 'cerebro/registry/company-domain-knowledge-packs.v1.json'
    ]
  };
}

export const KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT = Object.freeze({
  composer_id: 'CEREBRO_KNOWLEDGE_CONTEXT_COMPOSER_V1',
  environment: EXACT_ENVIRONMENT,
  version: 'v1',
  composition_order: Object.freeze(['COMMON','DOMAIN','COMPANY','ROLE']),
  effective_precedence: Object.freeze(['ROLE','COMPANY','DOMAIN','COMMON']),
  live_context: 'EPHEMERAL_SEPARATE',
  supported_domains: SUPPORTED_DOMAINS,
  company_registry_durability: 'IN_MEMORY_REFERENCE_ONLY',
  authority_delta: false,
  direct_knowledge_mutation: false,
  auto_apply: false,
  prod_authorized: false,
  prod_write_authorized: false,
  customer_data: false,
  trading_access: false,
  external_side_effects: false,
  additional_cost_eur: 0
});

export function composeKnowledgeContext(input = {}) {
  const roleId = text(input.role_id, 'role_id', 120);
  const companyId = text(input.company_id, 'company_id', 120);
  const domainId = text(input.domain_id, 'domain_id', 80).toUpperCase();
  const environment = input.environment ?? EXACT_ENVIRONMENT;
  const version = text(input.version ?? 'v1', 'version', 80);
  assertEnvironment(environment);
  assertNoAuthorityEscalation(input.requested_authority ?? {});
  assertSafeLiveContext(input.live_context ?? null);

  const roleContext = buildRoleKnowledgeContext({
    role_id: roleId,
    company_id: companyId,
    environment,
    version,
    requested_authority: input.requested_authority ?? {}
  });
  const commonLayer = buildCommonLayer();
  const domainLayer = buildDomainLayer(domainId);
  const companyLayer = buildCompanyLayer({ companyId, domainId, version });
  const roleLayer = {
    layer: 'ROLE',
    state: 'ROLE_PACK_VERIFIED',
    role: clone(roleContext.role),
    knowledge: clone(roleContext.knowledge),
    learning: clone(roleContext.learning),
    promotion: clone(roleContext.promotion)
  };

  return Object.freeze({
    schema_version: '1.1.0',
    state_type: 'CEREBRO_COMPOSED_KNOWLEDGE_CONTEXT',
    status: 'COMPOSED_PREPROD_GREEN',
    context: Object.freeze({
      company_id: companyId,
      engine_id: 'KBOOT-001',
      domain_id: domainId,
      role_id: roleId,
      environment,
      version
    }),
    composition_order: clone(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.composition_order),
    effective_precedence: clone(KNOWLEDGE_CONTEXT_COMPOSER_V1_CONTRACT.effective_precedence),
    layers: Object.freeze({
      common: commonLayer,
      domain: domainLayer,
      company: companyLayer,
      role: roleLayer
    }),
    live_context: input.live_context == null ? null : Object.freeze({
      state: 'EPHEMERAL_NOT_CANONICAL_KNOWLEDGE',
      persisted: false,
      value: clone(input.live_context)
    }),
    effective_authority: Object.freeze(Object.fromEntries(FORBIDDEN_AUTHORITY.map((key) => [key, false]))),
    direct_knowledge_mutation: false,
    auto_apply: false,
    external_side_effect_executed: false,
    cost_eur: 0
  });
}

export function validateKnowledgeContextComposer() {
  const errors = [];
  if (COMPANY_DOMAIN_PACKS.environment !== EXACT_ENVIRONMENT) errors.push('company/domain packs must be PREPROD');
  if (COMPANY_DOMAIN_PACKS.governance?.authority_delta !== false) errors.push('authority_delta must remain false');
  if (COMPANY_DOMAIN_PACKS.governance?.additional_cost_eur !== 0) errors.push('knowledge pack cost must remain zero');
  if (APP_CRM_PACK.environment !== EXACT_ENVIRONMENT) errors.push('APP_CRM pack must be PREPROD');
  if (APP_CRM_PACK.authority?.authority_delta !== false) errors.push('APP_CRM authority_delta must remain false');
  if (APP_CRM_PACK.authority?.additional_cost_eur !== 0) errors.push('APP_CRM pack cost must remain zero');
  if (ALL_COMPANY_DOMAIN_PACKS.length !== 2) errors.push(`unexpected company/domain pack count:${ALL_COMPANY_DOMAIN_PACKS.length}`);
  errors.push(...validateMortgageBinding());
  errors.push(...validateAppCrmBinding());
  const phase4 = getPhase4Registry();
  for (const required of ['COMP-REG-001','TENANT-001','KBOOT-001']) {
    if (!phase4.engines.some((engine) => engine.engine_id === required)) errors.push(`missing engine:${required}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    environment: EXACT_ENVIRONMENT,
    pack_count: ALL_COMPANY_DOMAIN_PACKS.length,
    supported_domains: clone(SUPPORTED_DOMAINS),
    app_crm_binding_state: APP_CRM_BINDING.binding_state,
    company_registry_durability: 'IN_MEMORY_REFERENCE_ONLY',
    authority_delta: false,
    direct_knowledge_mutation: false,
    auto_apply: false,
    external_side_effects: false,
    cost_eur: 0
  };
}
