import {WorkerEntrypoint} from 'cloudflare:workers';
const ENGINE='UMS-001',COMPANY='fenix',ENV='LAB';
function assertRequest(input,permission){
  if(input?.company_id!==COMPANY||input.engine_id!==ENGINE||input.environment!==ENV)throw Error('SCOPE_DENIED');
  if(!['textures','hdris'].includes(input.kind))throw Error('TYPE_DENIED');
  if(permission==='media.acquire' && !/^[A-Za-z0-9_-]{1,120}$/.test(String(input.asset_id||'')))throw Error('SELECTION_REQUIRED');
  if(permission==='media.search' && (typeof input.query!=='string'||input.query.trim().length<3||input.query.length>160))throw Error('QUERY_INVALID');
  return true;
}
function intent(env,task,permission){
  assertRequest(task,permission);
  if(!env.MEDIA||typeof env.PRIVATE_MEDIA_TOKEN!=='string'||env.PRIVATE_MEDIA_TOKEN.length<32)throw Error('MEDIA_PRIVATE_BINDING_MISSING');
  return {...task,provider:'polyhaven',actor_id:'ums001-producer-lab',permissions:[permission],auth_token:env.PRIVATE_MEDIA_TOKEN};
}
async function search(env,task){const result=await env.MEDIA.search(intent(env,task,'media.search'));
  if(result?.company_id!==COMPANY||result?.engine_id!==ENGINE||result?.environment!==ENV||!Array.isArray(result.results))throw Error('INVALID_SEARCH_REPLY');
  return result;
}
async function acquire(env,task){const result=await env.MEDIA.acquire(intent(env,task,'media.acquire'));
  if(!['STORED','ALREADY_STORED'].includes(result?.status)||result.company_id!==COMPANY||result.engine_id!==ENGINE||
     result.environment!==ENV||result.asset_id!==task.asset_id||result.license!=='CC0-1.0'||result.production_approved!==false||
     !/^[a-f0-9]{64}$/i.test(String(result.sha256||''))||result.cost_eur!==0)throw Error('INVALID_ACQUISITION_RECEIPT');
  return result;
}
async function read(env,task){const result=await env.MEDIA.read(intent(env,task,'media.read'));
  if(result?.company_id!==COMPANY||result.engine_id!==ENGINE||result.environment!==ENV||result.asset_id!==task.asset_id||
     result.license!=='CC0-1.0'||result.production_approved!==false||!(result.bytes instanceof Uint8Array))throw Error('INVALID_MEDIA_READ');
  const bytes=result.bytes;
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(sha!==result.sha256)throw Error('MEDIA_HASH_MISMATCH');
  return {asset_id:result.asset_id,bytes:bytes.length,sha256:sha,rights_review:'PENDING',production_approved:false};
}
export class ProducerLibraryLab extends WorkerEntrypoint {
  async search(task){return search(this.env,task)}
  async acquire(task){return acquire(this.env,task)}
  async read(task){return read(this.env,task)}
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})},
 async scheduled(controller,env,ctx){
  if(controller.cron!=='* * * * *')return;
  ctx.waitUntil((async()=>{
   const key='meta/ums001-producer-binding-acceptance-2026-11-10';
   if(await env.LAB_KV.get(key))return;
   await env.LAB_KV.put(key,JSON.stringify({status:'STARTED',at:new Date().toISOString()}));
   const task={company_id:COMPANY,engine_id:ENGINE,environment:ENV,kind:'hdris',asset_id:'sunset_jhbcentral',
      request_id:'UMS001-BINDING-20261110-A',query:'sunset'};
   try{
    const matches=await search(env,task);
    const receipt=await acquire(env,task);
    const file=await read(env,task);
    if(file.sha256!==receipt.sha256||file.bytes!==receipt.bytes)throw Error('HANDOFF_BYTES_MISMATCH');
    const proof={status:'COMPLETED',at:new Date().toISOString(),engine_id:ENGINE,environment:ENV,
      searched:true,matching_candidates:matches.results.length,selected:task.asset_id,receipt_status:receipt.status,
      bytes:file.bytes,sha256:file.sha256,private_service_binding_verified:true,production_approved:false,cost_eur:0};
    await env.LAB_KV.put(key,JSON.stringify(proof));
   }catch(e){await env.LAB_KV.put(key,JSON.stringify({status:'ERROR',at:new Date().toISOString(),code:String(e?.message||e).slice(0,180)}));}
  })());
 }
};