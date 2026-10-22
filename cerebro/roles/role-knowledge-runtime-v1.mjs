import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = path.resolve(__dirname, '../registry');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(REGISTRY_DIR, name), 'utf8'));
}

const ROLE_REGISTRY = readJson('role-agent-registry.v1.json');
const KNOWLEDGE_REGISTRY = readJson('role-knowledge-packs.v1.json');

const FORBIDDEN_AUTHORITY = Object.freeze([
  'prod_authority',
  'prod_write',
  'auto_merge',
  'external_install',
  'customer_data',
  'trading'
]);

function clone(value) {
  return structuredClone(value);
}

function findRole(roleId) {
  return ROLE_REGISTRY.roles.find((item) => item.role_id === roleId) ?? null;
}

function findPack(packId) {
  return KNOWLEDGE_REGISTRY.packs.find((item) => item.knowledge_pack_id === packId) ?? null;
}

function assertNoAuthorityEscalation(requestedAuthority = {}) {
  for (const key of FORBIDDEN_AUTHORITY) {
    if (requestedAuthority[key] === true) {
      throw new Error(`authority escalation forbidden: ${key}`);
    }
  }
}

function assertEnvironment(environment) {
  if (environment !== 'PREPROD') {
    throw new Error('role knowledge runtime v1 is exact PREPROD only');
  }
}

function assertCompanyScope(role, companyId) {
  if (!companyId) throw new Error('company_id required');
  if (role.company_scope !== 'GLOBAL' && role.company_scope !== companyId) {
    throw new Error(`role ${role.role_id} is not available for company_id=${companyId}`);
  }
}

export const ROLE_KNOWLEDGE_RUNTIME_V1_CONTRACT = Object.freeze({
  registry_id: ROLE_REGISTRY.registry_id,
  knowledge_registry_id: KNOWLEDGE_REGISTRY.registry_id,
  environment: 'PREPROD',
  version: 'v1',
  role_count: ROLE_REGISTRY.roles.length,
  authority_delta: false,
  forbidden_authority: FORBIDDEN_AUTHORITY,
  cost_eur: 0,
  prod_write: false,
  external_side_effects: false
});

export function listRoleProfiles() {
  return ROLE_REGISTRY.roles.map((role) => ({
    role_id: role.role_id,
    name: role.name,
    class: role.class,
    department: role.department,
    family: role.family,
    company_scope: role.company_scope,
    environment: role.environment,
    state: role.state,
    reports_to: role.reports_to,
    reports_to_state: role.reports_to_state,
    knowledge_pack_id: role.knowledge_pack_id
  }));
}

export function getRoleProfile(roleId) {
  const role = findRole(roleId);
  if (!role) throw new Error(`unknown role_id: ${roleId}`);
  return clone(role);
}

export function getRoleKnowledgePack(roleId) {
  const role = findRole(roleId);
  if (!role) throw new Error(`unknown role_id: ${roleId}`);
  const pack = findPack(role.knowledge_pack_id);
  if (!pack) throw new Error(`knowledge pack missing for role_id: ${roleId}`);
  if (pack.role_id !== role.role_id) throw new Error(`knowledge pack role mismatch: ${roleId}`);
  return clone(pack);
}

export function buildRoleKnowledgeContext(input = {}) {
  const {
    role_id: roleId,
    company_id: companyId,
    environment = 'PREPROD',
    version = 'v1',
    requested_authority: requestedAuthority = {}
  } = input;

  if (!roleId) throw new Error('role_id required');
  assertEnvironment(environment);
  assertNoAuthorityEscalation(requestedAuthority);

  const role = findRole(roleId);
  if (!role) throw new Error(`unknown role_id: ${roleId}`);
  assertCompanyScope(role, companyId);

  const pack = findPack(role.knowledge_pack_id);
  if (!pack) throw new Error(`knowledge pack missing for role_id: ${roleId}`);
  if (pack.role_id !== role.role_id) throw new Error(`knowledge pack role mismatch: ${roleId}`);

  return {
    context: {
      company_id: companyId,
      engine_id: ROLE_REGISTRY.engine_id,
      environment,
      version
    },
    role: clone(role),
    knowledge: clone(pack),
    learning: {
      mode: KNOWLEDGE_REGISTRY.global_contract.learning_mode,
      pipeline: clone(KNOWLEDGE_REGISTRY.global_contract.learning_pipeline),
      authority_delta: false
    },
    effective_authority: Object.fromEntries(FORBIDDEN_AUTHORITY.map((key) => [key, false])),
    promotion: {
      prod_allowed: false,
      rule: KNOWLEDGE_REGISTRY.global_contract.promotion_rule
    },
    external_side_effect_executed: false,
    cost_eur: 0
  };
}

export function validateRoleKnowledgeRegistries() {
  const roleIds = new Set();
  const packIds = new Set();
  const errors = [];

  for (const role of ROLE_REGISTRY.roles) {
    if (roleIds.has(role.role_id)) errors.push(`duplicate role_id:${role.role_id}`);
    roleIds.add(role.role_id);
    const pack = findPack(role.knowledge_pack_id);
    if (!pack) errors.push(`missing pack:${role.role_id}:${role.knowledge_pack_id}`);
    else if (pack.role_id !== role.role_id) errors.push(`pack mismatch:${role.role_id}:${pack.role_id}`);
    if (role.environment !== 'PREPROD') errors.push(`non-PREPROD role:${role.role_id}`);
    if (role.reports_to !== null && role.reports_to_state === 'UNRESOLVED') errors.push(`invalid reporting edge:${role.role_id}`);
  }

  for (const pack of KNOWLEDGE_REGISTRY.packs) {
    if (packIds.has(pack.knowledge_pack_id)) errors.push(`duplicate knowledge_pack_id:${pack.knowledge_pack_id}`);
    packIds.add(pack.knowledge_pack_id);
    if (!roleIds.has(pack.role_id)) errors.push(`orphan pack:${pack.knowledge_pack_id}`);
  }

  if (ROLE_REGISTRY.roles.length !== KNOWLEDGE_REGISTRY.packs.length) {
    errors.push(`role/pack count mismatch:${ROLE_REGISTRY.roles.length}/${KNOWLEDGE_REGISTRY.packs.length}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    role_count: ROLE_REGISTRY.roles.length,
    knowledge_pack_count: KNOWLEDGE_REGISTRY.packs.length,
    environment: ROLE_REGISTRY.environment,
    authority_delta: false,
    cost_eur: 0
  };
}
