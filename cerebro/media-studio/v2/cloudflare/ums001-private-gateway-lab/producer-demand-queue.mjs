/** UMS-001 · private, bounded, metadata-only producer request queue, LAB. */
export const DEMAND_QUEUE_NAME='cerebro-ums001-producer-demand-lab-eu';
const PREFIX='meta/ums001-producer-demand/v1/';
const KINDS=Object.freeze({
  polyhaven:['textures','hdris'],
  ambientcg:['textures','hdris','models','decals'],
  met:['images'],
  wikimedia_commons:['images','audio','video'],
  openverse:['images','audio'],
});
const REQUIRED=['schema_version','actor_id','company_id','engine_id','environment','provider','kind','action','request_id','production_id','mode'];
const KEY_PATTERN=/^[A-Za-z0-9_-]{8,96}$/;
export function validateProducerDemand(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.schema_version!==1||body.actor_id!=='ums001-producer-lab'||
 body.company_id!=='fenix'||body.engine_id!=='UMS-001'||body.environment!=='LAB'||body.mode!=='METADATA_ONLY'||
 !['SEARCH','LATEST'].includes(body.action)||!KINDS[body.provider]?.includes(body.kind)||
 !KEY_PATTERN.test(body.request_id||'')||!KEY_PATTERN.test(body.production_id||''))throw Error('UMS_DEMAND_INVALID_SCOPE');
 if(body.action==='SEARCH'&&(typeof body.query!=='string'||body.query.trim().length<3||body.query.length>80||/[\x00-\x1f]/.test(body.query)))throw Error('UMS_DEMAND_INVALID_QUERY');
 if(body.action==='LATEST'&&body.query!==undefined)throw Error('UMS_DEMAND_LATEST_NO_QUERY');
 const accepted=new Set([...REQUIRED,...(body.action==='SEARCH'?['query']:[])]);
 if(Object.keys(body).length!==accepted.size||Object.keys(body).some(x=>!accepted.has(x)))throw Error('UMS_DEMAND_UNEXPECTED_FIELDS');
 return body;
}
export function producerDemandKey(request_id){if(!KEY_PATTERN.test(request_id||''))throw Error('UMS_DEMAND_KEY_DENIED');return PREFIX+request_id;}
export async function executeProducerDemand(env,body,handlers){
 if(env?.PRODUCER_DEMAND_QUEUE_ENABLED!=='true'||!env.LAB_KV||typeof env.LAB_KV.get!=='function'||typeof env.LAB_KV.put!=='function')throw Error('UMS_DEMAND_DISABLED');
 const task=validateProducerDemand(body),key=producerDemandKey(task.request_id);
 const previous=await env.LAB_KV.get(key,{type:'json'});
 if(previous?.status==='COMPLETED')return {...previous,duplicate:true};
 const safeTask={company_id:task.company_id,engine_id:task.engine_id,environment:task.environment,provider:task.provider,kind:task.kind,
 production_id:task.production_id,request_id:task.request_id,...(task.action==='SEARCH'?{query:task.query}:{} ),...(task.provider==='polyhaven'?{max_results:8}:{})};
 try{
  const reply=task.action==='LATEST'?await handlers.latest(env,safeTask):task.provider==='polyhaven'?await handlers.polyhaven(env,safeTask):await handlers.scout(env,safeTask);
  if(reply?.company_id!==task.company_id||reply.engine_id!==task.engine_id||reply.environment!=='LAB'||!Array.isArray(reply.results)||
   reply.production_approved===true||reply.downloaded===true||reply.publish_authorized===true||reply.results.length>8||
   reply.results.some(x=>!x||typeof x.id!=='string'||x.license!=='CC0-1.0'||x.production_approved===true||x.downloaded===true))throw Error('UMS_DEMAND_UNSAFE_SOURCE_REPLY');
  const receipt={schema_version:1,company_id:task.company_id,engine_id:task.engine_id,environment:'LAB',provider:task.provider,kind:task.kind,
   action:task.action,request_id:task.request_id,production_id:task.production_id,status:'COMPLETED',at:new Date().toISOString(),
   count:reply.results.length,ids:reply.results.map(x=>x.id).slice(0,8),source_status:reply.refresh_status||'LIVE_METADATA',
   license:'CC0-1.0',rights_review:'PENDING',downloaded:false,production_approved:false,publish_authorized:false,cost_eur:0};
  await env.LAB_KV.put(key,JSON.stringify(receipt));return receipt;
 }catch(e){const err=String(e?.message||'UNKNOWN').slice(0,120);const record={status:'ERROR',at:new Date().toISOString(),request_id:task.request_id,
  provider:task.provider,kind:task.kind,error_code:err,downloaded:false,production_approved:false,publish_authorized:false,cost_eur:0};
  await env.LAB_KV.put(key,JSON.stringify(record));return record;}
}
/** Distinct explicit-selection contract: never reuse SEARCH/LATEST metadata success receipts. */
export function validateCommonsQueueSelection(body){
 const required=['schema_version','actor_id','company_id','engine_id','environment','provider','kind','action','request_id','production_id','mode','selected_asset_id','explicit_selection'];
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==required.length||required.some(k=>!(k in body))||
 body.schema_version!==1||body.actor_id!=='ums001-producer-lab'||body.company_id!=='fenix'||body.engine_id!=='UMS-001'||body.environment!=='LAB'||
 body.provider!=='wikimedia_commons'||body.kind!=='images'||body.action!=='SELECT_COMMONS'||body.mode!=='SELECT_ONE'||
 body.explicit_selection!==true||!/^(?:commons:)[1-9][0-9]{2,10}$/.test(body.selected_asset_id||'')||
 !KEY_PATTERN.test(body.request_id||'')||!/^[A-Za-z0-9_:-]{3,120}$/.test(body.production_id)||Object.keys(body).some(k=>!required.includes(k)))throw Error('UMS_COMMONS_QUEUE_SELECTION_DENIED');
 return body;
}
export async function executeCommonsQueueSelection(env,body,handlers){
 if(env?.PRODUCER_DEMAND_QUEUE_ENABLED!=='true'||env?.COMMONS_SELECT_ENABLED!=='true'||!env.LAB_KV||typeof handlers?.commonsSelect!=='function'||typeof handlers?.commonsRead!=='function')throw Error('UMS_COMMONS_QUEUE_DISABLED');
 const task=validateCommonsQueueSelection(body),key=producerDemandKey(task.request_id);
 const existing=await env.LAB_KV.get(key,{type:'json'});if(existing?.status==='COMPLETED')return {...existing,duplicate:true};
 const request={company_id:task.company_id,engine_id:task.engine_id,environment:task.environment,provider:task.provider,kind:task.kind,request_id:task.request_id,production_id:task.production_id,asset_id:task.selected_asset_id,explicit_selection:true};
 try{
  const acquired=await handlers.commonsSelect(env,request);
  const read=await handlers.commonsRead(env,request);
  if(read.asset_id!==task.selected_asset_id||read.sha256!==acquired.sha256||read.bytes!==acquired.bytes||read.production_approved!==false||read.publish_authorized!==false)throw Error('UMS_COMMONS_SELECT_READ_MISMATCH');
  const receipt={schema_version:1,company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'wikimedia_commons',kind:'images',action:'SELECT_COMMONS',request_id:task.request_id,production_id:task.production_id,status:'COMPLETED',asset_id:task.selected_asset_id,bytes:acquired.bytes,sha256:acquired.sha256,file_key:acquired.file_key,downloaded:true,integrity_verified:true,license:'CC0-1.0',rights_review:'PENDING',production_approved:false,publish_authorized:false,cost_eur:0,at:new Date().toISOString()};
  await env.LAB_KV.put(key,JSON.stringify(receipt));return receipt;
 }catch(e){const error=String(e?.message||'UNKNOWN').slice(0,120);const record={status:'ERROR',action:'SELECT_COMMONS',at:new Date().toISOString(),request_id:task.request_id,provider:'wikimedia_commons',kind:'images',error_code:error,production_approved:false,publish_authorized:false,cost_eur:0};await env.LAB_KV.put(key,JSON.stringify(record));return record;}
}
export async function consumeProducerDemandQueue(batch,env,handlers){
 if(batch?.queue!==DEMAND_QUEUE_NAME||env?.PRODUCER_DEMAND_QUEUE_ENABLED!=='true'||!Array.isArray(batch.messages)||batch.messages.length>1)throw Error('UMS_DEMAND_QUEUE_SCOPE_DENIED');
 for(const msg of batch.messages){
  try{if(msg.body?.action==='SELECT_COMMONS')await executeCommonsQueueSelection(env,msg.body,handlers);else await executeProducerDemand(env,msg.body,handlers)}
  catch(e){
   const error=String(e?.message||'UNKNOWN').slice(0,110);
   if(msg.body?.action==='SELECT_COMMONS'&&KEY_PATTERN.test(msg.body.request_id||'')&&env.LAB_KV){
    await env.LAB_KV.put(producerDemandKey(msg.body.request_id),JSON.stringify({status:'ERROR',action:'SELECT_COMMONS',request_id:msg.body.request_id,error_code:error,at:new Date().toISOString(),production_approved:false,publish_authorized:false,cost_eur:0}));
   }
   console.error('UMS_DEMAND_REJECTED',error);
  }
  msg.ack();
 }
}