// CEREBRO OS · LAB-CF-CANARY-001 · Queue consumer V0.3.
// This worker has NO public routes, NO cron, NO external network and NO model/third-party calls.
// A queue message may change only a receipt in its own dedicated KV namespace.
export const IDENTITY=Object.freeze({
  company_id:"fenix",engine_id:"LAB-CF-CANARY-001",environment:"LAB",version:"0.3.0",
  queue_name:"cerebro-operativa-control-canary-queue-lab-eu"
});
const JOB_ID=/^labcf-[a-z0-9-]{12,52}$/;
const IDEMPOTENCY_KEY=/^labcfkey-[a-z0-9-]{12,52}$/;
const HEADERS=Object.freeze({"content-type":"text/plain; charset=utf-8","cache-control":"private, no-store",
  "x-content-type-options":"nosniff"});
const exactKeys=(value,keys)=>value!==null&&typeof value==="object"&&!Array.isArray(value)&&
  Object.keys(value).sort().join("|")===keys.slice().sort().join("|");
const frozenReceipt=(body,status,execution,metadata={})=>Object.freeze({
 schema_version:"1.0.0",company_id:IDENTITY.company_id,engine_id:IDENTITY.engine_id,
 environment:IDENTITY.environment,version:IDENTITY.version,job_id:body.job_id,
 idempotency_key:body.idempotency_key,priority:body.priority,action:body.action,status,work_units:execution,
 external_actions:0,paid_ai_calls:0,additional_cost_eur:0,queue_name:IDENTITY.queue_name,...metadata
});
export function validateLabMessage(body){
 const keys=["schema_version","company_id","engine_id","environment","version","job_id",
  "idempotency_key","action","work_units","priority","cost_eur","external_actions_allowed"];
 if(!exactKeys(body,keys))return false;
 return body.schema_version==="1.0.0"&&body.company_id===IDENTITY.company_id&&
 body.engine_id===IDENTITY.engine_id&&body.environment===IDENTITY.environment&&
 body.version===IDENTITY.version&&typeof body.job_id==="string"&&JOB_ID.test(body.job_id)&&
 typeof body.idempotency_key==="string"&&IDEMPOTENCY_KEY.test(body.idempotency_key)&&
 body.action==="TICK_ONLY"&&body.work_units===1&&Number.isInteger(body.priority)&&
 body.priority>=1&&body.priority<=5&&body.cost_eur===0&&body.external_actions_allowed===false;
}
export function canaryState(env){
 const raw=env?.CONTROL_PAUSED;
 return Object.freeze({
  company_id:IDENTITY.company_id,engine_id:IDENTITY.engine_id,environment:IDENTITY.environment,
  paused:raw!=="false",binding_verified:raw==="false"||raw==="true",
  can_execute_external_work:false,can_fetch_publicly:false,autonomous_scheduler:false
 });
}
export function decideLabMessage(body,env){
 if(!validateLabMessage(body))return Object.freeze({status:"REJECTED_CONTRACT",work_units:0,receipt_allowed:false});
 const state=canaryState(env);
 return Object.freeze({status:state.paused?"PAUSED_SKIPPED":"WORK_UNIT_ACK",
  work_units:state.paused?0:1,receipt_allowed:true});
}
export async function processLabBatch(batch,env){
 if(batch?.queue!==IDENTITY.queue_name||!Array.isArray(batch.messages)||
    batch.messages.length>1||!env?.RECEIPT_KV||typeof env.RECEIPT_KV.get!=="function"||
    typeof env.RECEIPT_KV.put!=="function")throw new Error("LAB_QUEUE_CONTRACT_DENIED");
 let acknowledgements=0;
 for(const message of batch.messages){
  const body=message?.body;
  const decision=decideLabMessage(body,env);
  if(!decision.receipt_allowed){
   // Invalid messages must not retry indefinitely. No state change.
   console.log("CEREBRO_CF_CANARY_QUEUE_REJECTED_CONTRACT");
   message.ack();acknowledgements++;continue;
  }
  const key="receipt:"+body.idempotency_key;
  // KV is eventually consistent: de-duplication is best effort, NOT a transactional exactly-once guarantee.
  const existing=await env.RECEIPT_KV.get(key);
  if(existing!==null){
   try{const saved=JSON.parse(existing);
    if(saved.job_id===body.job_id&&saved.idempotency_key===body.idempotency_key&&saved.priority===body.priority&&saved.action===body.action&&
       ["PAUSED_SKIPPED","WORK_UNIT_ACK"].includes(saved.status)){
      message.ack();acknowledgements++;continue;
    }
   }catch{}
   // Conflicting or malformed receipt: stop rather than overwrite.
   throw new Error("LAB_RECEIPT_CONFLICT");
  }
  const receipt=frozenReceipt(body,decision.status,decision.work_units,
    {received_at:new Date().toISOString(),observed_pause:canaryState(env).paused});
  await env.RECEIPT_KV.put(key,JSON.stringify(receipt),{expirationTtl:86400});
  message.ack();acknowledgements++;
  console.log("CEREBRO_CF_CANARY_QUEUE_RECEIPT",JSON.stringify({
    job_id:body.job_id,status:receipt.status,work_units:receipt.work_units,external_actions:0
  }));
 }
 return acknowledgements;
}
export default Object.freeze({
 async fetch(){return new Response("Not Found",{status:404,headers:HEADERS});},
 async scheduled(){return "NO_CRON_CONFIGURED";},
 async queue(batch,env){return processLabBatch(batch,env);}
});
