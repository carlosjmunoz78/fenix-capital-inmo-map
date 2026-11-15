import {test} from "node:test";import assert from "node:assert/strict";
import worker,{IDENTITY,validateLabMessage,canaryState,decideLabMessage,processLabBatch} from "./worker.queue-v0.mjs";
const msg=(id="labcf-pilot-00000000001",priority=3)=>({
 schema_version:"1.0.0",company_id:"fenix",engine_id:"LAB-CF-CANARY-001",environment:"LAB",version:"0.3.0",
 job_id:id,idempotency_key:"labcfkey-"+id.slice(6),action:"TICK_ONLY",
 work_units:1,priority,cost_eur:0,external_actions_allowed:false
});
function fixture(body,paused="true"){
 const data=new Map(),acks=[];
 const env={CONTROL_PAUSED:paused,RECEIPT_KV:{
  async get(key){return data.has(key)?data.get(key):null},
  async put(key,value,options){assert.equal(options.expirationTtl,86400);data.set(key,value)}
 }};
 const message={body,ack(){acks.push(body.job_id)}};
 return {env,batch:{queue:IDENTITY.queue_name,messages:[message]},data,acks};
}
test("default deny: only the exact identity, strict payload and safe zero-cost tick",()=>{
 assert.ok(validateLabMessage(msg()));
 assert.equal(canaryState({}).paused,true);
 assert.equal(canaryState({CONTROL_PAUSED:"TRUE"}).paused,true);
 assert.equal(canaryState({CONTROL_PAUSED:"false"}).paused,false);
 const original=msg();
 for(const update of [
  {company_id:"another"}, {environment:"PROD"},{engine_id:"SEO-001"},{version:"0.2.0"},
  {priority:0},{priority:6},{cost_eur:1},{external_actions_allowed:true},
  {action:"PUBLISH"},{work_units:2},{idempotency_key:"unauthorized"},{unexpected:123}
 ])assert.equal(validateLabMessage({...original,...update}),false,JSON.stringify(update));
 assert.equal(decideLabMessage(original,{CONTROL_PAUSED:"true"}).status,"PAUSED_SKIPPED");
 assert.equal(decideLabMessage(original,{CONTROL_PAUSED:"false"}).status,"WORK_UNIT_ACK");
 assert.equal(decideLabMessage(original,{CONTROL_PAUSED:"false"}).work_units,1);
});
test("paused queue message is acknowledged with durable PAUSED_SKIPPED receipt, zero work",async()=>{
 const x=fixture(msg());
 assert.equal(await processLabBatch(x.batch,x.env),1);
 assert.equal(x.acks.length,1);
 const receipt=JSON.parse(x.data.get("receipt:"+msg().idempotency_key));
 assert.equal(receipt.status,"PAUSED_SKIPPED");assert.equal(receipt.work_units,0);
 assert.equal(receipt.external_actions,0);assert.equal(receipt.additional_cost_eur,0);
 assert.equal(receipt.observed_pause,true);
});
test("resumed one unit creates receipt; duplicate message does not write twice",async()=>{
 const x=fixture(msg(),"false");let calls=0;
 const originalPut=x.env.RECEIPT_KV.put;
 x.env.RECEIPT_KV.put=async(...args)=>{calls++;await originalPut(...args)};
 assert.equal(await processLabBatch(x.batch,x.env),1);
 assert.equal(JSON.parse(x.data.get("receipt:"+msg().idempotency_key)).status,"WORK_UNIT_ACK");
 assert.equal(JSON.parse(x.data.get("receipt:"+msg().idempotency_key)).work_units,1);
 assert.equal(await processLabBatch(x.batch,x.env),1);
 assert.equal(calls,1);
 assert.equal(x.acks.length,2);
});
test("rejects mismatched queue, batch size, missing KV and conflicting receipt",async()=>{
 const x=fixture(msg());
 await assert.rejects(processLabBatch({...x.batch,queue:"social-production-queue"},x.env),/DENIED/);
 await assert.rejects(processLabBatch({...x.batch,messages:[x.batch.messages[0],x.batch.messages[0]]},x.env),/DENIED/);
 await assert.rejects(processLabBatch(x.batch,{CONTROL_PAUSED:"false"}),/DENIED/);
 x.data.set("receipt:"+msg().idempotency_key,JSON.stringify({job_id:"another"}));
 await assert.rejects(processLabBatch(x.batch,x.env),/LAB_RECEIPT_CONFLICT/);
 assert.equal(x.acks.length,0);
});
test("malformed queue message is acknowledged with NO storage mutation or external calls",async()=>{
 const x=fixture({...msg(),environment:"PROD"});
 assert.equal(await processLabBatch(x.batch,x.env),1);
 assert.equal(x.data.size,0);
 assert.equal(x.acks.length,1);
});
test("HTTP and scheduled entrypoints are inert, cannot leak data or produce",async()=>{
 const r=await worker.fetch();
 assert.equal(r.status,404);
 assert.equal(await r.text(),"Not Found");
 assert.equal(await worker.scheduled(),"NO_CRON_CONFIGURED");
 const {readFileSync}=await import("node:fs");
 const code=readFileSync(new URL("./worker.queue-v0.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(code,/\bfetch\s*\(|https:\/\/|buffer\.com|instagram\.com|facebook\.com|groq\.com/i);
 assert.doesNotMatch(code,/\.send\(|\.prepare\(|\.run\(|\.exec\(|\bPOST\b|\bPUT\b/i);
});
