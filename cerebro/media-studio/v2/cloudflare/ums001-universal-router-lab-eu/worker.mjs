/* UMS-001 universal event bus LAB: private RPC + SQLite Durable Object ledger.
   Existing consumer media code, publishers, App/CRM, PROD are not modified. */
import {DurableObject,WorkerEntrypoint} from 'cloudflare:workers';
import {validate,canonical,hash,fingerprint,jobKey,hmac,verifyHmac,secretBinding,
 consumerAllowed,makeCanary,LAB_KEY_PREFIX} from './core.mjs';
const PREFIX=LAB_KEY_PREFIX;
const status=(state,code,req)=>({state,code,at:new Date().toISOString(),
 company_id:req.company_id,engine_id:'UMS-001',environment:'LAB',request_id:req.request_id,
 origin_engine_id:req.origin_engine_id,consumer_engine_id:req.consumer_engine_id,
 item_id:req.item_id,additional_cost_eur:0,automatic_publication:false,
 image_generated:false,video_generated:false,delivery_authorized:false});
export class MediaJobLedger extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;
   ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS jobs (job_key TEXT PRIMARY KEY, request_sha TEXT NOT NULL, company_id TEXT NOT NULL, origin_engine_id TEXT NOT NULL, request_id TEXT NOT NULL, item_id TEXT NOT NULL, state TEXT NOT NULL, code TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
 }
 async reserve({request,key,digest}){
  const s=status('ACCEPTED','UMS001_ORDER_ACCEPTED',request);const now=s.at;
  this.ctx.storage.sql.exec("INSERT OR IGNORE INTO jobs (job_key,request_sha,company_id,origin_engine_id,request_id,item_id,state,code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    key,digest,request.company_id,request.origin_engine_id,request.request_id,request.item_id,'ACCEPTED','UMS001_ORDER_ACCEPTED',now,now);
  const row=[...this.ctx.storage.sql.exec("SELECT * FROM jobs WHERE job_key=?",key)][0];
  if(!row||row.request_sha!==digest)throw Error('UMS001_JOB_KEY_CONFLICT');
  if(row.state==='ACCEPTED')await this.ctx.storage.setAlarm(Date.now()+1500);
  return {job_key:key,state:row.state,code:row.code,duplicate:row.created_at!==now};
 }
 async drain(){
  const items=[...this.ctx.storage.sql.exec("SELECT * FROM jobs WHERE state='ACCEPTED' LIMIT 10")];
  for(const row of items){
   // There is no authorized actual generator in this worker. Safe HOLD.
   const now=new Date().toISOString(),code='AWAITING_VERIFIED_GENERATOR_AND_QA';
   this.ctx.storage.sql.exec("UPDATE jobs SET state='HELD',code=?,updated_at=? WHERE job_key=? AND state='ACCEPTED'",code,now,row.job_key);
   await this.env.AUDIT_KV.put(PREFIX+row.origin_engine_id+'/'+row.request_id+'/'+row.item_id,
      JSON.stringify({state:'HELD',code,at:now,company_id:row.company_id,engine_id:'UMS-001',
       environment:'LAB',origin_engine_id:row.origin_engine_id,request_id:row.request_id,
       item_id:row.item_id,asset_sha256:null,provider_calls:0,additional_cost_eur:0,
       publication:false,kind:'LAB_VALIDATED_NO_GENERATION'}));
  }
  const pending=[...this.ctx.storage.sql.exec("SELECT job_key FROM jobs WHERE state='ACCEPTED' LIMIT 1")];
  if(pending.length)await this.ctx.storage.setAlarm(Date.now()+1500);
 }
 async alarm(){await this.drain();}
 async read(key){return [...this.ctx.storage.sql.exec("SELECT * FROM jobs WHERE job_key=?",key)][0]||null;}
 async stats(){return [...this.ctx.storage.sql.exec("SELECT state,COUNT(*) AS count FROM jobs GROUP BY state")];}
}
async function reserve(env,request,source='PRIVATE_UNIVERSAL_RPC_OR_CANARY'){
 validate(request);if(!consumerAllowed(request))throw Error('UMS001_UNREGISTERED_CONSUMER_ROUTE');
 const key=await jobKey(request),digest=await fingerprint(request);
 const stub=env.LEDGER.get(env.LEDGER.idFromName(request.company_id+'|'+request.environment));
 const receipt=await stub.reserve({request,key,digest});
 await env.AUDIT_KV.put(PREFIX+request.origin_engine_id+'/'+request.request_id+'/'+request.item_id,
   JSON.stringify({...status(receipt.state,receipt.code,request),idempotency_key:key,
    duplicate:receipt.duplicate,provider_calls:0,source}));
 return {...receipt,company_id:request.company_id,engine_id:'UMS-001',environment:'LAB',
   request_id:request.request_id,origin_engine_id:request.origin_engine_id,
   item_id:request.item_id,additional_cost_eur:0,publish_authorized:false,
   generation_authorized:false,delivery_authorized:false};
}
export class UniversalMediaRouter extends WorkerEntrypoint {
 async submit(request,signature){
   if(this.env.GATEWAY_ENABLED!=='true')throw Error('UMS001_GATEWAY_OFF');
   validate(request);
   const name=secretBinding(request.company_id,request.origin_engine_id);
   const secret=this.env[name];
   if(typeof secret!=='string'||secret.length<32||
      !await verifyHmac(secret,canonical(request),signature))throw Error('UMS001_ENGINE_IAM_DENIED');
   return reserve(this.env,request);
 }
 async status(request,signature){
   if(this.env.GATEWAY_ENABLED!=='true')throw Error('UMS001_GATEWAY_OFF');
   validate(request);
   const secret=this.env[secretBinding(request.company_id,request.origin_engine_id)];
   if(typeof secret!=='string'||secret.length<32||
      !await verifyHmac(secret,canonical(request),signature))throw Error('UMS001_STATUS_IAM_DENIED');
   const key=await jobKey(request),stub=this.env.LEDGER.get(this.env.LEDGER.idFromName(request.company_id+'|'+request.environment));
   const row=await stub.read(key);
   return row&&row.request_sha===await fingerprint(request)?{
      state:row.state,code:row.code,job_key:key,additional_cost_eur:0,publish_authorized:false}:null;
 }
}
export default {
 async scheduled(event,env){
   if(env.CANARY_ENABLED!=='true'||event.cron!=='* * * * *')return;
   const fixed='2026-11-12T13:00:00Z';
   // Self-test only: cannot claim independent Social/SEO bridge integration.
   for(const engine of ['SOC-001','SEO-001']){
     const request=makeCanary(engine,fixed);
     await reserve(env,request);
   }
 },
 async queue(batch,env){
   if(batch.queue!=='cerebro-ums001-universal-chatgpt-intake-lab-eu')
     throw Error('UMS001_UNEXPECTED_INTAKE_QUEUE');
   for(const message of batch.messages){
     let order=message.body;
     try{
       if(env.CHATGPT_QUEUE_ENABLED!=='true')throw Error('UMS001_CHATGPT_INTAKE_OFF');
       validate(order);
       if(order.origin_engine_id!=='CHATGPT-001'||order.trigger!=='CHATGPT')
         throw Error('UMS001_CHATGPT_ACCOUNT_QUEUE_SCOPE');
       const receipt=await reserve(env,order,'CLOUDFLARE_ACCOUNT_API_MANAGED_CHATGPT_QUEUE');
       message.ack();
     }catch(e){
       const safe=String(e?.message||'UNKNOWN').replace(/[^A-Z0-9_]/gi,'_').slice(0,100);
       try{
         await env.AUDIT_KV.put('meta/ums001-universal-deadletter/v1/'+String(message.id).slice(0,80),
          JSON.stringify({state:'HELD',code:safe,at:new Date().toISOString(),
           publication:false,paid_execution:false,provider_calls:0,engine_id:'UMS-001',
           environment:'LAB',source:'CLOUDFLARE_MANAGEMENT_QUEUE'}));
         message.ack();
       }catch{message.retry();}
     }
   }
 },
 async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});}
};
