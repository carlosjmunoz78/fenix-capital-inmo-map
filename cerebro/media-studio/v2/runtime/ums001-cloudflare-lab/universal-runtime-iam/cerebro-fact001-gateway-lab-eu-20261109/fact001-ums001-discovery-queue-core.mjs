/** FACT-001 / UMS-001 · authenticated private discovery, no downloads or publication. */
const PREFIX='meta/fact001-ums001-discovery/v1/';
const KINDS={
 ambientcg:['textures','hdris'],
 met:['images'],
 wikimedia_commons:['images','audio','video'],
 openverse:['audio'],
 polyhaven:['textures','hdris']
};
const REQUIRED={schema_version:1,mode:'READ_ONLY',actor_id:'cerebro-orchestrator-lab',company_id:'fenix',engine_id:'UMS-001',environment:'LAB',production_id:'UMS001-LAB-TEST',explicit_selection:false};
export function validateDiscoveryMessage(message){
 if(!message||typeof message!=='object'||Array.isArray(message))throw Error('DISCOVERY_INVALID_MESSAGE');
 for(const [key,value] of Object.entries(REQUIRED))if(message[key]!==value)throw Error('DISCOVERY_SCOPE_DENIED');
 if(!['LATEST','SEARCH'].includes(message.action))throw Error('DISCOVERY_ACTION_DENIED');
 if(!KINDS[message.provider]?.includes(message.kind))throw Error('DISCOVERY_SOURCE_DENIED');
 if(message.action==='LATEST'&&message.provider==='polyhaven')throw Error('DISCOVERY_CATALOG_NOT_READY');
 if(!/^UMS001-QUEUE-[A-Z0-9_-]{8,48}$/.test(message.request_id||''))throw Error('DISCOVERY_REQUEST_ID_DENIED');
 if(message.action==='SEARCH'&&(typeof message.query!=='string'||message.query.trim().length<3||message.query.length>100||/[\x00-\x1f]/.test(message.query)))throw Error('DISCOVERY_QUERY_DENIED');
 const allowed=new Set([...Object.keys(REQUIRED),'action','provider','kind','request_id',...(message.action==='SEARCH'?['query']:[])]);
 if(Object.keys(message).some(key=>!allowed.has(key)))throw Error('DISCOVERY_UNEXPECTED_FIELD');
 return message;
}
export async function consumeUMS001DiscoveryCommand(message,env,route){
 if(env?.UMS001_QUEUE_ENABLED!=='true'||env?.UMS001_PRIVATE_BINDING_ENABLED!=='true'||!env.LAB_KV||typeof env.LAB_KV.get!=='function'||typeof env.LAB_KV.put!=='function'||typeof env.UMS001_CALLER_TOKEN!=='string'||env.UMS001_CALLER_TOKEN.length<32)throw Error('DISCOVERY_RUNTIME_DISABLED');
 validateDiscoveryMessage(message);
 const key=PREFIX+message.request_id;
 const old=await env.LAB_KV.get(key,{type:'json'});
 if(old?.status==='COMPLETED')return {...old,idempotent:true};
 const emit=async record=>env.LAB_KV.put(key,JSON.stringify(record));
 await emit({status:'STARTED',at:new Date().toISOString(),request_id:message.request_id});
 try{
  const reply=await route(env,{private_token:env.UMS001_CALLER_TOKEN,request:{...message}});
  const allowedStatus=['CACHED_CANDIDATES_FOR_QA','CANDIDATES_FOR_QA','SOURCE_NOT_READY'];
  const cap=message.provider==='wikimedia_commons'?5:message.provider==='met'?3:8;
  if(!allowedStatus.includes(reply?.status)||reply.provider!==message.provider||reply.kind!==message.kind||
    !Array.isArray(reply.candidates)||reply.candidates.length>cap||reply.publish_authorized!==false||reply.downloaded!==false||
    reply.candidates.some(x=>x.license!=='CC0-1.0'||typeof x.id!=='string'||x.id.length>150)||reply.cost_eur!==0)
    throw Error('DISCOVERY_REPLY_DENIED');
  const receipt={status:reply.status==='SOURCE_NOT_READY'?'DEGRADED':'COMPLETED',at:new Date().toISOString(),request_id:message.request_id,
   action:message.action,provider:message.provider,kind:message.kind,count:reply.candidates.length,
   candidates:reply.candidates.map(x=>({id:x.id,title:String(x.title||x.name||'').slice(0,130),license:'CC0-1.0',source:String(x.source||'').slice(0,320)})),
   refresh_status:reply.refresh_status||null,refreshed_at:reply.refreshed_at||null,downloaded:false,
   production_approved:false,publish_authorized:false,additional_cost_eur_reported:0};
  await emit(receipt);
  return receipt;
 }catch(error){
  const code=String(error?.message||'DISCOVERY_ERROR').slice(0,110);
  await emit({status:'ERROR',at:new Date().toISOString(),request_id:message.request_id,code,
    production_approved:false,publish_authorized:false,downloaded:false});
  throw error;
 }
}