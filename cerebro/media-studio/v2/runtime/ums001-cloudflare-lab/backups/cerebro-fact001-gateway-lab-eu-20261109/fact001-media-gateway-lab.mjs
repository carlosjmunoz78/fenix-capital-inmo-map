/**
 * FACT-001 LAB -> UMS-001 LAB private adapter. Does not enable the FACT global gateway.
 * Calls ONLY the existing ProducerLibraryLab via a private Cloudflare Service Binding.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {routeMediaProductionResource} from './ums001-producer-orchestrator-bridge-lab.mjs';
import {consumeUMS001QueueCommand} from './fact001-ums001-queue-core.mjs';
import {consumeUMS001DiscoveryCommand} from './fact001-ums001-discovery-queue-core.mjs';

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
 if(!['SEARCH','LATEST','SELECT','READ'].includes(request.action))throw Error('FACT_UMS_ACTION_DENIED');
 if(!['SEARCH','LATEST'].includes(request.action)&&(request.provider!=='met'||request.kind!=='images'||request.selected_asset_id!==RESOURCE_ID||request.explicit_selection!==true))throw Error('FACT_UMS_RESOURCE_DENIED');
 if(request.publish_requested===true||request.auto_publish===true||request.production_approved===true||request.expected_cost_eur>0)throw Error('FACT_UMS_SIDE_EFFECT_DENIED');
 // Gateway identity is minted exclusively after validating the private service caller.
 const permission=['SEARCH','LATEST'].includes(request.action)?'media.search':request.action==='SELECT'?'media.acquire':'media.read';
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
 async queue(batch,env){
  if(batch.queue!=='cerebro-fact001-ums001-read-lab-eu'||env.UMS001_QUEUE_ENABLED!=='true')throw Error('FACT_UMS_QUEUE_WRONG_SOURCE_OR_DISABLED');
  for(const message of batch.messages){
   try{
    if(message.body?.action==='READ')await consumeUMS001QueueCommand(message.body,env,executeFactUMS001Lab);
    else await consumeUMS001DiscoveryCommand(message.body,env,executeFactUMS001Lab);
    message.ack();}
   catch(error){console.error('UMS001_QUEUE_REJECTED',String(error?.message||'UNKNOWN').slice(0,120));message.ack();}
  }
 },
 async fetch(){return new Response(DENIED_RESPONSE,{status:403,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
};