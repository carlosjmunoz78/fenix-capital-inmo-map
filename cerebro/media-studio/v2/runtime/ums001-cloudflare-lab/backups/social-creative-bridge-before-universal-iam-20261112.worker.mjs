/**
 * SOC-001 -> UMS-001 private creative request bridge. LAB-only.
 * Isolated queue interface. Does not alter Instagram AUTOQUAL, Buffer, Meta or publishing.
 */
const INBOX='cerebro-ums001-social-creative-event-lab-eu';
const REPLY='cerebro-ums001-social-private-reply-lab-eu';
const AUDIT='meta/ums001-social-creative-bridge/v1/';
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
function deny(s){throw Error('UMS001_SOCIAL_'+s)}
function validate(i){
 if(!i||i.event_type!=='SOCIAL_CONTENT_REQUESTED'||i.company_id!=='fenix-capital'||i.environment!=='LAB'||i.producer_id!=='UMS-001')deny('SCOPE');
 if(!['FACEBOOK','INSTAGRAM'].includes(i.platform_id)||i.format!=='IMAGE'||i.content_status!=='APPROVED_TO_PRODUCE')deny('NETWORK_APPROVAL');
 if(i.auto_spend!==false||i.publish_requested!==false||i.use_unapproved_generator!==false)deny('SPEND_PUBLISH');
 if(i.verified_company_context!==true||i.rights_profile!=='SYNTHETIC_ORIGINAL'||!ID.test(i.request_id||'')||!ID.test(i.item_id||'')||!ID.test(i.campaign_id||''))deny('BRIEF_IDENTITY');
 if(typeof i.creative_direction!=='string'||i.creative_direction.length<25||i.creative_direction.length>450||typeof i.network_specific_caption!=='string'||i.network_specific_caption.length<10||i.network_specific_caption.length>500)deny('CREATIVE_FIELDS');
 if(/https?:\/\/|secret|access.token|api.key|password/i.test(i.creative_direction))deny('UNSAFE_PROMPT');
 if(i.trusted_mapping!=='GATEWAY_IAM_VERIFIED_FENIX_LAB')deny('MAPPING_UNVERIFIED');
 return i;
}
function normalize(i){
 return {schema_version:'1.0.0',event_type:'MEDIA_JOB_REQUESTED',request_id:i.request_id,
 company_id:'fenix',engine_id:'UMS-001',origin_engine_id:'SOC-001',environment:'LAB',
 version:'1.0.0',trigger:'ENGINE_EVENT',asset_kind:'IMAGE',capability_id:'IMAGE.SYNTHETIC',
 item_id:i.item_id,consumer_engine_id:'SOC-001',channel_id:i.platform_id,placement:'FEED',
 brief_ref:'cerebro://briefs/ums001/'+i.request_id,
 format:{profile_id:i.platform_id==='INSTAGRAM'?'IG_FEED_LAB_PREVIEW':'FB_FEED_LAB_PREVIEW',
 width_px:1024,height_px:1024,duration_seconds:null,output_mime:'image/jpeg'},
 rights_profile:'SYNTHETIC_ORIGINAL',priority:'NORMAL',requested_at_utc:new Date().toISOString(),
 deadline_utc:null,policy_version:'ums001-policy-v1',
 budget:{max_additional_cost_eur:0,max_attempts:1,prepaid_only:true,
 paid_execution_enabled:false,auto_recharge:false,publish_requested:false},
 reply_to:'cerebro://events/ums001/lab'};
}
export default {
 async queue(batch,env){
  if(batch.queue===REPLY){
   for(const m of batch.messages){
    try{
     const r=m.body;
     if(!r||r.origin_engine_id!=='SOC-001'||r.company_id!=='fenix'||r.environment!=='LAB'||r.state!=='PRIVATE_READY'||!ID.test(r.request_id||'')||!ID.test(r.item_id||'')||r.publish_authorized!==false||!(/^[0-9a-f]{64}$/.test(r.asset_sha256||'')))deny('REPLY_INVALID');
     const key='meta/ums001-ai-image-factory/v1/receipts/SOC-001/'+r.request_id+'/'+r.item_id;
     const saved=await env.IMAGE_KV.get(key,{type:'json'});
     if(!saved||saved.state!=='PRIVATE_READY'||saved.asset_sha256!==r.asset_sha256||saved.private_artifact_ref!==r.private_artifact_ref)deny('RECEIPT_MISMATCH');
     const blob=await env.IMAGE_KV.get(saved.private_artifact_ref,{type:'arrayBuffer'});
     if(!blob||blob.byteLength<5000)deny('ASSET_MISSING');
     const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',blob))].map(x=>x.toString(16).padStart(2,'0')).join('');
     if(sha!==r.asset_sha256)deny('HASH_MISMATCH');
     const ack={state:'PRIVATE_ASSET_RECEIVED',event_type:'UMS001_ASSET_QA_PENDING',company_id:'fenix-capital',engine_id:'SOC-001',producer_id:'UMS-001',environment:'LAB',request_id:r.request_id,item_id:r.item_id,platform_id:r.platform_id,asset_sha256:sha,private_artifact_ref:saved.private_artifact_ref,bytes:blob.byteLength,technical_qa:'PASS',visual_qa:'PENDING',brand_qa:'PENDING',signed_delivery_verified:false,publication_authorized:false,additional_cost_eur:'NOT_VERIFIED',received_at:new Date().toISOString()};
     await env.IMAGE_KV.put(AUDIT+'replies/'+r.request_id+'/'+r.item_id,JSON.stringify(ack));m.ack();
    }catch(e){const code=String(e?.message||'ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,85);try{await env.IMAGE_KV.put(AUDIT+'reply-errors/'+String(m.id).slice(0,70),JSON.stringify({state:'HELD',code,at:new Date().toISOString()}));m.ack();}catch{m.retry({delaySeconds:30})}}
   }
   return;
  }
  if(batch.queue!==INBOX)deny('WRONG_QUEUE');
  for(const message of batch.messages){
   try{
    if(env.SOCIAL_BRIDGE_ENABLED!=='true'||!env.UNIVERSAL_MEDIA||!env.SOC_ENGINE_TOKEN||!env.IMAGE_KV)deny('OFF');
    const item=validate(message.body),key=AUDIT+'events/'+item.request_id+'/'+item.item_id;
    const old=await env.IMAGE_KV.get(key,{type:'json'});
    if(old&&old.state==='QUEUED_FOR_UNIVERSAL_ROUTER'){message.ack();continue;}
    const prompt='Original editorial photograph for a fictional Spanish real estate brand. '+item.creative_direction+'. Premium photorealistic architecture, authentic Mediterranean daylight, no words, no logo, no watermark.';
    if(prompt.length>700)deny('PROMPT_TOO_LONG');
    const brief={company_id:'fenix',environment:'LAB',origin_engine_id:'SOC-001',
      request_id:item.request_id,rights_profile:'SYNTHETIC_ORIGINAL',
      publish_requested:false,prompt};
    const briefKey='meta/ums001-ai-image-factory/v1/briefs/SOC-001/'+item.request_id;
    await env.IMAGE_KV.put(briefKey,JSON.stringify(brief));
    // The bridge is a bound Cloudflare Worker and authenticates itself to the universal gateway.
    const order=normalize(item);
    await env.IMAGE_KV.put(key,JSON.stringify({state:'QUEUED_FOR_UNIVERSAL_ROUTER',
      company_id:'fenix',origin_engine_id:'SOC-001',request_id:item.request_id,
      item_id:item.item_id,platform_id:item.platform_id,at:new Date().toISOString(),
      source:'SOCIAL_SERVICE_AUTHENTICATED_GATEWAY_LAB',publish_authorized:false}));
    try{await env.UNIVERSAL_MEDIA.submitEngine({
       company_id:'fenix',environment:'LAB',origin_engine_id:'SOC-001',
       request_id:item.request_id,item_id:item.item_id,channel_id:item.platform_id,
       prompt,rights_profile:'SYNTHETIC_ORIGINAL',publish_requested:false
      },env.SOC_ENGINE_TOKEN);
    }catch(e){await env.IMAGE_KV.put(key,JSON.stringify({state:'HELD',code:'AUTHENTICATED_DISPATCH_FAILED',at:new Date().toISOString(),publish_authorized:false}));throw e;}
    message.ack();
   }catch(e){
    const code=String(e?.message||'ERROR').replace(/[^A-Z0-9_]/gi,'_').slice(0,85);
    try{await env.IMAGE_KV.put(AUDIT+'error/'+String(message.id).slice(0,80),JSON.stringify({
      state:'HELD',code,at:new Date().toISOString(),publication:false,provider_calls:0}));message.ack();}
    catch{message.retry({delaySeconds:30});}
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};