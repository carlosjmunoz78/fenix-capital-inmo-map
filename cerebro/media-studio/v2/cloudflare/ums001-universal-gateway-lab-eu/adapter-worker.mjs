/** UMS001 universal motor-origin adapter LAB, private. No provider, publication, video generation or paid calls.
 * A motor calls a private WorkerEntrypoint with its own Cloudflare secret token.
 * This signer holds per-engine keys in one encrypted Cloudflare secret binding.
 * Future engines only need IAM registry entries, not a new emitter implementation.
 */
import {WorkerEntrypoint} from 'cloudflare:workers';
import {validateMediaJob,canonical} from './core.mjs';
const INBOX='cerebro-ums001-engine-intake-lab-eu';
const unpack=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const pack=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const enc=s=>new TextEncoder().encode(s);
async function constantTimeToken(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length<32||b.length<32||a.length>500||b.length>500)return false;
 const [aa,bb]=await Promise.all([crypto.subtle.digest('SHA-256',enc(a)),crypto.subtle.digest('SHA-256',enc(b))]);
 let v=0;const A=new Uint8Array(aa),B=new Uint8Array(bb);for(let i=0;i<A.length;i++)v|=A[i]^B[i];return v===0;
}
export async function submitAuthorized(env,request,originToken){
 if(env?.ADAPTER_ENABLED!=='true'||!env?.OUT_QUEUE||typeof env.OUT_QUEUE.send!=='function'||typeof env.SIGNER_KEYS_JSON!=='string')throw Error('ADAPTER_OFF');
 validateMediaJob(request);
 const profiles=JSON.parse(env.SIGNER_KEYS_JSON);
 if(!Array.isArray(profiles)||profiles.length>50)throw Error('SIGNER_CONFIG');
 const allowed=profiles.find(x=>x.engine_id===request.origin_engine_id&&x.company_id===request.company_id&&x.environment==='LAB');
 if(!allowed||!await constantTimeToken(originToken,allowed.caller_token))throw Error('ORIGIN_NOT_AUTHENTICATED');
 if(!allowed.channels.includes(request.channel_id)||!allowed.kinds.includes(request.asset_kind))throw Error('ORIGIN_CAPABILITY_DENIED');
 if(!/^UMS001-LAB-[A-Z0-9-]{8,90}$/.test(allowed.key_id||''))throw Error('KEY_ID');
 const privateKey=await crypto.subtle.importKey('pkcs8',unpack(allowed.private_pkcs8_base64),{name:'Ed25519'},false,['sign']);
 const unsigned={schema_version:1,key_id:allowed.key_id,issuer:request.origin_engine_id,
  sent_at_utc:new Date().toISOString(),nonce:crypto.randomUUID(),payload:request};
 const signature=pack(await crypto.subtle.sign('Ed25519',privateKey,enc(canonical(unsigned))));
 await env.OUT_QUEUE.send({...unsigned,signature});
 return {status:'SIGNED_REQUEST_QUEUED',request_id:request.request_id,origin_engine_id:request.origin_engine_id,
  company_id:request.company_id,engine_id:'UMS-001',environment:'LAB',
  paid_execution_authorized:false,publication_authorized:false,video_execution_authorized:false,cost_eur:0};
}
export class UniversalMediaRequestAdapter extends WorkerEntrypoint{
 async submit(request,originToken){return submitAuthorized(this.env,request,originToken)}
}
export default {
 async queue(batch,env){
  if(batch.queue!==INBOX||env.ADAPTER_ENABLED!=='true')throw Error('ADAPTER_QUEUE_DENIED');
  for(const msg of batch.messages){
   try{await submitAuthorized(env,msg.body?.request,msg.body?.origin_token);msg.ack()}
   catch(e){console.error('UMS001_EMITTER_REJECTED',String(e.message||'UNKNOWN').replace(/[^A-Z0-9_]/g,'_').slice(0,85));msg.ack()}
  }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}})}
};
