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
  if(env.GATEWAY_ENABLED!=='true')throw Error('GATEWAY_DISABLED');
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
async function searchFreeMedia(env,task){
 if(env.GATEWAY_ENABLED!=='true'||env.SOURCE_SCOUT_ENABLED!=='true')throw Error('SCOUT_GATEWAY_DISABLED');
 if(!task||task.company_id!==COMPANY||task.engine_id!==ENGINE||task.environment!==ENV||
 task.provider!=='ambientcg'||!['textures','hdris','models','decals'].includes(task.kind)||
 typeof task.query!=='string'||task.query.length<3||task.query.length>120)throw Error('SCOUT_REQUEST_INVALID');
 if(!env.SOURCE_SCOUT||typeof env.SOURCE_SCOUT.search!=='function'||
 typeof env.SOURCE_SCOUT_TOKEN!=='string'||env.SOURCE_SCOUT_TOKEN.length<32)throw Error('SCOUT_PRIVATE_BINDING_REQUIRED');
 const result=await env.SOURCE_SCOUT.search({...task,actor_id:'ums001-producer-lab',permission:'media.search',
 auth_token:env.SOURCE_SCOUT_TOKEN});
 if(result?.company_id!==COMPANY||result?.engine_id!==ENGINE||result?.environment!==ENV||
 result?.provider!=='ambientcg'||result.mode!=='METADATA_ONLY'||result.downloaded!==false||
 !Array.isArray(result.results)||result.results.length>8||result.results.some(x=>x.license!=='CC0-1.0'||x.downloaded!==false||x.production_approved!==false))
 throw Error('SCOUT_INVALID_RESPONSE');
 return {company_id:COMPANY,engine_id:ENGINE,environment:ENV,mode:'METADATA_ONLY',provider:'ambientcg',
 results:result.results,downloaded:false,production_approved:false,additional_cost_eur:0};
}
export class ProducerLibraryLab extends WorkerEntrypoint {
  async search(task){return search(this.env,task)}
  async acquire(task){return acquire(this.env,task)}
  async read(task){return read(this.env,task)}
  async scout(task){return searchFreeMedia(this.env,task)}
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})},
 async scheduled(controller,env,ctx){
  if(controller.cron==='* * * * *' && env.GATEWAY_ENABLED==='true' && env.SOURCE_SCOUT_ENABLED==='true'){
    const key='meta/ums001-ambientcg-private-rpc-2026-11-10';
    if(await env.LAB_KV.get(key))return;
    await env.LAB_KV.put(key,JSON.stringify({status:'STARTED',at:new Date().toISOString()}));
    ctx.waitUntil((async()=>{
      try{
        const result=await searchFreeMedia(env,{company_id:'fenix',engine_id:'UMS-001',environment:'LAB',
          provider:'ambientcg',kind:'textures',query:'wood'});
        if(result.mode!=='METADATA_ONLY'||result.downloaded!==false||result.results.length<1)throw Error('EMPTY_OR_INVALID_METADATA');
        await env.LAB_KV.put(key,JSON.stringify({status:'COMPLETED',at:new Date().toISOString(),provider:'ambientcg',
          count:result.results.length,license_cc0_only:result.results.every(x=>x.license==='CC0-1.0'),
          private_service_binding_verified:true,downloaded:false,production_approved:false,additional_cost_eur:0}));
      }catch(e){await env.LAB_KV.put(key,JSON.stringify({status:'ERROR',at:new Date().toISOString(),reason:String(e?.message||e).slice(0,160)}));}
    })());return;
  }
  if(controller.cron==='* * * * *' && env.GATEWAY_ENABLED==='true'){
   ctx.waitUntil((async()=>{
    const key='meta/ums001-producer-read-fix-2026-11-10';
    if(await env.LAB_KV.get(key))return;
    await env.LAB_KV.put(key,JSON.stringify({status:'STARTED',at:new Date().toISOString()}));
    const task={company_id:COMPANY,engine_id:ENGINE,environment:ENV,kind:'hdris',asset_id:'bambanani_sunset',query:'sunset',request_id:'UMS001-READ-FIX-20261110-A'};
    try{
     const candidates=await search(env,task);
     const rec=await acquire(env,task);
     const file=await read(env,task);
     if(rec.sha256!==file.sha256||rec.bytes!==file.bytes)throw Error('RECEIPT_MEDIA_MISMATCH');
     await env.LAB_KV.put(key,JSON.stringify({status:'COMPLETED',at:new Date().toISOString(),asset_id:file.asset_id,
      sha256:file.sha256,bytes:file.bytes,candidate_count:candidates.results.length,acquisition:rec.status,
      private_rpc:true,original_sha256_verified:true,production_approved:false,cost_eur:0}));
    }catch(e){await env.LAB_KV.put(key,JSON.stringify({status:'ERROR',at:new Date().toISOString(),code:String(e?.message||e).slice(0,180)}));}
   })());return;
  }
  if(controller.cron==='*/2 * * * *' && env.GATEWAY_ENABLED==='true'){
   ctx.waitUntil((async()=>{
    const key='meta/ums001-producer-new-download-2026-11-10';
    if(await env.LAB_KV.get(key))return;
    await env.LAB_KV.put(key,JSON.stringify({status:'STARTED',at:new Date().toISOString()}));
    const base={company_id:COMPANY,engine_id:ENGINE,environment:ENV,kind:'hdris',query:'sunset'};
    try{
     const results=await search(env,base);
     let receipt=null,last='NO_CANDIDATE';
     const candidates=results.results.filter(x=>x.known===false).slice(0,3);
     for(let i=0;i<candidates.length;i++){
      try{
       receipt=await acquire(env,{...base,asset_id:candidates[i].id,request_id:'UMS001-NEW-20261110-'+i});
       if(receipt.status==='STORED')break;
      }catch(e){last=String(e?.message||e).slice(0,80);receipt=null;}
     }
     if(!receipt||receipt.status!=='STORED')throw Error('NO_NEW_SMALL_FILE:'+last);
     const retrieved=await read(env,{...base,asset_id:receipt.asset_id});
     if(receipt.sha256!==retrieved.sha256||receipt.bytes!==retrieved.bytes)throw Error('HANDOFF_SHA_MISMATCH');
     await env.LAB_KV.put(key,JSON.stringify({status:'COMPLETED',at:new Date().toISOString(),asset_id:receipt.asset_id,
      bytes:retrieved.bytes,sha256:retrieved.sha256,selected_by:'ums001-producer-lab',downloaded:true,
      provider:'Poly Haven',license:'CC0-1.0',private_rpc:true,production_approved:false,paid_cost_eur:0}));
    }catch(e){await env.LAB_KV.put(key,JSON.stringify({status:'ERROR',at:new Date().toISOString(),code:String(e?.message||e).slice(0,180)}));}
   })());
   return;
  }
  if(controller.cron!=='* * * * *'||env.GATEWAY_ENABLED!=='true')return;
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