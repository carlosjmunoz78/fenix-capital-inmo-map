const REQUIRED = ['company_id','engine_id','environment','version','operation','audit_id','idempotency_key'];
const CANONICAL_HUMAN_REQUIRED = new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

const OPERATIONS = new Set([
  'search_designs','create_design','generate_design','edit_design','generate_image','upload_asset',
  'folders','brand_kits','brand_templates','resize','export'
]);

const BINDINGS = new Map([
  ['SOC-001', new Set(['search_designs','create_design','generate_design','edit_design','generate_image','upload_asset','folders','brand_kits','brand_templates','resize','export'])],
  ['MKT-001', new Set(['search_designs','create_design','generate_design','edit_design','generate_image','upload_asset','folders','brand_kits','brand_templates','resize','export'])],
  ['LAB-MKT', new Set(['search_designs','create_design','generate_design','edit_design','generate_image','resize','export'])],
  ['SEO-001', new Set(['search_designs','create_design','generate_image','resize','export'])],
  ['WEB-001', new Set(['search_designs','create_design','generate_image','brand_kits','resize','export'])],
  ['APP-001', new Set(['search_designs','create_design','generate_image','brand_kits','resize','export'])],
  ['TRN-001', new Set(['search_designs','create_design','generate_image','export'])],
  ['SOCBOOT-001', new Set(['search_designs','create_design','generate_design','generate_image','brand_kits','resize','export'])],
  ['MKTBOOT-001', new Set(['search_designs','create_design','generate_design','generate_image','brand_kits','resize','export'])],
  ['SEOBOOT-001', new Set(['search_designs','create_design','generate_image','resize','export'])],
  ['APPBOOT-001', new Set(['search_designs','create_design','generate_image','brand_kits','export'])]
]);

function text(v, name, max=240) {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${name.toUpperCase()}_REQUIRED`);
  const out = v.trim();
  if (out.length > max) throw new Error(`${name.toUpperCase()}_TOO_LONG`);
  return out;
}

export function resolveCanvaCapability(request = {}) {
  for (const field of REQUIRED) text(request[field], field, field === 'idempotency_key' ? 300 : 240);
  if (request.capability_id && request.capability_id !== 'CREATIVE-CANVA-V1') throw new Error('CANVA_CAPABILITY_ID_MISMATCH');
  if (request.expected_cost_eur != null && Number(request.expected_cost_eur) !== 0) {
    return Object.freeze({ok:false, status:'HUMAN_REQUIRED', reason:'MONEY_LIMIT'});
  }
  if (request.human_required_reason && !CANONICAL_HUMAN_REQUIRED.has(request.human_required_reason)) throw new Error('NON_CANONICAL_HUMAN_REQUIRED_REASON');
  const operation = text(request.operation, 'operation', 80);
  if (!OPERATIONS.has(operation)) throw new Error('CANVA_OPERATION_UNKNOWN');
  const engineId = text(request.engine_id, 'engine_id', 120);
  const allowed = BINDINGS.get(engineId);
  if (!allowed) return Object.freeze({ok:false, status:'DENIED_UNBOUND_ENGINE', capability_id:'CREATIVE-CANVA-V1', engine_id:engineId});
  if (!allowed.has(operation)) return Object.freeze({ok:false, status:'DENIED_OPERATION', capability_id:'CREATIVE-CANVA-V1', engine_id:engineId, operation});
  if (request.provider_publish === true || request.external_publish === true) return Object.freeze({ok:false, status:'DENIED_ORIGIN_ENGINE_AUTHORITY_REQUIRED'});
  if (request.environment === 'PROD' && request.prod_binding_green !== true) return Object.freeze({ok:false, status:'HOLD_PROD_BINDING_NOT_CERTIFIED'});
  return Object.freeze({
    ok:true,
    status:'AUTHORIZED_CAPABILITY_ROUTE',
    capability_id:'CREATIVE-CANVA-V1',
    provider:'CANVA',
    transport_preference:['OFFICIAL_REMOTE_MCP','CANVA_CONNECT_REST_API','BROWSER_WHEN_PROVIDER_UI_ALLOWS'],
    company_id:request.company_id,
    engine_id:engineId,
    department_id:request.department_id || null,
    environment:request.environment,
    version:request.version,
    operation,
    expected_cost_eur:0,
    provider_publish_authorized:false,
    vault_only:true,
    audit_id:request.audit_id,
    idempotency_key:request.idempotency_key
  });
}

export function canvaFutureBindingCandidate(input = {}) {
  return Object.freeze({
    capability_id:'CREATIVE-CANVA-V1',
    factory_engine_id:'FACT-001',
    candidate_engine_id:text(input.engine_id,'engine_id',120),
    company_scope:text(input.company_scope || 'GLOBAL_OR_SCOPED','company_scope',120),
    status:'BINDING_CANDIDATE_ONLY',
    automatic_provider_authority:false,
    automatic_publish_authority:false,
    required_gates:['operation_allowlist','zero_cost_check','privacy','tests','EVA-001','JDG-001','observability','rollback','rebuild']
  });
}
