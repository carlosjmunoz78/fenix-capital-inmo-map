// FACT001 CEREBRO Cloudflare autonomous operator LAB. Scheduled only, D1 ledger + secret binding.
// All Cloudflare writes are restricted to a literal disposable Worker. No HTTP route, no external business systems.
export const WORKER_NAME='cerebro-fact001-headless-operator-lab-20261111';
export const TARGET='cerebro-fact001-owned-worker-lab-20261111';
export const ID='FACT001-CF-HEADLESS-CRON-E2E-20261111-001';
export const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const HEAD={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const endpoint='https://api.cloudflare.com/client/v4/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/workers/scripts';
async function request(token,method,path,body){
 const headers={Authorization:'Bearer '+token,Accept:'application/json'};
 if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const result=await fetch(endpoint+path,{method,headers,
  ...(body!==undefined?{body:body instanceof FormData?body:JSON.stringify(body)}:{}),
  redirect:'manual',signal:AbortSignal.timeout(18000)});
 if(!result.ok)throw Error('CF_'+method+'_HTTP_'+result.status);
 if(method==='DELETE')return {success:true};
 const value=await result.json();
 if(value?.success!==true)throw Error('CF_'+method+'_INVALID');
 return value;
}
function bundle(v){
 const body="export default {async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store','X-Fact001-Version':'"+v+"'}})}};";
 const form=new FormData();
 form.append('metadata',new Blob([JSON.stringify({main_module:'index.mjs',compatibility_date:'2026-11-11',bindings:[]})],{type:'application/json'}));
 form.append('index.mjs',new Blob([body],{type:'application/javascript+module'}),'index.mjs');
 return form;
}
async function idOfVersion(token){
 const r=await request(token,'GET','/'+TARGET+'/versions');return (r.result?.items||r.result||[])[0]?.id;
}
async function assertSafe(token,versionId){
 const [s,c,b,d]=await Promise.all([
 request(token,'GET','/'+TARGET+'/subdomain'),
 request(token,'GET','/'+TARGET+'/schedules'),
 request(token,'GET','/'+TARGET+'/settings'),
 request(token,'GET','/'+TARGET+'/deployments')]);
 const dep=(d.result?.deployments||d.result||[])[0];
 if(s.result?.enabled!==false||s.result?.previews_enabled!==false||
 c.result?.schedules?.length!==0||b.result?.bindings?.length!==0||
 dep?.versions?.length!==1||dep.versions[0].version_id!==versionId||
 dep.versions[0].percentage!==100)throw Error('WORKER_PRIVATE_GATE_FAILED');
 return true;
}
async function verifyGone(token){
 const list=(await request(token,'GET','')).result;
 if(!Array.isArray(list)||list.some(w=>w.id===TARGET))throw Error('TARGET_STILL_PRESENT');
}
async function operate(token){
 await verifyGone(token);
 let created=false;
 let lastError='';
 try{
  await request(token,'PUT','/'+TARGET,bundle('V1'));created=true;
  await request(token,'POST','/'+TARGET+'/subdomain',{enabled:false,previews_enabled:false});
  await request(token,'PUT','/'+TARGET+'/schedules',[]);
  const v1=await idOfVersion(token);if(!v1)throw Error('V1_MISSING');
  await assertSafe(token,v1);
  await request(token,'PUT','/'+TARGET,bundle('V2'));
  const v2=await idOfVersion(token);if(!v2||v1===v2)throw Error('V2_MISSING');
  await assertSafe(token,v2);
  await request(token,'POST','/'+TARGET+'/deployments',{strategy:'percentage',
   versions:[{version_id:v1,percentage:100}],
   annotations:{'workers/message':'FACT001 headless LAB physical V2-to-V1 rollback'}});
  await assertSafe(token,v1);
  await request(token,'DELETE','/'+TARGET);created=false;
  await verifyGone(token);
  await request(token,'PUT','/'+TARGET,bundle('V1'));created=true;
  await request(token,'POST','/'+TARGET+'/subdomain',{enabled:false,previews_enabled:false});
  await request(token,'PUT','/'+TARGET+'/schedules',[]);
  const rebuilt=await idOfVersion(token);
  if(!rebuilt||rebuilt===v1)throw Error('REBUILD_FAILED');
  await assertSafe(token,rebuilt);
  await request(token,'DELETE','/'+TARGET);created=false;await verifyGone(token);
  return {status:'COMPLETED',result:'CREATE_UPDATE_ROLLBACK_DELETE_REBUILD_DELETE',v1,v2,rebuilt};
 }catch(e){lastError=e instanceof Error?e.message:'UNKNOWN';}
 finally{
  if(created){
   try{await request(token,'DELETE','/'+TARGET);await verifyGone(token);created=false;}
   catch{lastError='WORKER_RESIDUAL_MANUAL_RECONCILE';}
  }
 }
 return {status:'RECONCILE',reason:/^[A-Z0-9_]{3,80}$/.test(lastError)?lastError:'WORKER_E2E_ERROR',cleanup_complete:!created};
}
export async function tick(env,time=Date.now()){
 if(!env?.RECOVERY_DB||!env.CF_WORKERS_TOKEN||!Number.isSafeInteger(time))return {status:'RUNTIME_DENIED'};
 const db=env.RECOVERY_DB;
 const claim=await db.prepare("UPDATE fact001_cf_headless_worker_jobs_v1 SET state='RUNNING',attempts=attempts+1,started_at_ms=?2,updated_at_ms=?2 WHERE id=?1 AND state='QUEUED' AND attempts=0 RETURNING id")
  .bind(ID,time).first();
 if(!claim)return {status:'EMPTY_OR_ALREADY_CLAIMED'};
 let outcome;
 try{outcome=await operate(env.CF_WORKERS_TOKEN);}catch(e){const c=e instanceof Error?e.message:'';outcome={status:'RECONCILE',reason:/^CF_GET_HTTP_(401|403|404|408|429|500|502|503|504)$/.test(c)?c:'UNEXPECTED_OPERATOR_ERROR'};}
 const result=await db.prepare("UPDATE fact001_cf_headless_worker_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id,state,attempts")
  .bind(ID,outcome.status,outcome.result||'RECONCILE',outcome.reason||null,time).first();
 if(!result)throw Error('DURABLE_AUDIT_NOT_WRITTEN');
 return {status:result.state,attempts:result.attempts};
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:HEAD});},
 async scheduled(controller,env,ctx){ctx.waitUntil(tick(env,controller.scheduledTime));}
};
