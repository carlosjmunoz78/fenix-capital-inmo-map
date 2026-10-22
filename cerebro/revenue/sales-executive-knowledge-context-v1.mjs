import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRoleKnowledgeContext } from '../roles/role-knowledge-runtime-v1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_PATH = path.resolve(__dirname, '../registry/sales-execution-agent-inbox-profile.v1.json');
const SALES_PROFILE = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));

const ROLE_ID = 'AGT-SALES-EXECUTIVE';
const PROFILE_ID = 'sales_executive';

function clone(value) {
  return structuredClone(value);
}

function requirePlanOnlyProfile() {
  if (SALES_PROFILE.profile_id !== PROFILE_ID) {
    throw new Error(`unexpected sales profile_id: ${SALES_PROFILE.profile_id}`);
  }
  if (SALES_PROFILE.environment_scope !== 'PREPROD') {
    throw new Error(`sales profile is not PREPROD scoped: ${SALES_PROFILE.environment_scope}`);
  }

  const defaults = SALES_PROFILE.defaults ?? {};
  const violations = [];
  if (defaults.execution_mode !== 'PLAN_ONLY') violations.push('execution_mode');
  if (defaults.outreach_authorized !== false) violations.push('outreach_authorized');
  if (defaults.crm_write_authorized !== false) violations.push('crm_write_authorized');
  if (defaults.delivery_enabled !== false) violations.push('delivery_enabled');
  if (defaults.prod_write_authorized !== false) violations.push('prod_write_authorized');
  if (defaults.external_side_effect_authorized !== false) violations.push('external_side_effect_authorized');

  if (violations.length) {
    throw new Error(`sales profile is not safe PLAN_ONLY: ${violations.join(',')}`);
  }

  return defaults;
}

export function buildSalesExecutiveKnowledgeContext(input = {}) {
  const {
    company_id: companyId = 'fenix',
    environment = 'PREPROD',
    version = 'v1',
    requested_authority: requestedAuthority = {}
  } = input;

  const defaults = requirePlanOnlyProfile();
  const roleContext = buildRoleKnowledgeContext({
    role_id: ROLE_ID,
    company_id: companyId,
    environment,
    version,
    requested_authority: requestedAuthority
  });

  return {
    binding_version: 'v1',
    profile_id: PROFILE_ID,
    role_id: ROLE_ID,
    execution_mode: defaults.execution_mode,
    original_profile_defaults: clone(defaults),
    role_context: roleContext,
    preparation_contract: {
      may_qualify: true,
      may_plan_cadence: true,
      may_prepare_next_action: true,
      may_prepare_draft: true,
      may_prepare_approval_packet: true,
      may_send: false,
      may_write_crm: false,
      may_deliver: false,
      may_write_prod: false,
      external_side_effect_authorized: false,
      human_blocker: defaults.blocker,
      human_checkpoint: defaults.checkpoint_token
    },
    authority_delta: false,
    external_side_effect_executed: false,
    cost_eur: defaults.additional_cost_eur ?? 0
  };
}

export function validateSalesExecutiveKnowledgeBinding() {
  try {
    const defaults = requirePlanOnlyProfile();
    const context = buildSalesExecutiveKnowledgeContext({ company_id: 'fenix' });
    return {
      ok: context.profile_id === PROFILE_ID
        && context.role_id === ROLE_ID
        && context.execution_mode === 'PLAN_ONLY'
        && context.preparation_contract.may_send === false
        && context.preparation_contract.may_write_crm === false
        && context.preparation_contract.may_deliver === false
        && context.preparation_contract.may_write_prod === false
        && context.preparation_contract.external_side_effect_authorized === false
        && context.preparation_contract.human_blocker === 'HUMAN_REQUIRED',
      profile_id: SALES_PROFILE.profile_id,
      profile_status: SALES_PROFILE.technical_closeout?.allowed_status ?? null,
      execution_mode: defaults.execution_mode,
      authority_delta: false,
      external_side_effects: false,
      cost_eur: defaults.additional_cost_eur ?? 0
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      authority_delta: false,
      external_side_effects: false,
      cost_eur: 0
    };
  }
}
