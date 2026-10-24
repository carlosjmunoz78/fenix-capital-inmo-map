const ENGINE_ID='MOTION-001';
const STATES=new Set(['IDLE','LISTENING','PROCESSING','SPEAKING','HUMAN_REQUIRED','DEGRADED','ERROR']);
const HUMAN_REASONS=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

export const MOTION_VISUAL_ASSET_ROLE=Object.freeze({
  IDLE:'STATE_IDLE_HERO_V1',
  LISTENING:'STATE_LISTENING_V0',
  PROCESSING:'STATE_PROCESSING_V1',
  SPEAKING:'STATE_SPEAKING_V0',
  HUMAN_REQUIRED:'STATE_HUMAN_REQUIRED_V1',
  DEGRADED:'STATE_IDLE_V0',
  ERROR:'STATE_IDLE_V0'
});

const OVERLAY=Object.freeze({
  IDLE:{semantic:'NORMAL',accent:'BLUE_CYAN',intensity:0.34},
  LISTENING:{semantic:'RECEPTIVE',accent:'CYAN',intensity:0.58},
  PROCESSING:{semantic:'MULTI_REGION_ACTIVE',accent:'BLUE_CYAN_WHITE',intensity:0.76},
  SPEAKING:{semantic:'OUTPUT_ACTIVE',accent:'CYAN_WHITE',intensity:0.68},
  HUMAN_REQUIRED:{semantic:'HUMAN_REQUIRED',accent:'AMBER_WHITE',intensity:0.72},
  DEGRADED:{semantic:'DEGRADED',accent:'LOW_BLUE',intensity:0.24},
  ERROR:{semantic:'ERROR_LOCALIZED',accent:'RED_FOCAL',intensity:0.38}
});

function requiredText(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim()}
function normalizeState(v){const s=requiredText(v,'state').toUpperCase();if(!STATES.has(s))throw new Error('unsupported visual state');return s}

export function resolveVisualAssetRole(rawState,{reduced_motion=false}={}){
  const state=normalizeState(rawState);
  return Object.freeze({
    state,
    asset_role:MOTION_VISUAL_ASSET_ROLE[state],
    static_safe:true,
    reduced_motion:Boolean(reduced_motion),
    overlay:OVERLAY[state],
    requires_generated_dedicated_asset:['DEGRADED','ERROR'].includes(state),
    fallback_is_usable_now:true
  });
}

export function buildVisualStateDescriptor({company_id,state,environment='PREPROD',version='v1',reduced_motion=false,human_required_reason=null,engine_id=ENGINE_ID}={}){
  const company=requiredText(company_id,'company_id');
  const env=requiredText(environment,'environment').toUpperCase();
  if(!['LAB','PREPROD'].includes(env))throw new Error('visual adapter refuses non-LAB/PREPROD environment');
  const visualState=normalizeState(state);
  if(engine_id!==ENGINE_ID)throw new Error('engine_id mismatch');
  if(visualState==='HUMAN_REQUIRED'){
    const reason=requiredText(human_required_reason,'human_required_reason');
    if(!HUMAN_REASONS.has(reason))throw new Error('noncanonical HUMAN_REQUIRED reason');
  }
  const visual=resolveVisualAssetRole(visualState,{reduced_motion});
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_MOTION_VISUAL_DESCRIPTOR',
    company_id:company,
    engine_id:ENGINE_ID,
    environment:env,
    version:requiredText(version,'version'),
    state:visualState,
    visual,
    human_required_reason:visualState==='HUMAN_REQUIRED'?human_required_reason:null,
    transition:reduced_motion?'STATIC_SWAP':'CROSSFADE',
    raw_content_required:false,
    customer_pii_required:false,
    secret_payload_required:false,
    prod_authorized:false,
    prod_write_authorized:false,
    automatic_promotion:false,
    trading_access:false,
    additional_cost_eur:0
  });
}

export function buildEngineActivationVisualEvent({company_id,engine_id,environment='PREPROD',version='v1',region_id,event_type='ENGINE_ACTIVE',state='PROCESSING',intensity=0.5,route_from=null,route_to=null,confidence_band='UNKNOWN',human_required_reason=null}={}){
  const company=requiredText(company_id,'company_id');
  const engine=requiredText(engine_id,'engine_id');
  const env=requiredText(environment,'environment').toUpperCase();
  if(!['LAB','PREPROD'].includes(env))throw new Error('visual event refuses non-LAB/PREPROD environment');
  const region=requiredText(region_id,'region_id');
  const s=normalizeState(state);
  const n=Number(intensity);if(!Number.isFinite(n)||n<0||n>1)throw new Error('intensity invalid');
  if(s==='HUMAN_REQUIRED'&&!HUMAN_REASONS.has(human_required_reason??''))throw new Error('noncanonical HUMAN_REQUIRED reason');
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_VISUAL_ENGINE_EVENT',
    company_id:company,
    engine_id:engine,
    environment:env,
    version:requiredText(version,'version'),
    event_type:requiredText(event_type,'event_type'),
    state:s,
    intensity:Math.round(n*1000)/1000,
    region_id:region,
    route_from:route_from?requiredText(route_from,'route_from'):null,
    route_to:route_to?requiredText(route_to,'route_to'):null,
    confidence_band:requiredText(confidence_band,'confidence_band').toUpperCase(),
    human_required_reason:s==='HUMAN_REQUIRED'?human_required_reason:null,
    raw_content:null,
    secret_payload:null,
    customer_pii:null,
    prod_authorized:false,
    prod_write_authorized:false,
    automatic_promotion:false,
    trading_access:false,
    additional_cost_eur:0
  });
}
