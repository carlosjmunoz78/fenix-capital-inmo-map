/**
 * UMS-001 Universal Media Request V1 — pure, deterministic, zero-cost LAB planner.
 * All callers MUST be authenticated by CEREBRO Gateway and bound to a trusted
 * engine registry before invoking this API. This is not an auth endpoint.
 * No network, external IO, provider execution, publication, secrets or production.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const base = new URL('../', import.meta.url);
const defaultProfiles = JSON.parse(readFileSync(new URL('registry/media-consumers-universal-v1.json', base), 'utf8'));
const SHA = /^[0-9a-f]{64}$/;
const ID = /^[A-Z][A-Z0-9-]{2,63}$/;
const STR = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const COMPANY = /^[a-z][a-z0-9-]{1,62}$/;
const SEGMENT = /^[A-Z][A-Z0-9_]{1,79}$/;
const CAPABILITY = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*)*$/;
const REF = /^(cerebro|artifact):[A-Za-z0-9/_:.#-]{4,250}$/;
const REPLY = /^cerebro:\/\/events\/[A-Za-z0-9/_-]{4,200}$/;
const POLICY = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const KINDS = Object.freeze(['IMAGE','VIDEO','AUDIO','AV_PACKAGE','THREED','VFX','ADAPTATION']);
const TRIGGERS = Object.freeze(['ENGINE_EVENT','CHATGPT','CONSOLE']);
const RIGHTS = Object.freeze(['SYNTHETIC_ORIGINAL','LICENSED_LIBRARY','OWNED_ASSET','AUTHORIZED_PERSON']);
const PRIORITY = Object.freeze(['NORMAL','HIGH','CRITICAL']);
const MIMES = Object.freeze(['image/png','image/jpeg','image/webp','video/mp4','audio/wav','audio/mpeg','application/zip','model/gltf-binary']);
const REQUEST_KEYS = Object.freeze(['schema_version','event_type','request_id','company_id','engine_id','origin_engine_id',
  'environment','version','trigger','asset_kind','capability_id','consumer_engine_id','channel_id','placement',
  'brief_ref','format','rights_profile','priority','requested_at_utc','deadline_utc','policy_version','budget','reply_to']);
const FORMAT_KEYS = Object.freeze(['profile_id','width_px','height_px','duration_seconds','output_mime']);
const BUDGET_KEYS = Object.freeze(['max_additional_cost_eur','max_attempts','prepaid_only',
  'paid_execution_enabled','auto_recharge','publish_requested']);
export const MEDIA_EVENTS = Object.freeze({
  request:'MEDIA_JOB_REQUESTED',
  accepted:'UMS001_ORDER_ACCEPTED', held:'UMS001_ORDER_HELD',
  qa:'UMS001_ASSET_QA_PENDING', delivered:'UMS001_ASSET_DELIVERED',
  failed:'UMS001_JOB_FAILED', human:'UMS001_HUMAN_REQUIRED'
});
export const LEGACY_REQUEST_EVENTS = Object.freeze({
  SOCIAL_CONTENT_REQUESTED:MEDIA_EVENTS.request,
  SEO_MEDIA_REQUESTED:MEDIA_EVENTS.request
});
const identicalKeys = (value,keys)=>value && typeof value==='object' && !Array.isArray(value) &&
  JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());
const isDate=(v)=>typeof v==='string'&&TIME.test(v)&&Number.isFinite(Date.parse(v));
const isInt=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
function fail(reason) {throw new Error('UMS001_UNIVERSAL_'+reason);}
function hold(code,reason) {return Object.freeze({state:'HUMAN_REQUIRED',exception:code,
  reason,dispatch_authorized:false,provider_calls_authorized:false,
  publication_authorized:false,delivery_authorized:false,additional_cost_eur:0});}

/**
 * Structural validation is intentionally independent of JSON-schema libraries.
 * JSON schema remains the wire authority; this catches invalid input in the
 * offline planner and is tested against its required keys.
 */
export function validateMediaRequest(request) {
  const r=request;
  if(!identicalKeys(r,REQUEST_KEYS))fail('REQUEST_SCHEMA');
  if(r.schema_version!=='1.0.0'||r.event_type!==MEDIA_EVENTS.request||r.engine_id!=='UMS-001'||
    r.environment!=='LAB'||!COMPANY.test(r.company_id||'')||!ID.test(r.origin_engine_id||'')||
    !ID.test(r.consumer_engine_id||'')||!STR.test(r.request_id||'')||
    !/^\d+\.\d+\.\d+$/.test(r.version||''))fail('REQUEST_SCOPE');
  if(!TRIGGERS.includes(r.trigger)||!KINDS.includes(r.asset_kind)||
    typeof r.capability_id!=='string'||r.capability_id.length>80||
    !CAPABILITY.test(r.capability_id)||!r.capability_id.startsWith(r.asset_kind+'.'))
    fail('CAPABILITY');
  if(!SEGMENT.test(r.channel_id||'')||!SEGMENT.test(r.placement||'')||
    !REF.test(r.brief_ref||'')||!REPLY.test(r.reply_to||'')||
    !POLICY.test(r.policy_version||'')||!RIGHTS.includes(r.rights_profile)||
    !PRIORITY.includes(r.priority))fail('REQUEST_FIELDS');
  if(!isDate(r.requested_at_utc)||!(r.deadline_utc===null||isDate(r.deadline_utc)))
    fail('REQUEST_TIME');
  if(!identicalKeys(r.format,FORMAT_KEYS))fail('FORMAT_SCHEMA');
  const f=r.format;
  if(!SEGMENT.test(f.profile_id||'')||
    !(f.width_px===null||isInt(f.width_px,64,16384))||
    !(f.height_px===null||isInt(f.height_px,64,16384))||
    !(f.duration_seconds===null||isInt(f.duration_seconds,1,3600))||
    !MIMES.includes(f.output_mime))fail('FORMAT_FIELDS');
  if((r.asset_kind==='IMAGE'&&(!f.output_mime.startsWith('image/')||f.width_px===null||f.height_px===null||f.duration_seconds!==null))||
    (r.asset_kind==='VIDEO'&&(!f.output_mime.startsWith('video/')||f.width_px===null||f.height_px===null||f.duration_seconds===null))||
    (r.asset_kind==='AUDIO'&&(!f.output_mime.startsWith('audio/')||f.duration_seconds===null))||
    (r.asset_kind==='THREED'&&f.output_mime!=='model/gltf-binary')||
    (r.asset_kind==='AV_PACKAGE'&&f.output_mime!=='application/zip'))fail('FORMAT_KIND_MISMATCH');
  if(!identicalKeys(r.budget,BUDGET_KEYS))fail('BUDGET_SCHEMA');
  const b=r.budget;
  if(typeof b.max_additional_cost_eur!=='number'||!Number.isFinite(b.max_additional_cost_eur)||
    b.max_additional_cost_eur<0||!isInt(b.max_attempts,1,3)||
    ['prepaid_only','paid_execution_enabled','auto_recharge','publish_requested'].some(x=>typeof b[x]!=='boolean'))
    fail('BUDGET_FIELDS');
  return r;
}
export function idempotencyKey(r) {
  validateMediaRequest(r);
  return createHash('sha256').update([r.company_id,r.environment,r.origin_engine_id,
    r.request_id,r.consumer_engine_id].join('\0')).digest('hex');
}
/**
 * trustedIdentity + trustedEngineRegistry MUST be supplied by Gateway internal
 * code, not reconstructed from a request payload. The function is a policy
 * preflight, not a cryptographic verification or dispatch.
 */
export function planUniversalMediaRequest(request, {trustedIdentity, trustedEngineRegistry,
  profiles=defaultProfiles, nowUtc}={}) {
  const r=validateMediaRequest(request);
  if(!trustedIdentity||trustedIdentity.gateway_authenticated!==true||
     trustedIdentity.trust_source!=='CEREBRO_GATEWAY_IAM'||trustedIdentity.active!==true)
    return hold('SECURITY_INCIDENT','MISSING_GATEWAY_IAM');
  if(trustedIdentity.company_id!==r.company_id||trustedIdentity.environment!==r.environment||
     trustedIdentity.engine_id!==r.origin_engine_id)
    return hold('POLICY_CONFLICT','IAM_SCOPE_MISMATCH');
  const engine=trustedEngineRegistry?.[r.origin_engine_id];
  const consumer=trustedEngineRegistry?.[r.consumer_engine_id];
  if(!engine||engine.media_consumer_enabled!==true||engine.company_id!==r.company_id||
     engine.environment!==r.environment||engine.status!=='ACTIVE_VERIFIED'||!consumer||
     consumer.company_id!==r.company_id||consumer.environment!==r.environment||
     consumer.status!=='ACTIVE_VERIFIED')
    return hold('POLICY_CONFLICT','ENGINE_NOT_REGISTERED_OR_VERIFIED');
  if(!Array.isArray(engine.allowed_asset_kinds)||!engine.allowed_asset_kinds.includes(r.asset_kind))
    return hold('POLICY_CONFLICT','ASSET_KIND_NOT_AUTHORIZED');
  if(!Array.isArray(engine.allowed_consumer_engines)||
     !engine.allowed_consumer_engines.includes(r.consumer_engine_id))
    return hold('POLICY_CONFLICT','CONSUMER_ROUTE_NOT_AUTHORIZED');
  if(!Array.isArray(engine.allowed_channels)||!engine.allowed_channels.includes(r.channel_id))
    return hold('POLICY_CONFLICT','CHANNEL_NOT_AUTHORIZED');
  if(r.trigger==='CHATGPT'&&!(trustedIdentity.actor_kind==='OWNER_CHATGPT'&&
    trustedIdentity.explicit_order_authorized===true))
    return hold('POLICY_CONFLICT','CHATGPT_ORDER_AUTH_REQUIRED');
  if(r.trigger==='CONSOLE'&&trustedIdentity.actor_kind!=='CONSOLE_SESSION')
    return hold('POLICY_CONFLICT','CONSOLE_SESSION_AUTH_REQUIRED');
  if(r.trigger==='ENGINE_EVENT'&&trustedIdentity.actor_kind!=='ENGINE_SERVICE')
    return hold('POLICY_CONFLICT','ENGINE_EVENT_AUTH_REQUIRED');
  if(r.budget.max_additional_cost_eur!==0||r.budget.paid_execution_enabled||
    r.budget.auto_recharge||r.budget.publish_requested||r.budget.prepaid_only!==true||
    r.budget.max_attempts>2)
    return hold('MONEY_LIMIT','LAB_FINOPS_OR_PUBLICATION_POLICY');
  if(r.rights_profile==='AUTHORIZED_PERSON')
    return hold('LEGAL_REQUIRED','PERSON_RIGHTS_EVIDENCE_REQUIRED');
  if(!profiles||profiles.engine_id!=='UMS-001'||profiles.environment!=='LAB'||
    !profiles.profiles||!Object.hasOwn(profiles.profiles,r.channel_id))
    return hold('POLICY_CONFLICT','CHANNEL_PROFILE_NOT_REGISTERED');
  const profile=profiles.profiles[r.channel_id];
  if(profile.status==='DISABLED'||profile.status==='REVOKED')
    return hold('POLICY_CONFLICT','CHANNEL_PROFILE_DISABLED');
  if(!Array.isArray(profile.placements)||
     !(profile.placements.includes(r.placement)||profile.placements.includes('ANY_REGISTERED_PLACEMENT')))
    return hold('LOW_CONFIDENCE','PLACEMENT_PROFILE_NOT_DEFINED');
  const now=typeof nowUtc==='string'?Date.parse(nowUtc):NaN;
  if(!Number.isFinite(now))return hold('LOW_CONFIDENCE','TRUSTED_CLOCK_REQUIRED');
  if(r.deadline_utc!==null&&Date.parse(r.deadline_utc)<=now)
    return hold('LOW_CONFIDENCE','DEADLINE_EXPIRED');
  const key=idempotencyKey(r);
  if(!SHA.test(key))fail('IDEMPOTENCY_UNEXPECTED');
  return Object.freeze({
    state:'LAB_REQUEST_VALIDATED_NO_DISPATCH',event_type:MEDIA_EVENTS.request,
    company_id:r.company_id,engine_id:r.engine_id,origin_engine_id:r.origin_engine_id,
    consumer_engine_id:r.consumer_engine_id,environment:r.environment,
    request_id:r.request_id,asset_kind:r.asset_kind,capability_id:r.capability_id,
    channel_id:r.channel_id,placement:r.placement,format_profile_id:r.format.profile_id,
    idempotency_key:key,rights_gate:'PENDING',visual_qa:'PENDING',
    producer_execution:'NOT_AUTHORIZED_BY_THIS_PLANNER',
    gateway_delivery:'NOT_CONNECTED',channel_status:profile.status,
    dispatch_authorized:false,provider_calls_authorized:false,
    publication_authorized:false,delivery_authorized:false,additional_cost_eur:0,
    next_event_on_durable_accept:MEDIA_EVENTS.accepted,
    reply_to:r.reply_to
  });
}
/** Boundary adapter; legacy producer must supply every universal field or fail. */
export function normalizeMediaRequestEvent(event) {
  if(!event||typeof event!=='object'||Array.isArray(event)||!event.payload)
    fail('EVENT_ENVELOPE');
  const expected=LEGACY_REQUEST_EVENTS[event.type]||event.type;
  if(expected!==MEDIA_EVENTS.request)fail('UNKNOWN_EVENT_TYPE');
  const normalized={...event.payload,event_type:MEDIA_EVENTS.request};
  validateMediaRequest(normalized);
  return Object.freeze(normalized);
}
/**
 * FACT-001 scaffold descriptor: declares a capability for a new engine
 * without granting credentials or registering a live route.
 */
export function scaffoldMediaConsumer(engine, {companyId,environment='LAB'}={}) {
  if(!ID.test(engine||'')||!COMPANY.test(companyId||'')||!['LAB','PREPROD','PROD'].includes(environment))
    fail('SCAFFOLD_SCOPE');
  return Object.freeze({
    company_id:companyId,engine_id:engine,environment,version:'1.0.0',
    optional_consumed_capability:'CEREBRO.UMS001.MEDIA_REQUEST.V1',
    request_event:MEDIA_EVENTS.request,accepted_event:MEDIA_EVENTS.accepted,
    delivered_event:MEDIA_EVENTS.delivered,failed_event:MEDIA_EVENTS.failed,
    human_event:MEDIA_EVENTS.human,
    target_engine_id:'UMS-001',default_channel_id:'GENERIC',
    consumer_hook_state:'SCAFFOLDED_NOT_CONNECTED',
    gateway_iam_authorized:false,allow_paid_execution:false,
    allow_automatic_publication:false,additional_cost_eur:0
  });
}
