/** Universal Social/SEO event -> UMS request. LAB only, zero-cost offline mapping.
 * This does not trust or authenticate the event: CEREBRO Gateway must supply a verified identity.
 * No calls to Buffer, WordPress, Supabase, Cloudflare queues or AI models here.
 */
import {validateMediaRequest} from './ums001_universal_media_request_lab_v1.mjs';
const ENGINES=Object.freeze({
 'SOC-001':{event:'SOCIAL_CONTENT_REQUESTED',channels:['FACEBOOK','INSTAGRAM','LINKEDIN','YOUTUBE','TIKTOK']},
 'SEO-001':{event:'SEO_MEDIA_REQUESTED',channels:['SEO']}
});
const OUT=Object.freeze({social:'cerebro://events/ums001/social',seo:'cerebro://events/ums001/seo'});
function fail(x){throw Error('UMS001_ENGINE_EVENT_'+x)}
export function prepareUniversalMediaOrder(event,{identity,policyVersion='ums001-policy-v1',nowUtc}={}){
 if(!event||typeof event!=='object'||Array.isArray(event))fail('EVENT');
 if(!identity||identity.trust_source!=='CEREBRO_GATEWAY_IAM'||identity.gateway_authenticated!==true||
    identity.environment!=='LAB'||identity.company_id!=='fenix')fail('UNVERIFIED_IAM');
 const rules=ENGINES[identity.engine_id];if(!rules)fail('UNSUPPORTED_SOURCE_ENGINE');
 if(event.type!==rules.event||event.company_id!=='fenix'||event.origin_engine_id!==identity.engine_id)
   fail('SOURCE_EVENT_IDENTITY_OR_ALIAS_UNVERIFIED');
 if(!rules.channels.includes(event.channel_id))fail('CHANNEL_NOT_OWNED_BY_ENGINE');
 if(typeof nowUtc!=='string'||Number.isNaN(Date.parse(nowUtc)))fail('TRUSTED_CLOCK_REQUIRED');
 if(!event.brief_ref||!event.format||!event.request_id||!event.item_id)fail('EVENT_REQUIRED_FIELDS');
 const order={
  schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',request_id:event.request_id,
  company_id:'fenix',engine_id:'UMS-001',origin_engine_id:identity.engine_id,
  environment:'LAB',version:'1.0.0',trigger:'ENGINE_EVENT',
  asset_kind:event.asset_kind,capability_id:event.capability_id,item_id:event.item_id,
  consumer_engine_id:identity.engine_id,channel_id:event.channel_id,placement:event.placement,
  brief_ref:event.brief_ref,format:event.format,
  rights_profile:event.rights_profile,priority:event.priority||'NORMAL',
  requested_at_utc:nowUtc,deadline_utc:event.deadline_utc||null,
  policy_version:policyVersion,
  budget:{max_additional_cost_eur:0,max_attempts:2,prepaid_only:true,
    paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
  reply_to:identity.engine_id==='SOC-001'?OUT.social:OUT.seo
 };
 validateMediaRequest(order);
 return Object.freeze(order);
}
export function mediaConsumerEventAdapterDescriptor(engine_id){
 const rule=ENGINES[engine_id];if(!rule)fail('UNSUPPORTED_SOURCE_ENGINE');
 return Object.freeze({engine_id,source_event:rule.event,target_event:'MEDIA_JOB_REQUESTED',
  consumer_event:'UMS001_ASSET_DELIVERED',channels:[...rule.channels],
  signer_state:'REQUIRES_INDEPENDENT_ENGINE_SECRET',
  transport_state:'NOT_WIRED_TO_REAL_ORIGIN',paid_execution:false,publication:false});
}
