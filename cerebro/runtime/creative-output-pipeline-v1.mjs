import { routeCreativeCapability } from './creative-capability-router-v1.mjs';
import { planMultimediaTask, buildFfmpegReusePlan } from '../digital-build/multimedia-factory-runtime-v0.mjs';

const HUMAN_REQUIRED = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

const CHANNELS = new Set([
  'FACEBOOK','INSTAGRAM','LINKEDIN','TIKTOK','YOUTUBE','WHATSAPP',
  'SEO','WEB','APP','EMAIL','DOCUMENT','TRAINING','MARKETING'
]);

export const OUTPUT_PRESETS = Object.freeze({
  STATIC_POST: Object.freeze({ media_kind:'DESIGN', width:1080, height:1350, aspect_ratio:'4:5' }),
  SQUARE_POST: Object.freeze({ media_kind:'DESIGN', width:1080, height:1080, aspect_ratio:'1:1' }),
  CAROUSEL: Object.freeze({ media_kind:'DESIGN', width:1080, height:1350, aspect_ratio:'4:5', multi_page:true, min_pages:2, max_pages:20 }),
  STORY: Object.freeze({ media_kind:'DESIGN', width:1080, height:1920, aspect_ratio:'9:16' }),
  REEL: Object.freeze({ media_kind:'VIDEO', width:1080, height:1920, aspect_ratio:'9:16', captions_default:true, default_duration_sec:30 }),
  SHORT_VIDEO: Object.freeze({ media_kind:'VIDEO', width:1080, height:1920, aspect_ratio:'9:16', captions_default:true, default_duration_sec:30 }),
  LANDSCAPE_VIDEO: Object.freeze({ media_kind:'VIDEO', width:1920, height:1080, aspect_ratio:'16:9', captions_default:true, default_duration_sec:60 }),
  THUMBNAIL: Object.freeze({ media_kind:'DESIGN', width:1280, height:720, aspect_ratio:'16:9' }),
  SEO_IMAGE: Object.freeze({ media_kind:'DESIGN', width:1200, height:630, aspect_ratio:'40:21' }),
  WEB_HERO: Object.freeze({ media_kind:'DESIGN', width:1920, height:1080, aspect_ratio:'16:9' }),
  EMAIL_BANNER: Object.freeze({ media_kind:'DESIGN', width:1200, height:600, aspect_ratio:'2:1' }),
  DOCUMENT_COVER: Object.freeze({ media_kind:'DESIGN', width:1240, height:1754, aspect_ratio:'A_SERIES' }),
  APP_ASSET: Object.freeze({ media_kind:'DESIGN', width:1080, height:1080, aspect_ratio:'1:1' }),
  INFOGRAPHIC: Object.freeze({ media_kind:'DESIGN', width:1080, height:1920, aspect_ratio:'9:16' })
});

const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,199}$/;

function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label.toUpperCase()}_REQUIRED`);
  const out = value.trim();
  if (out.length > max) throw new Error(`${label.toUpperCase()}_TOO_LONG`);
  return out;
}

function ref(value, label) {
  const out = text(value, label, 200);
  if (!SAFE_REF.test(out)) throw new Error(`${label.toUpperCase()}_INVALID_REF`);
  return out;
}

function number(value, label, min, max) {
  const out = Number(value);
  if (!Number.isFinite(out) || out < min || out > max) throw new Error(`${label.toUpperCase()}_INVALID`);
  return out;
}

function humanRequired(reason, detail, extra = {}) {
  if (!HUMAN_REQUIRED.has(reason)) throw new Error('NON_CANONICAL_HUMAN_REQUIRED_REASON');
  return Object.freeze({
    ok:false,
    status:'HUMAN_REQUIRED',
    reason,
    detail,
    publish_authorized:false,
    spend_authorized:false,
    external_side_effect_executed:false,
    ...extra
  });
}

function multimediaContext(companyId) {
  return Object.freeze({
    company_id:companyId,
    engine_id:'FACT-001',
    capability_id:'DIGITAL-BUILD-MULTIMEDIA',
    environment:'PREPROD',
    version:'v0'
  });
}

function buildVideoStages(input, base, preset) {
  const mmContext = multimediaContext(base.company_id);
  const requestId = base.request_id;
  const stages = [];

  if (input.generated_visuals_required === true) {
    stages.push(planMultimediaTask({
      context:mmContext,
      request_id:`${requestId}:visuals`,
      asset_ref:`${base.asset_ref}:visuals`,
      adapter:'Z_IMAGE_TURBO',
      task_type:'IMAGE_GENERATION',
      confidence:base.confidence
    }));
  }

  if (input.voice_requested === true) {
    stages.push(planMultimediaTask({
      context:mmContext,
      request_id:`${requestId}:voice`,
      asset_ref:`${base.asset_ref}:voice`,
      adapter:'QWEN3_TTS',
      task_type:'VOICE_SYNTHESIS',
      confidence:base.confidence
    }));
  }

  stages.push(planMultimediaTask({
    context:mmContext,
    request_id:`${requestId}:video`,
    asset_ref:`${base.asset_ref}:video`,
    adapter:'HYPERFRAMES',
    task_type:'VIDEO_GENERATION',
    confidence:base.confidence
  }));

  if (input.source_clips_present === true) {
    stages.push(planMultimediaTask({
      context:mmContext,
      request_id:`${requestId}:edit`,
      asset_ref:`${base.asset_ref}:edit`,
      adapter:'OPENMONTAGE',
      task_type:'VIDEO_EDITING',
      confidence:base.confidence
    }));
  }

  stages.push(buildFfmpegReusePlan({
    context:mmContext,
    request_id:`${requestId}:compose`,
    asset_ref:`${base.asset_ref}:compose`,
    confidence:base.confidence,
    binary_presence_verified:input.ffmpeg_binary_verified === true,
    binary_version_ref:input.ffmpeg_binary_version_ref ?? null
  }));

  return Object.freeze({
    stages:Object.freeze(stages),
    duration_sec:number(input.duration_sec ?? preset.default_duration_sec ?? 30,'duration_sec',3,600),
    captions_required:input.captions_required !== false,
    voice_requested:input.voice_requested === true,
    generated_visuals_required:input.generated_visuals_required === true,
    source_clips_present:input.source_clips_present === true,
    render_policy:Object.freeze({
      deterministic:true,
      visual_identity_required:true,
      layout_before_animation:true,
      no_time_based_randomness:true,
      finite_timelines_only:true,
      separate_audio_track:true
    })
  });
}

export function buildCreativeOutputPlan(input = {}) {
  const companyId = text(input.company_id,'company_id',120);
  const targetCompanyId = input.target_company_id == null ? companyId : text(input.target_company_id,'target_company_id',120);
  if (targetCompanyId !== companyId) return humanRequired('SECURITY_INCIDENT','Cross-company creative request denied.');

  const engineId = text(input.engine_id,'engine_id',80);
  const environment = text(input.environment,'environment',40).toUpperCase();
  if (!['LAB','PREPROD','PROD'].includes(environment)) throw new Error('ENVIRONMENT_UNSUPPORTED');
  const version = text(input.version,'version',80);
  const requestId = ref(input.request_id,'request_id');
  const assetRef = ref(input.asset_ref,'asset_ref');
  const brandProfileRef = ref(input.brand_profile_ref,'brand_profile_ref');
  const briefRef = ref(input.brief_ref,'brief_ref');
  const channel = text(input.channel,'channel',40).toUpperCase();
  if (!CHANNELS.has(channel)) throw new Error('CHANNEL_UNSUPPORTED');
  const outputType = text(input.output_type,'output_type',80).toUpperCase();
  const preset = OUTPUT_PRESETS[outputType];
  if (!preset) throw new Error('OUTPUT_TYPE_UNSUPPORTED');

  const expectedCost = number(input.expected_cost_eur ?? 0,'expected_cost_eur',0,1000000);
  if (expectedCost !== 0 || input.paid_provider_requested === true || input.extra_purchase_requested === true) {
    return humanRequired('MONEY_LIMIT','Creative pipeline is zero-additional-cost-first; paid execution requires explicit economic authority.',{expected_cost_eur:expectedCost});
  }

  const confidence = number(input.confidence ?? 1,'confidence',0,1);
  if (confidence < 0.75) return humanRequired('LOW_CONFIDENCE','Creative request confidence below PREPROD threshold.');
  if (input.high_risk === true) return humanRequired('HIGH_RISK','High-risk creative request requires human review.');
  if (input.customer_human_request === true) return humanRequired('CUSTOMER_HUMAN_REQUEST','A human was explicitly requested.');

  if (environment === 'PROD' && input.prod_creative_pipeline_green !== true) {
    return Object.freeze({
      ok:false,
      status:'HOLD_CREATIVE_PIPELINE_NOT_PROD_CERTIFIED',
      company_id:companyId,
      engine_id:engineId,
      environment,
      output_type:outputType,
      publish_authorized:false,
      external_side_effect_executed:false
    });
  }

  let pageCount = 1;
  if (preset.multi_page === true) {
    pageCount = number(input.page_count ?? 6,'page_count',preset.min_pages,preset.max_pages);
  }

  const base = Object.freeze({
    company_id:companyId,
    engine_id:engineId,
    environment,
    version,
    request_id:requestId,
    asset_ref:assetRef,
    brand_profile_ref:brandProfileRef,
    brief_ref:briefRef,
    channel,
    output_type:outputType,
    confidence
  });

  const route = routeCreativeCapability({
    company_id:companyId,
    engine_id:engineId,
    environment,
    version,
    media_kind:preset.media_kind,
    expected_cost_eur:0,
    canva_native_required:input.canva_native_required === true,
    brand_kit_required:input.brand_kit_required === true,
    brand_template_required:input.brand_template_required === true,
    canva_binding_green:input.canva_binding_green === true,
    local_fallback_allowed:input.local_fallback_allowed !== false,
    prefer_local:input.prefer_local !== false,
    zero_cost_first:true,
    local_visual_prod_green:input.local_visual_prod_green === true,
    interactive_editor_required:input.interactive_editor_required === true
  });

  if (!route.ok) {
    return Object.freeze({
      ok:false,
      status:route.status,
      route,
      ...base,
      publish_authorized:false,
      external_side_effect_executed:false
    });
  }

  const video = preset.media_kind === 'VIDEO' ? buildVideoStages(input, base, preset) : null;
  const qaGates = Object.freeze([
    'BRAND_CONSISTENCY','FORMAT_DIMENSIONS','SAFE_AREA','TEXT_OVERFLOW','ACCESSIBILITY',
    ...(video?.captions_required ? ['CAPTIONS'] : []),
    'ASSET_RIGHTS','NO_RAW_SECRET_OR_PII','COST_ZERO_OR_APPROVED','CHANNEL_POLICY','EVA-001','OBSERVABILITY'
  ]);

  return Object.freeze({
    ok:true,
    status:'CREATIVE_OUTPUT_PLAN_READY',
    ...base,
    preset:Object.freeze({...preset}),
    page_count:pageCount,
    route,
    video,
    brand_gate:Object.freeze({required:true,brand_profile_ref:brandProfileRef,generic_unbranded_output_forbidden:true}),
    qa_gates:qaGates,
    export_required:true,
    publication:Object.freeze({
      requested:input.publish_requested === true,
      authorized:false,
      authority_owner:engineId,
      rule:'CREATIVE_PIPELINE_NEVER_GRANTS_PUBLISH_SEND_OR_SPEND_AUTHORITY'
    }),
    expected_cost_eur:0,
    additional_cost_eur:0,
    paid_provider_authorized:false,
    publish_authorized:false,
    send_authorized:false,
    spend_authorized:false,
    external_side_effect_executed:false
  });
}

export function listCreativeOutputCatalog() {
  return Object.freeze({
    status:'CREATIVE_OUTPUT_CATALOG_READY',
    channels:Object.freeze([...CHANNELS]),
    outputs:OUTPUT_PRESETS,
    shared_capabilities:Object.freeze(['CREATIVE-CANVA-V1','CREATIVE-VISUAL-LOCAL-V1','CREATIVE-VIDEO-EDITOR-V1','DIGITAL-BUILD-MULTIMEDIA']),
    default_additional_cost_eur:0,
    publication_authority:false
  });
}
