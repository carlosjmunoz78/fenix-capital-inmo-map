import { planMultimediaTask } from './multimedia-factory-runtime-v0.mjs';

const ENVIRONMENT = 'PREPROD';
const OWNER_ENGINE = 'FACT-001';
const MULTIMEDIA_CAPABILITY = 'DIGITAL-BUILD-MULTIMEDIA';
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const CANVA_TASKS = new Set([
  'SOCIAL_POST_DESIGN','CAROUSEL_DESIGN','STORY_DESIGN','REEL_COVER_DESIGN',
  'THUMBNAIL_DESIGN','SEO_INFOGRAPHIC','BLOG_VISUAL','LANDING_VISUAL',
  'EMAIL_VISUAL','DOCUMENT_VISUAL','PRESENTATION_VISUAL','AD_CREATIVE'
]);

const MULTIMEDIA_TASKS = new Set([
  'IMAGE_GENERATION','VOICE_SYNTHESIS','VIDEO_GENERATION','VIDEO_EDITING',
  'VIDEO_UNDERSTANDING','MEDIA_COMPOSITION','EXPLAINER_VIDEO','VISUAL_WORKFLOW'
]);

function text(value, label, max = 200) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new TypeError(`${label} too long`);
  return out;
}

function safeRef(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new TypeError(`${label} invalid`);
  return out;
}

function block(code, reason, detail) {
  if (!HUMAN_REQUIRED.has(reason)) throw new Error('noncanonical HUMAN_REQUIRED reason');
  return Object.freeze({
    allowed: false,
    status: 'BLOCKED',
    code,
    blocker: 'HUMAN_REQUIRED',
    human_required_reason: reason,
    detail,
    external_side_effect_executed: false,
    external_publication_authorized: false,
    prod_authorized: false
  });
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('request object required');
  const request = Object.freeze({
    request_id: safeRef(raw.request_id, 'request_id'),
    company_id: text(raw.company_id, 'company_id', 120),
    target_company_id: raw.target_company_id == null ? text(raw.company_id, 'company_id', 120) : text(raw.target_company_id, 'target_company_id', 120),
    requester_engine_id: text(raw.requester_engine_id, 'requester_engine_id', 100),
    environment: text(raw.environment, 'environment', 40).toUpperCase(),
    creative_task_type: text(raw.creative_task_type, 'creative_task_type', 100).toUpperCase(),
    asset_ref: safeRef(raw.asset_ref, 'asset_ref'),
    requested_provider: raw.requested_provider == null ? null : text(raw.requested_provider, 'requested_provider', 80).toUpperCase(),
    confidence: raw.confidence == null ? 1 : Number(raw.confidence),
    high_risk: raw.high_risk === true,
    customer_human_request: raw.customer_human_request === true,
    prod_write_requested: raw.prod_write_requested === true,
    publish_requested: raw.publish_requested === true,
    spend_requested: raw.spend_requested === true
  });
  if (!Number.isFinite(request.confidence) || request.confidence < 0 || request.confidence > 1) throw new TypeError('confidence invalid');
  return request;
}

function commonGate(request) {
  if (request.environment !== ENVIRONMENT) return block('ENVIRONMENT_DENIED', 'POLICY_CONFLICT', 'Shared creative router V1 accepts PREPROD only.');
  if (request.company_id !== request.target_company_id) return block('COMPANY_SCOPE_MISMATCH', 'SECURITY_INCIDENT', 'Cross-company creative execution denied.');
  if (request.confidence < 0.75) return block('LOW_CONFIDENCE', 'LOW_CONFIDENCE', 'Confidence below PREPROD threshold.');
  if (request.high_risk) return block('HIGH_RISK', 'HIGH_RISK', 'High-risk creative request requires human handling.');
  if (request.customer_human_request) return block('CUSTOMER_HUMAN_REQUEST', 'CUSTOMER_HUMAN_REQUEST', 'Customer explicitly requested a human.');
  if (request.prod_write_requested) return block('PROD_WRITE_DISABLED', 'POLICY_CONFLICT', 'Shared creative router V1 cannot write PROD.');
  if (request.publish_requested) return block('PUBLICATION_AUTHORITY_SEPARATE', 'POLICY_CONFLICT', 'Creative production does not imply external publication authority.');
  if (request.spend_requested) return block('SPEND_NOT_AUTHORIZED', 'MONEY_LIMIT', 'New creative spend requires MONEY_LIMIT approval.');
  return Object.freeze({ allowed: true });
}

function chooseMultimediaAdapter(taskType, requestedProvider) {
  if (requestedProvider) return requestedProvider;
  switch (taskType) {
    case 'IMAGE_GENERATION': return 'COMFYUI';
    case 'VOICE_SYNTHESIS': return 'QWEN3_TTS';
    case 'VIDEO_GENERATION': return 'HYPERFRAMES';
    case 'VIDEO_EDITING': return 'OPENMONTAGE';
    case 'VIDEO_UNDERSTANDING': return 'WATCH';
    case 'MEDIA_COMPOSITION': return 'FFMPEG';
    case 'EXPLAINER_VIDEO': return 'PROCEDURAL_FILM';
    case 'VISUAL_WORKFLOW': return 'COMFYUI';
    default: throw new Error(`unsupported multimedia task: ${taskType}`);
  }
}

export function routeCreativeTask(raw = {}) {
  const request = normalize(raw);
  const gate = commonGate(request);
  if (!gate.allowed) return gate;

  if (CANVA_TASKS.has(request.creative_task_type)) {
    return Object.freeze({
      allowed: true,
      status: 'CREATIVE_ROUTE_READY_CANVA',
      request_id: request.request_id,
      company_id: request.company_id,
      requester_engine_id: request.requester_engine_id,
      owner_engine_id: OWNER_ENGINE,
      capability_family: 'DIGITAL_BUILD_CREATIVE',
      selected_route: 'CANVA_REMOTE_MCP',
      selected_provider: 'CANVA',
      provider_state: 'PENDING_INITIAL_CANVA_OAUTH',
      creative_task_type: request.creative_task_type,
      asset_ref: request.asset_ref,
      environment: ENVIRONMENT,
      brand_context_required_when_available: true,
      qa_required: true,
      license_check_required: true,
      external_publication_authorized: false,
      provider_side_effect_authorized: false,
      prod_authorized: false,
      additional_cost_eur: 0,
      external_side_effect_executed: false
    });
  }

  if (MULTIMEDIA_TASKS.has(request.creative_task_type)) {
    const adapter = chooseMultimediaAdapter(request.creative_task_type, request.requested_provider);
    const plan = planMultimediaTask({
      context: {
        company_id: request.company_id,
        engine_id: OWNER_ENGINE,
        capability_id: MULTIMEDIA_CAPABILITY,
        environment: ENVIRONMENT,
        version: 'shared-creative-router-v1'
      },
      target_company_id: request.company_id,
      confidence: request.confidence,
      request_id: request.request_id,
      asset_ref: request.asset_ref,
      adapter,
      task_type: request.creative_task_type,
      prod_write_requested: false,
      high_risk: false,
      customer_human_request: false,
      install_requested: false,
      download_model_requested: false,
      external_process_requested: false,
      network_call_requested: false,
      purchase_requested: false,
      subscription_requested: false,
      paid_api_requested: false
    });
    if (!plan.allowed) return plan;
    return Object.freeze({
      ...plan,
      status: 'CREATIVE_ROUTE_READY_MULTIMEDIA',
      requester_engine_id: request.requester_engine_id,
      owner_engine_id: OWNER_ENGINE,
      capability_family: 'DIGITAL_BUILD_CREATIVE',
      selected_route: MULTIMEDIA_CAPABILITY,
      creative_task_type: request.creative_task_type,
      external_publication_authorized: false,
      provider_side_effect_authorized: false
    });
  }

  return block('UNSUPPORTED_CREATIVE_TASK', 'POLICY_CONFLICT', `Unsupported creative_task_type: ${request.creative_task_type}`);
}

export function listSharedCreativeCapabilities(raw = {}) {
  const companyId = text(raw.company_id, 'company_id', 120);
  const environment = text(raw.environment, 'environment', 40).toUpperCase();
  if (environment !== ENVIRONMENT) return block('ENVIRONMENT_DENIED', 'POLICY_CONFLICT', 'Shared creative capability catalog V1 is PREPROD only.');
  return Object.freeze({
    allowed: true,
    status: 'SHARED_CREATIVE_CAPABILITIES_READY',
    company_id: companyId,
    owner_engine_id: OWNER_ENGINE,
    environment: ENVIRONMENT,
    consumer_policy: 'ANY_REGISTERED_ENGINE_WITH_COMPANY_ENVIRONMENT_PERMISSION',
    capabilities: Object.freeze({
      CANVA_DESIGN: [...CANVA_TASKS],
      MULTIMEDIA_FACTORY: [...MULTIMEDIA_TASKS]
    }),
    external_publication_authorized: false,
    prod_authorized: false,
    additional_cost_eur: 0
  });
}
