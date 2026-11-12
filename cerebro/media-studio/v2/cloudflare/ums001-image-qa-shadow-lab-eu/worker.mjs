/** UMS-001 IMAGE QA SHADOW · isolated Cloudflare Queue consumer · LAB ONLY.
 * No routes, no provider API, no paid model, no image bytes, no social/SEO publishing.
 * Queue submission is Cloudflare account-authenticated; this worker does not
 * treat submitted assertions as licensed/editorial/physical-asset proof.
 * Worker writes a metadata-only, NON-COMMERCIAL quarantine record to its
 * own EU Workers KV namespace. NOT an atomic FINOPS reservation or full delivery.
 */
const SCOPE=Object.freeze({schema_version:1,company_id:'fenix',engine_id:'UMS-001',
 environment:'LAB',item_id:'LI-FEED-01',consumer_engine_id:'UMS-QA-LAB'});
const ID=/^UMS001-LAB-LI-FEED-01-ARCHIVE-[0-9]{8}$/;
const DRIVE=/^[a-zA-Z0-9_-]{20,80}$/;
const SHA=/^[a-f0-9]{64}$/;
const KEYS=Object.freeze(['schema_version','company_id','engine_id','environment','order_id',
 'item_id','consumer_engine_id','archive_drive_file_id','archive_zip_sha256','archive_zip_bytes',
 'image_sha256','image_bytes','image_type','source_qa_zip_sha256','source_qa_drive_file_id',
 'stage','rights_approved','editorial_approved','publish_enabled','video_enabled',
 'production_enabled','paid_execution_enabled','delivery_allowed']);
const PREFIX='meta/ums001-image-qa-shadow/v1/';
const fail=msg=>{throw Error('UMS001_IMAGE_QA_SHADOW_'+msg)};
const canonical=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?
 Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b,'en'))):v);
const hash=async v=>{
 const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof v==='string'?v:canonical(v)));
 return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
};
export function validateImageQaOrder(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||
    KEYS.length!==Object.keys(p).length||KEYS.some(k=>!Object.hasOwn(p,k)))
   fail('SCHEMA');
 for(const [k,v] of Object.entries(SCOPE))if(p[k]!==v)fail('SCOPE_'+k);
 if(!ID.test(p.order_id||'')||!DRIVE.test(p.archive_drive_file_id||'')||
    !DRIVE.test(p.source_qa_drive_file_id||''))fail('IDENTITY');
 if(!SHA.test(p.archive_zip_sha256||'')||!SHA.test(p.source_qa_zip_sha256||'')||
    !SHA.test(p.image_sha256||''))fail('SHA');
 if(!Number.isInteger(p.archive_zip_bytes)||p.archive_zip_bytes<1024||
    p.archive_zip_bytes>12_000_000||!Number.isInteger(p.image_bytes)||
    p.image_bytes<1024||p.image_bytes>12_000_000||
    p.image_type!=='image/webp')fail('ASSET_TYPE_SIZE');
 if(p.stage!=='QA_ONLY_INBOX'||p.rights_approved!==false||p.editorial_approved!==false||
    p.publish_enabled!==false||p.video_enabled!==false||
    p.production_enabled!==false||p.paid_execution_enabled!==false||
    p.delivery_allowed!==false)fail('PROHIBITED_ACTION');
 return p;
}
export async function acceptImageQaOrder(p,env){
 if(env?.QA_ONLY_ENABLED!=='true'||!env.QA_KV||
   typeof env.QA_KV.get!=='function'||typeof env.QA_KV.put!=='function')
  fail('DISABLED_OR_STORAGE_NOT_ISOLATED');
 const order=validateImageQaOrder(p);
 const key=PREFIX+order.order_id;
 const payloadDigest=await hash(order);
 const previous=await env.QA_KV.get(key,{type:'json'});
 if(previous){
  if(previous.request_sha256!==payloadDigest||previous.order_id!==order.order_id||
      previous.stage!=='QA_INBOX_RECEIVED_UNVERIFIED')
    fail('IDEMPOTENCY_CONFLICT');
  return {status:'QA_INBOX_ALREADY_PRESENT',order_id:order.order_id,
    request_sha256:payloadDigest,source_asset_verified_by_this_worker:false,
    delivery_approved:false,publish_enabled:false};
 }
 const record={schema_version:1,company_id:SCOPE.company_id,engine_id:SCOPE.engine_id,
  environment:SCOPE.environment,order_id:order.order_id,item_id:order.item_id,
  consumer_engine_id:order.consumer_engine_id,stage:'QA_INBOX_RECEIVED_UNVERIFIED',
  request_sha256:payloadDigest,archive_drive_file_id:order.archive_drive_file_id,
  archive_zip_sha256:order.archive_zip_sha256,archive_zip_bytes:order.archive_zip_bytes,
  source_qa_drive_file_id:order.source_qa_drive_file_id,
  source_qa_zip_sha256:order.source_qa_zip_sha256,
  image_sha256:order.image_sha256,image_bytes:order.image_bytes,
  source_asset_verified_by_this_worker:false,
  source_readback_external_evidence_only:true,
  independent_qa_signatures_verified:false,
  signed_destination_receipt_verified:false,
  rights_approved:false,editorial_approved:false,commercial_delivery_allowed:false,
  publish_enabled:false,video_enabled:false,paid_execution_enabled:false,
  production_enabled:false,cost_added_eur:0};
 await env.QA_KV.put(key,JSON.stringify(record));
 return {status:record.stage,order_id:order.order_id,request_sha256:payloadDigest,
  source_asset_verified_by_this_worker:false,delivery_approved:false,publish_enabled:false};
}
export const QA_KEY_PREFIX=PREFIX;
export default {
 async queue(batch,env){
  if(batch?.queue!=='cerebro-ums001-image-qa-shadow-lab-eu')
   fail('WRONG_QUEUE');
  for(const message of batch.messages||[]){
   try{
    await acceptImageQaOrder(message.body,env);
    message.ack();
   }catch(err){
    // Never log payload, file refs, tokens, secrets or paths.
    const what=String(err?.message||'UNKNOWN').replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
    console.error('QA_SHADOW_DENIED',what);
    // Invalid records are rejected permanently without a retry loop.
    if(what.startsWith('UMS001_IMAGE_QA_SHADOW_SCHEMA')||
       what.startsWith('UMS001_IMAGE_QA_SHADOW_SCOPE')||
       what.startsWith('UMS001_IMAGE_QA_SHADOW_IDENTITY')||
       what.startsWith('UMS001_IMAGE_QA_SHADOW_SHA')||
       what.startsWith('UMS001_IMAGE_QA_SHADOW_ASSET_TYPE')||
       what.startsWith('UMS001_IMAGE_QA_SHADOW_PROHIBITED_ACTION'))
      message.ack();
    else message.retry({delaySeconds:30});
   }
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
};
