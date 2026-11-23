
// NIA ONLY: scoped, signed, zero-cost discovery. Original UMS queue remains unchanged.
import {signNiaDiscoveryLabV1} from './nia-private-dispatch-v1.mjs';
const NIA_INPUT_QUEUE='cerebro-fact001-nia-request-lab-eu';
const NIA_TOPIC=new Set(['documentation','knowledge','research','meeting-notes','notion-skills','notion-events']);
async function executeFactNiaLab(env,topic,alreadyHandled=false){
 if(env?.NIA_ISSUER_ENABLED!=='true'||!env.NIA_RECEIVER||typeof env.NIA_RECEIVER.dispatchSignedEnvelope!=='function'||
    typeof env.CEREBRO_NIA_DISPATCH_HMAC_KEY!=='string'||env.CEREBRO_NIA_DISPATCH_HMAC_KEY.length<48)
  throw Error('FACT_NIA_DISABLED_OR_UNBOUND');
 if(!NIA_TOPIC.has(topic)||typeof alreadyHandled!=='boolean')throw Error('FACT_NIA_SCOPE_DENIED');
 const id=crypto.randomUUID();
 const signed=await signNiaDiscoveryLabV1({secret:env.CEREBRO_NIA_DISPATCH_HMAC_KEY,topic,already_handled:alreadyHandled,
   nonce:id,idempotency_key:'nia_lab_'+id.replaceAll('-','')});
 return env.NIA_RECEIVER.dispatchSignedEnvelope(signed);
}
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

function mediaPrincipal(engineId){
 if(typeof engineId!=='string'||!/^[A-Z][A-Z0-9-]{2,63}$/.test(engineId))throw Error('FACT_MEDIA_ORIGIN_DENIED');
 return {company_id:'fenix',engine_id:engineId,environment:'LAB',
  scopes:['IMAGE.SYNTHETIC'],verified_by:'CEREBRO_GATEWAY_RUNTIME_LAB'};
}
async function brokerScope(env,engineId,callerToken){
 if(env.UNIVERSAL_IMAGE_RUNTIME_ENABLED!=='true'||!env.UMS001_RUNTIME_BROKER||
  typeof env.CEREBRO_RUNTIME_CALLER_TOKEN!=='string'||!await sameToken(callerToken,env.CEREBRO_RUNTIME_CALLER_TOKEN))
  throw Error('CEREBRO_MEDIA_RUNTIME_IAM_DENIED');
 return mediaPrincipal(engineId);
}

async function runtimePrincipal(env,runtimeId,engineId,token){
 if(env.UNIVERSAL_RUNTIME_IAM_ENABLED!=='true'||env.UNIVERSAL_IMAGE_RUNTIME_ENABLED!=='true'||
 !env.LAB_KV||!env.UMS001_RUNTIME_BROKER)throw Error('UMS001_RUNTIME_IAM_OFF');
 if(typeof runtimeId!=='string'||!/^[A-Z][A-Z0-9-]{2,63}$/.test(runtimeId)||
 !/^[A-Z][A-Z0-9-]{2,63}$/.test(engineId||'')||
 typeof token!=='string'||token.length<48||token.length>256)throw Error('UMS001_RUNTIME_IDENTITY_DENIED');
 const record=await env.LAB_KV.get('meta/cerebro-runtime-iam/v1/'+runtimeId,{type:'json'});
 if(!record||record.schema_version!==1||record.runtime_id!==runtimeId||
 record.company_id!=='fenix'||record.environment!=='LAB'||record.enabled!==true||
 typeof record.engine_prefix!=='string'||!/^[A-Z][A-Z0-9-]{1,28}-$/.test(record.engine_prefix)||
 !engineId.startsWith(record.engine_prefix)||
 !Array.isArray(record.capabilities)||record.capabilities.length!==1||
 record.capabilities[0]!=='IMAGE.SYNTHETIC'||
 !/^[0-9a-f]{64}$/.test(record.token_sha256||''))throw Error('UMS001_RUNTIME_SCOPE_DENIED');
 const observed=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))))
 .map(x=>x.toString(16).padStart(2,'0')).join('');
 let mismatch=0;for(let i=0;i<64;i++)mismatch|=observed.charCodeAt(i)^record.token_sha256.charCodeAt(i);
 if(mismatch)throw Error('UMS001_RUNTIME_TOKEN_DENIED');
 return mediaPrincipal(engineId);
}
// NIA adds one separate RPC method, guarded by dedicated caller token and switch.
export class CEREBROFactUMS001Lab extends WorkerEntrypoint {
 async niaDiscoveryFromRuntime(topic,alreadyHandled,callerToken){
  if(this.env.NIA_ISSUER_ENABLED!=='true'||
     !await sameToken(callerToken,this.env.NIA_LAB_CALLER_TOKEN))throw Error('FACT_NIA_RUNTIME_DENIED');
  return executeFactNiaLab(this.env,topic,alreadyHandled);
 }

 async universalImageFromRuntime(runtimeId,engineId,action,command,callerToken){
  const principal=await runtimePrincipal(this.env,runtimeId,engineId,callerToken);
  const broker=this.env.UMS001_RUNTIME_BROKER;
  const capability=await broker.capability(principal,this.env.GATEWAY_CALLER_TOKEN);
  if(action==='CAPABILITY')return capability;
  if(capability?.status!=='READY_AUTHENTICATED')throw Error('UMS001_ENGINE_NOT_ENROLLED');
  if(action==='REQUEST')return broker.submit(principal,command,this.env.GATEWAY_CALLER_TOKEN);
  if(action==='STATUS')return broker.receipt(principal,command,this.env.GATEWAY_CALLER_TOKEN);
  if(action==='DOWNLOAD')return broker.privateJPEG(principal,command,this.env.GATEWAY_CALLER_TOKEN);
  throw Error('UMS001_RUNTIME_ACTION_DENIED');
 }

 async universalImageCapability(engineId,callerToken){const principal=await brokerScope(this.env,engineId,callerToken);return this.env.UMS001_RUNTIME_BROKER.capability(principal,this.env.GATEWAY_CALLER_TOKEN);}
 async universalImageRequest(engineId,command,callerToken){
  const principal=await brokerScope(this.env,engineId,callerToken);
  return this.env.UMS001_RUNTIME_BROKER.submit(principal,command,this.env.GATEWAY_CALLER_TOKEN);
 }
 async universalImageStatus(engineId,command,callerToken){
  const principal=await brokerScope(this.env,engineId,callerToken);
  return this.env.UMS001_RUNTIME_BROKER.receipt(principal,command,this.env.GATEWAY_CALLER_TOKEN);
 }
 async universalImagePrivateJPEG(engineId,command,callerToken){
  const principal=await brokerScope(this.env,engineId,callerToken);
  return this.env.UMS001_RUNTIME_BROKER.privateJPEG(principal,command,this.env.GATEWAY_CALLER_TOKEN);
 }

 async route(command){return executeFactUMS001Lab(this.env,command);}
}
// Preserve the FACT-001 Worker’s exact existing public response and disabled behavior.
export default {
 async queue(batch,env){
  // Exclusive NIA queue does not intercept existing FACT/UMS traffic.
  if(batch.queue===NIA_INPUT_QUEUE){
   if(env.NIA_ISSUER_ENABLED!=='true')throw Error('FACT_NIA_OFF');
   for(const msg of batch.messages){
    try{
     const body=msg.body;
     const keys=body&&typeof body==='object'&&!Array.isArray(body)?Object.keys(body):[];
     if(body?.type!=='NIA_FACT_PRIVATE_DISCOVERY_V1'||body?.company_id!=='fenix'||
      body?.engine_id!=='ACTGW-001'||!NIA_TOPIC.has(body?.topic)||
      keys.some(k=>!['type','company_id','engine_id','topic','already_handled'].includes(k)))
       throw Error('FACT_NIA_REQUEST_DENIED');
     const result=await executeFactNiaLab(env,body.topic,body.already_handled??false);
     console.log('FACT_NIA_PRIVATE_RESULT='+
      (result?.status==='DISPATCH_RECORDED'?'PASS':'BLOCKED'));
     msg.ack();
    }catch{console.log('FACT_NIA_PRIVATE_RESULT=BLOCKED');msg.ack();}
   }
   return;
  }

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