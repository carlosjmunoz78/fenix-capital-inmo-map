/**
 * FACT-001 LAB -> UMS-001 LAB private adapter. Does not enable the FACT global gateway.
 * Calls ONLY the existing ProducerLibraryLab via a private Cloudflare Service Binding.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {routeMediaProductionResource} from './ums001-producer-orchestrator-bridge-lab.mjs';

const SCOPE = Object.freeze({company_id:'fenix',engine_id:'UMS-001',environment:'LAB'});
const DENIED_RESPONSE='{"status":"DISABLED","engine_id":"FACT-001","environment":"LAB","executed":false}';
const RESOURCE_ID='met:436524';

async function sameToken(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<32||b.length<32)return false;
 const enc=new TextEncoder();
 const [left,right]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
 const l=new Uint8Array(left),r=new Uint8Array(right);let delta=0;
 for(let i=0;i<l.length;i++)delta|=l[i]^r[i];
 return delta===0;
}
export async function executeFactUMS001Lab(env,command){
 if(env?.UMS001_PRIVATE_BINDING_ENABLED!=='true')throw Error('FACT_UMS_BINDING_DISABLED');
 if(!env.UMS_PRODUCER||typeof env.UMS_PRODUCER.readSelected!=='function')throw Error('FACT_UMS_PRODUCER_BINDING_MISSING');
 if(!await sameToken(command?.private_token,env.UMS001_CALLER_TOKEN))throw Error('FACT_UMS_PRIVATE_AUTH_DENIED');
 const request=command?.request;
 if(!request||typeof request!=='object'||Object.entries(SCOPE).some(([k,v])=>request[k]!==v))throw Error('FACT_UMS_SCOPE_DENIED');
 if(!['SEARCH','SELECT','READ'].includes(request.action))throw Error('FACT_UMS_ACTION_DENIED');
 if(request.action!=='SEARCH'&&(request.provider!=='met'||request.kind!=='images'||request.selected_asset_id!==RESOURCE_ID||request.explicit_selection!==true))throw Error('FACT_UMS_RESOURCE_DENIED');
 if(request.publish_requested===true||request.auto_publish===true||request.production_approved===true||request.expected_cost_eur>0)throw Error('FACT_UMS_SIDE_EFFECT_DENIED');
 // Gateway identity is minted exclusively after validating the private service caller.
 const permission=request.action==='SEARCH'?'media.search':request.action==='SELECT'?'media.acquire':'media.read';
 const identity={gateway_verified:true,company_id:'fenix',environment:'LAB',actor_id:'cerebro-orchestrator-lab',scopes:[permission]};
 const result=await routeMediaProductionResource({request,identity,producerService:env.UMS_PRODUCER});
 if(result?.publish_authorized!==false||result?.production_approved===true||result?.cost_eur>0)throw Error('FACT_UMS_UNSAFE_REPLY');
 return result;
}
export class CEREBROFactUMS001Lab extends WorkerEntrypoint {
 async route(command){return executeFactUMS001Lab(this.env,command);}
}
// Preserve the FACT-001 Worker’s exact existing public response and disabled behavior.
export default {
 async scheduled(controller,env,ctx){
  if(controller.cron!=='* * * * *'||env.UMS001_PRIVATE_BINDING_ENABLED!=='true')return;
  if(!env.LAB_KV)throw Error('FACT_UMS_PROBE_KV_MISSING');
  const key='meta/fact001-ums001-private-bridge-e2e-20261110';
  if(await env.LAB_KV.get(key))return;
  await env.LAB_KV.put(key,JSON.stringify({status:'STARTED',at:new Date().toISOString()}));
  ctx.waitUntil((async()=>{
   const request={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images',action:'READ',
    production_id:'UMS001-LAB-TEST',request_id:'UMS001-SELECT-20261110-01',selected_asset_id:'met:436524',explicit_selection:true};
   try{
    let authDenied=false;
    try{await executeFactUMS001Lab(env,{private_token:'WRONG',request});}
    catch(e){authDenied=e?.message==='FACT_UMS_PRIVATE_AUTH_DENIED';}
    if(!authDenied)throw Error('FACT_PROBE_AUTH_GATE_FAILED');
    let scopeDenied=false;
    try{await executeFactUMS001Lab(env,{private_token:env.UMS001_CALLER_TOKEN,request:{...request,environment:'PROD'}});}
    catch(e){scopeDenied=e?.message==='FACT_UMS_SCOPE_DENIED';}
    if(!scopeDenied)throw Error('FACT_PROBE_SCOPE_GATE_FAILED');
    const result=await executeFactUMS001Lab(env,{private_token:env.UMS001_CALLER_TOKEN,request});
    const expected='e84f82f453c52151d3a28ef22a22faeefdd5dda51f656c4b089c4b88dab8b508';
    if(result.status!=='CANDIDATE_BYTES_VERIFIED_NOT_PUBLISHED'||result.asset_id!=='met:436524'||
      !(result.bytes instanceof Uint8Array)||result.bytes.length!==208766||result.sha256!==expected||
      result.production_approved!==false||result.publish_authorized!==false)throw Error('FACT_UMS_PROBE_READ_INVALID');
    await env.LAB_KV.put(key,JSON.stringify({status:'COMPLETED',at:new Date().toISOString(),
      route:'FACT001_LAB_PRIVATE_SERVICE_BINDING_TO_UMS001_PRODUCER_LAB',
      source_worker:'cerebro-fact001-gateway-lab-eu-20261109',
      target_worker:'cerebro-ums001-producer-private-gateway-lab-eu',
      provider:'met',asset_id:'met:436524',sha256:result.sha256,bytes:result.bytes.length,
      private_auth_rejection_verified:authDenied,cross_environment_rejection_verified:scopeDenied,
      produced_no_additional_download:true,production_approved:false,publish_authorized:false,additional_cost_eur:0}));
   }catch(e){await env.LAB_KV.put(key,JSON.stringify({status:'ERROR',at:new Date().toISOString(),
     code:String(e?.message||e).slice(0,110),publish_authorized:false}));}
  })());
 },
 async fetch(){return new Response(DENIED_RESPONSE,{status:403,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
};