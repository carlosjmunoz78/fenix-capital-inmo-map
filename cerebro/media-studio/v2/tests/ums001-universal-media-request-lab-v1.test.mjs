import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  validateMediaRequest, idempotencyKey, planUniversalMediaRequest,
  normalizeMediaRequestEvent, scaffoldMediaConsumer, MEDIA_EVENTS
} from '../runtime/ums001_universal_media_request_lab_v1.mjs';
const schema=JSON.parse(readFileSync(new URL('../contracts/media-job-request.v1.schema.json',import.meta.url),'utf8'));
const profile=JSON.parse(readFileSync(new URL('../registry/media-consumers-universal-v1.json',import.meta.url),'utf8'));
const now='2026-11-12T11:20:00Z';
function order(changes={}) {
 const o={
  schema_version:'1.0.0', event_type:'MEDIA_JOB_REQUESTED',request_id:'UMS001-REQ-0000001',
  company_id:'fenix',engine_id:'UMS-001',origin_engine_id:'SOC-001',environment:'LAB',
  version:'1.0.0',trigger:'ENGINE_EVENT',asset_kind:'IMAGE',capability_id:'IMAGE.SYNTHETIC',
  item_id:'IG-FEED-01',consumer_engine_id:'SOC-001',channel_id:'INSTAGRAM',placement:'FEED',
  brief_ref:'cerebro://briefs/media/ig-feed-01',
  format:{profile_id:'IG_FEED_4_5',width_px:1080,height_px:1350,duration_seconds:null,output_mime:'image/png'},
  rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',requested_at_utc:'2026-11-12T11:17:00Z',
  deadline_utc:null,policy_version:'ums001-policy-v1',
  budget:{max_additional_cost_eur:0,max_attempts:2,prepaid_only:true,
    paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
  reply_to:'cerebro://events/media/ums001',
 };
 return {...o,...changes};
}
function engine(id, channels) {
 return {company_id:'fenix',environment:'LAB',status:'ACTIVE_VERIFIED',
  media_consumer_enabled:true,allowed_asset_kinds:['IMAGE','VIDEO','AUDIO','AV_PACKAGE','THREED','VFX','ADAPTATION'],
  allowed_consumer_engines:['SOC-001','SEO-001','MKT-777'],
  allowed_channels:channels};
}
const engines={
 'SOC-001':engine('SOC-001',['INSTAGRAM','FACEBOOK','LINKEDIN','YOUTUBE','TIKTOK']),
 'SEO-001':engine('SEO-001',['SEO']),
 'MKT-777':engine('MKT-777',['GENERIC']),
};
const identity=(id='SOC-001',trigger='ENGINE_EVENT')=>({
 gateway_authenticated:true,trust_source:'CEREBRO_GATEWAY_IAM',
 active:true,engine_id:id,company_id:'fenix',environment:'LAB',
 actor_kind:trigger==='CHATGPT'?'OWNER_CHATGPT':trigger==='CONSOLE'?'CONSOLE_SESSION':'ENGINE_SERVICE',
 explicit_order_authorized:trigger==='CHATGPT'?true:undefined});
function ctx(id='SOC-001',trigger='ENGINE_EVENT') {return {trustedIdentity:identity(id,trigger),trustedEngineRegistry:engines,nowUtc:now};}
function mutate(o,part) {return {...o,...part};}

test('wire schema and deterministic runtime require exactly same top-level fields',()=>{
 const o=order();assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
 assert.equal(schema.additionalProperties,false);
 assert.deepEqual([...schema.required].sort(),Object.keys(o).sort());
 assert.equal(validateMediaRequest(o),o);
 assert.throws(()=>validateMediaRequest({...o,admin_override:true}),/REQUEST_SCHEMA/);
 for(const key of schema.required) {
  const copy={...o};delete copy[key];
  assert.throws(()=>validateMediaRequest(copy),/UMS001_UNIVERSAL_/,key);
 }
});
test('Social Instagram internal event produces LAB-only planning, no dispatch/publication',()=>{
 const o=order(),p=planUniversalMediaRequest(o,ctx());
 assert.equal(p.state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');
 assert.equal(p.channel_id,'INSTAGRAM');assert.equal(p.item_id,'IG-FEED-01');
 assert.equal(p.idempotency_key,idempotencyKey(o));
 for(const k of ['dispatch_authorized','provider_calls_authorized','publication_authorized','delivery_authorized'])
  assert.equal(p[k],false,k);
 assert.equal(p.additional_cost_eur,0);
 assert.equal(p.next_event_on_durable_accept,MEDIA_EVENTS.accepted);
});
test('SEO request uses same contract, same validator, different channel profile',()=>{
 const o=order({origin_engine_id:'SEO-001',consumer_engine_id:'SEO-001',channel_id:'SEO',
  placement:'HERO',item_id:'SEO-HERO-01',capability_id:'IMAGE.PHOTOGRAPHY',
  format:{profile_id:'SEO_HERO_16_9',width_px:1600,height_px:900,duration_seconds:null,output_mime:'image/webp'}});
 const p=planUniversalMediaRequest(o,ctx('SEO-001'));assert.equal(p.state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');
 assert.equal(p.channel_status,'EXISTING_CONTRACT_NOT_CONNECTED');
});
test('Facebook LinkedIn are profiles not separate producer runtimes',()=>{
 for(const [channel,place] of [['FACEBOOK','FEED'],['LINKEDIN','CAROUSEL']]) {
  const p=planUniversalMediaRequest(order({channel_id:channel,placement:place}),ctx());
  assert.equal(p.state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');assert.equal(p.dispatch_authorized,false);
 }
});
test('future YouTube/TikTok video profiles accept planning but never claim adapter connected',()=>{
 for(const [channel,placement] of [['YOUTUBE','SHORT'],['TIKTOK','SHORT']]){
  const o=order({channel_id:channel,placement,asset_kind:'VIDEO',capability_id:'VIDEO.SHORT',
    item_id:'SHORT-0001',format:{profile_id:'VERTICAL_9_16',width_px:1080,height_px:1920,
      duration_seconds:25,output_mime:'video/mp4'}});
  const p=planUniversalMediaRequest(o,ctx());
  assert.equal(p.state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');
  assert.equal(p.channel_status,'FUTURE_ADAPTER_NOT_CONNECTED');
  assert.equal(p.provider_calls_authorized,false);
 }
});
test('any new FACT-001 engine receives only a disabled scaffold hook; generic request is universal',()=>{
 const hook=scaffoldMediaConsumer('MKT-777',{companyId:'fenix'});
 assert.equal(hook.gateway_iam_authorized,false);
 assert.equal(hook.consumer_hook_state,'SCAFFOLDED_NOT_CONNECTED');
 assert.equal(hook.request_event,MEDIA_EVENTS.request);
 const o=order({origin_engine_id:'MKT-777',consumer_engine_id:'MKT-777',
  channel_id:'GENERIC',placement:'SPECIAL_POSTER',item_id:'MKT-POSTER-01'});
 const p=planUniversalMediaRequest(o,ctx('MKT-777'));
 assert.equal(p.state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');assert.equal(p.channel_id,'GENERIC');
});
test('legacy Social and SEO intake events map to same canonical request without privileged flags',()=>{
 const social=normalizeMediaRequestEvent({type:'SOCIAL_CONTENT_REQUESTED',payload:order()});
 assert.equal(social.event_type,MEDIA_EVENTS.request);
 const seo=normalizeMediaRequestEvent({type:'SEO_MEDIA_REQUESTED',payload:order({origin_engine_id:'SEO-001',
  consumer_engine_id:'SEO-001',channel_id:'SEO',placement:'BODY',item_id:'SEO-BODY-01'})});
 assert.equal(seo.event_type,MEDIA_EVENTS.request);
 assert.throws(()=>normalizeMediaRequestEvent({type:'CRON_MEDIA_REQUESTED',payload:order()}),/UNKNOWN_EVENT_TYPE/);
});
test('idempotency is stable per request and distinct per piece/tenant/environment/engine',()=>{
 const a=order(),b=order({item_id:'IG-FEED-02'}),c=order({request_id:'UMS001-REQ-0000002'});
 assert.equal(idempotencyKey(a),idempotencyKey(structuredClone(a)));
 assert.notEqual(idempotencyKey(a),idempotencyKey(b));
 assert.notEqual(idempotencyKey(a),idempotencyKey(c));
});
test('no untrusted gateway context, actor/tenant spoof or unregistered consumer is accepted',()=>{
 const a=order();
 assert.equal(planUniversalMediaRequest(a).reason,'MISSING_GATEWAY_IAM');
 assert.equal(planUniversalMediaRequest(a,{...ctx(),trustedIdentity:{...identity(),company_id:'other'}}).reason,'IAM_SCOPE_MISMATCH');
 assert.equal(planUniversalMediaRequest(order({origin_engine_id:'SEO-001'}),ctx()).reason,'IAM_SCOPE_MISMATCH');
 assert.equal(planUniversalMediaRequest(a,{...ctx(),trustedEngineRegistry:{}}).reason,'ENGINE_NOT_REGISTERED_OR_VERIFIED');
 assert.equal(planUniversalMediaRequest(a,{...ctx(),trustedEngineRegistry:{
   ...engines,'SOC-001':{...engines['SOC-001'],allowed_consumer_engines:[]}}}).reason,'CONSUMER_ROUTE_NOT_AUTHORIZED');
});
test('ChatGPT requires explicit trusted owner authorization; Console requires signed-in console session',()=>{
 const o=order({trigger:'CHATGPT'});
 assert.equal(planUniversalMediaRequest(o,ctx()).reason,'CHATGPT_ORDER_AUTH_REQUIRED');
 assert.equal(planUniversalMediaRequest(o,{...ctx('SOC-001','CHATGPT'),
  trustedIdentity:{...identity('SOC-001','CHATGPT'),explicit_order_authorized:false}}).reason,'CHATGPT_ORDER_AUTH_REQUIRED');
 assert.equal(planUniversalMediaRequest(o,ctx('SOC-001','CHATGPT')).state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');
 const c=order({trigger:'CONSOLE'});
 assert.equal(planUniversalMediaRequest(c,ctx()).reason,'CONSOLE_SESSION_AUTH_REQUIRED');
 assert.equal(planUniversalMediaRequest(c,ctx('SOC-001','CONSOLE')).state,'LAB_REQUEST_VALIDATED_NO_DISPATCH');
});
test('paid inference, auto recharge and direct publishing fail closed',()=>{
 for(const key of ['paid_execution_enabled','auto_recharge','publish_requested']) {
  const o=order({budget:{...order().budget,[key]:true}});
  const p=planUniversalMediaRequest(o,ctx());
  assert.equal(p.state,'HUMAN_REQUIRED');assert.equal(p.exception,'MONEY_LIMIT');
 }
 assert.equal(planUniversalMediaRequest(order({budget:{...order().budget,max_additional_cost_eur:0.01}}),ctx()).reason,
   'LAB_FINOPS_OR_PUBLICATION_POLICY');
});
test('wrong type/format, provider URL, extra keys and unexpected PROD scope are rejected',()=>{
 assert.throws(()=>validateMediaRequest(order({environment:'PROD'})),/REQUEST_SCOPE/);
 assert.throws(()=>validateMediaRequest(order({format:{...order().format,output_mime:'video/mp4'}})),/FORMAT_KIND_MISMATCH/);
 assert.throws(()=>validateMediaRequest(order({brief_ref:'https://evil.example/secret'})),/REQUEST_FIELDS/);
 assert.throws(()=>validateMediaRequest(order({reply_to:'https://evil.example/receive'})),/REQUEST_FIELDS/);
 assert.throws(()=>validateMediaRequest(order({budget:{...order().budget,secret:'x'}})),/BUDGET_SCHEMA/);
 assert.throws(()=>validateMediaRequest(order({asset_kind:'IMAGE',capability_id:'VIDEO.SHORT'})),/CAPABILITY/);
});
test('personal rights, unknown channel, invalid placement and expired deadline are held',()=>{
 assert.equal(planUniversalMediaRequest(order({rights_profile:'AUTHORIZED_PERSON'}),ctx()).exception,'LEGAL_REQUIRED');
 const extra={...engines,'SOC-001':{...engines['SOC-001'],allowed_channels:[...engines['SOC-001'].allowed_channels,'NEWNETWORK']}};
 assert.equal(planUniversalMediaRequest(order({channel_id:'NEWNETWORK'}),{...ctx(),trustedEngineRegistry:extra}).reason,
  'CHANNEL_PROFILE_NOT_REGISTERED');
 assert.equal(planUniversalMediaRequest(order({placement:'UNKNOWN_SLOT'}),ctx()).reason,'PLACEMENT_PROFILE_NOT_DEFINED');
 assert.equal(planUniversalMediaRequest(order({deadline_utc:'2026-11-12T11:00:00Z'}),ctx()).reason,'DEADLINE_EXPIRED');
});
test('unverified scaffold cannot self-grant IAM by presenting false statuses',()=>{
 const hook=scaffoldMediaConsumer('FOO-001',{companyId:'fenix'});
 assert.equal(hook.allow_automatic_publication,false);
 const req=order({origin_engine_id:'FOO-001',consumer_engine_id:'FOO-001',
   channel_id:'GENERIC',placement:'CUSTOM',item_id:'NEW-POSTER-01'});
 const spoof={...ctx('FOO-001'),trustedIdentity:identity('FOO-001')};
 assert.equal(planUniversalMediaRequest(req,spoof).reason,'ENGINE_NOT_REGISTERED_OR_VERIFIED');
});
