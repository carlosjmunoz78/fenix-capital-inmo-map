import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRoleKnowledgeContext,
  getRoleProfile,
  getRoleKnowledgePack
} from '../roles/role-knowledge-runtime-v1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../registry/engineering-specializations-full-sweep.v1.json');
const ENGINEERING_REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

export const ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1 = Object.freeze({
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

function clone(value) {
  return structuredClone(value);
}

function findSpecialist(name) {
  return ENGINEERING_REGISTRY.specialists.find((item) => item.specialist === name) ?? null;
}

export function listEngineeringSpecialistBindings() {
  return Object.entries(ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1).map(([specialist, role_id]) => {
    const physical = findSpecialist(specialist);
    const role = getRoleProfile(role_id);
    return {
      specialist,
      role_id,
      source_state: physical?.status ?? null,
      role_state: role.state,
      environment: role.environment,
      knowledge_pack_id: role.knowledge_pack_id
    };
  });
}

export function buildEngineeringSpecialistContext(input = {}) {
  const {
    specialist,
    company_id: companyId,
    environment = 'PREPROD',
    version = 'v1',
    requested_authority: requestedAuthority = {}
  } = input;

  if (!specialist) throw new Error('specialist required');
  const roleId = ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1[specialist];
  if (!roleId) throw new Error(`unknown engineering specialist: ${specialist}`);

  const physical = findSpecialist(specialist);
  if (!physical) throw new Error(`physical specialist evidence missing: ${specialist}`);
  if (physical.status !== 'FULL_SAFE_PREPROD') {
    throw new Error(`specialist is not FULL_SAFE_PREPROD: ${specialist}:${physical.status}`);
  }

  const roleKnowledge = buildRoleKnowledgeContext({
    role_id: roleId,
    company_id: companyId,
    environment,
    version,
    requested_authority: requestedAuthority
  });

  return {
    binding_version: 'v1',
    specialist,
    role_id: roleId,
    original_specialist_evidence: clone(physical),
    role_context: roleKnowledge,
    knowledge_pack: getRoleKnowledgePack(roleId),
    source_registry: {
      registry_id: ENGINEERING_REGISTRY.registry_id,
      status: ENGINEERING_REGISTRY.status,
      environment: ENGINEERING_REGISTRY.environment,
      implementation_head_sha: ENGINEERING_REGISTRY.evidence?.implementation_head_sha ?? null
    },
    authority_delta: false,
    external_side_effect_executed: false,
    cost_eur: 0
  };
}

export function validateEngineeringSpecialistBindings() {
  const errors = [];
  const entries = Object.entries(ENGINEERING_SPECIALIST_ROLE_BINDINGS_V1);

  if (entries.length !== 10) errors.push(`expected 10 bindings, got ${entries.length}`);

  for (const [specialist, roleId] of entries) {
    const physical = findSpecialist(specialist);
    if (!physical) errors.push(`missing physical specialist:${specialist}`);
    else if (physical.status !== 'FULL_SAFE_PREPROD') errors.push(`non-green specialist:${specialist}:${physical.status}`);

    try {
      const role = getRoleProfile(roleId);
      if (role.class !== 'SPECIALIST_ROLE') errors.push(`non-specialist role:${roleId}:${role.class}`);
      if (role.environment !== 'PREPROD') errors.push(`non-PREPROD role:${roleId}`);
      const pack = getRoleKnowledgePack(roleId);
      if (pack.role_id !== roleId) errors.push(`knowledge mismatch:${roleId}`);
    } catch (error) {
      errors.push(`binding resolution failed:${specialist}:${roleId}:${error.message}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    binding_count: entries.length,
    source_registry_status: ENGINEERING_REGISTRY.status,
    environment: 'PREPROD',
    authority_delta: false,
    external_side_effects: false,
    cost_eur: 0
  };
}
