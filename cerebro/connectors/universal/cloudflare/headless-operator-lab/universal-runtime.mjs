import {vercelTick} from './vercel-adapter.mjs';
import {d1Tick} from './d1-adapter.mjs';
import {pagesTick} from './pages-adapter.mjs';
// CEREBRO FACT001 multi-command Cloudflare Worker controller V0, isolated LAB only.
// Private scheduled control plane; four deterministic operations, never arbitrary code or PROD.
export const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
export const ACCOUNT_ID='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const PREFIX='cerebro-fact001-managed-lab-';
export const OPS=Object.freeze(['worker.create_private','worker.update_private','worker.rollback_private','worker.delete_private']);
export const MAX_JOBS_PER_TICK=1;
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT_ID+'/workers/scripts';
const RUNTIME_VERSION='command-runtime-v0.1.0';
const SAFE=/^cerebro-fact001-managed-lab-[a-z0-9]{4,20}$/;
const HEAD={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function assertJob(j){
 if(!j||j.company_id!==SCOPE.company_id||j.engine_id!==SCOPE.engine_id||
 j.environment!==SCOPE.environment||j.version!==SCOPE.version||
 j.max_cost_eur!==0||j.attempts!==1||j.state!=='RUNNING'||
 !OPS.includes(j.operation)||typeof j.resource_name!=='string'||!SAFE.test(j.resource_name)||
 !/^[A-Z0-9-]{10,80}$/.test(j.request_id||''))throw Error('ORDER_POLICY_DENIED');
 return j;
}
function providerError(value){
 const name=value instanceof Error?value.message:'UNKNOWN';
 return /^(CF_(GET|PUT|POST|DELETE)_HTTP_(400|401|403|404|409|408|429|500|502|503|504)|CF_INVALID_RESPONSE|PRIVATE_GATE_DENIED|OWNERSHIP_MISSING|OWNERSHIP_STATE_DENIED|EXTERNAL_CHANGE_DETECTED|TARGET_EXISTS|TARGET_MISSING|PROVIDER_BAD_VERSION|SQL_AUDIT_FAILED|ORDER_POLICY_DENIED)$/.test(name)?name:'UNEXPECTED_EXECUTOR_ERROR';
}
async function api(token,method,path,body,fetchFn=fetch){
 const headers={Authorization:'Bearer '+token,Accept:'application/json'};
 if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const resp=await fetchFn(API+path,{method,headers,
  ...(body!==undefined?{body:body instanceof FormData?body:JSON.stringify(body)}:{}),
  redirect:'manual',signal:AbortSignal.timeout(18000)});
 if(!resp||!resp.ok)throw Error('CF_'+method+'_HTTP_'+(resp?.status||500));
 if(method==='DELETE')return {success:true};
 const result=await resp.json();
 if(result?.success!==true)throw Error('CF_INVALID_RESPONSE');
 return result;
}
function source(tag){
 const text="export default {async fetch(){return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store','X-Fact001-Build':'"+tag+"'}})}};";
 const f=new FormData();
 f.append('metadata',new Blob([JSON.stringify({main_module:'index.mjs',compatibility_date:'2026-11-11',bindings:[]})],{type:'application/json'}));
 f.append('index.mjs',new Blob([text],{type:'application/javascript+module'}),'index.mjs');
 return f;
}
function resultVersion(x){return (x.result?.items||x.result||[])[0]?.id;}
async function deployed(token,name){const x=await api(token,'GET','/'+name+'/deployments');return (x.result?.deployments||x.result||[])[0]?.versions?.[0]?.version_id;}
async function list(token){const x=await api(token,'GET','');if(!Array.isArray(x.result))throw Error('CF_INVALID_RESPONSE');return x.result;}
async function privacy(token,name,expected){
 const [sub,cron,bind,version]=await Promise.all([
  api(token,'GET','/'+name+'/subdomain'),api(token,'GET','/'+name+'/schedules'),
  api(token,'GET','/'+name+'/settings'),deployed(token,name)]);
 if(sub.result?.enabled!==false||sub.result?.previews_enabled!==false||
  cron.result?.schedules?.length!==0||bind.result?.bindings?.length!==0||version!==expected)
  throw Error('PRIVATE_GATE_DENIED');
}
const query=(db,sql,args=[])=>db.prepare(sql).bind(...args);
async function owned(db,name){return await query(db,
 "SELECT name,state,v1_version_id,v2_version_id,current_version_id,company_id,engine_id,environment,version FROM fact001_cf_owned_workers_v1 WHERE name=?1",[name]).first();}
async function requireOwned(db,name,states){
 const o=await owned(db,name);
 if(!o||o.company_id!==SCOPE.company_id||o.engine_id!==SCOPE.engine_id||o.environment!=='LAB'||o.version!=='1.0.0')throw Error('OWNERSHIP_MISSING');
 if(!states.includes(o.state))throw Error('OWNERSHIP_STATE_DENIED');
 return o;
}
async function create(db,token,name,time,requestId){
 if(await owned(db,name))throw Error('TARGET_EXISTS');
 if((await list(token)).some(x=>x.id===name))throw Error('TARGET_EXISTS');
 const p='/'+name;
 await api(token,'PUT',p,source('V1'));
 await api(token,'POST',p+'/subdomain',{enabled:false,previews_enabled:false});
 await api(token,'PUT',p+'/schedules',[]);
 const v1=resultVersion(await api(token,'GET',p+'/versions'));
 if(!v1)throw Error('PROVIDER_BAD_VERSION');
 await privacy(token,name,v1);
 const write=await query(db,
 "INSERT INTO fact001_cf_owned_workers_v1(name,company_id,engine_id,environment,version,state,v1_version_id,current_version_id,created_by_request,created_at_ms,updated_at_ms) VALUES(?1,?2,?3,'LAB','1.0.0','V1',?4,?4,?5,?6,?6) RETURNING name",
 [name,SCOPE.company_id,SCOPE.engine_id,v1,requestId,time]).first();
 if(write?.name!==name)throw Error('SQL_AUDIT_FAILED');
 return 'CREATED_V1_PRIVATE';
}
async function update(db,token,name,time){
 const o=await requireOwned(db,name,['V1']);
 if(!(await list(token)).some(x=>x.id===name))throw Error('TARGET_MISSING');
 await privacy(token,name,o.current_version_id);
 const p='/'+name;
 await api(token,'PUT',p,source('V2'));
 const v2=resultVersion(await api(token,'GET',p+'/versions'));
 if(!v2||v2===o.v1_version_id)throw Error('PROVIDER_BAD_VERSION');
 await privacy(token,name,v2);
 const res=await query(db,
 "UPDATE fact001_cf_owned_workers_v1 SET state='V2',v2_version_id=?2,current_version_id=?2,updated_at_ms=?3 WHERE name=?1 AND state='V1' AND current_version_id=?4 RETURNING name",
 [name,v2,time,o.v1_version_id]).first();
 if(res?.name!==name)throw Error('SQL_AUDIT_FAILED');
 return 'UPDATED_V2_PRIVATE';
}
async function rollback(db,token,name,time){
 const o=await requireOwned(db,name,['V2']);
 if(!(await list(token)).some(x=>x.id===name))throw Error('TARGET_MISSING');
 await privacy(token,name,o.v2_version_id);
 await api(token,'POST','/'+name+'/deployments',
  {strategy:'percentage',versions:[{version_id:o.v1_version_id,percentage:100}],
   annotations:{'workers/message':'FACT001 managed LAB physical V2 to V1 rollback'}});
 await privacy(token,name,o.v1_version_id);
 const res=await query(db,
 "UPDATE fact001_cf_owned_workers_v1 SET state='ROLLED_BACK',current_version_id=?2,updated_at_ms=?3 WHERE name=?1 AND state='V2' AND v1_version_id=?2 RETURNING name",
 [name,o.v1_version_id,time]).first();
 if(res?.name!==name)throw Error('SQL_AUDIT_FAILED');
 return 'ROLLED_BACK_V1_PRIVATE';
}
async function remove(db,token,name,time){
 const o=await requireOwned(db,name,['V1','V2','ROLLED_BACK']);
 if(!(await list(token)).some(x=>x.id===name))throw Error('TARGET_MISSING');
 await privacy(token,name,o.current_version_id);
 await api(token,'DELETE','/'+name);
 if((await list(token)).some(x=>x.id===name))throw Error('EXTERNAL_CHANGE_DETECTED');
 const res=await query(db,
 "UPDATE fact001_cf_owned_workers_v1 SET state='DELETED',current_version_id=NULL,updated_at_ms=?2 WHERE name=?1 AND state IN ('V1','V2','ROLLED_BACK') RETURNING name",
 [name,time]).first();
 if(res?.name!==name)throw Error('SQL_AUDIT_FAILED');
 return 'OWNED_WORKER_REMOVED';
}
export async function tick(env,time=Date.now()){
 if(!env?.RECOVERY_DB||typeof env.CF_WORKERS_TOKEN!=='string'||env.CF_WORKERS_TOKEN.length<24||!Number.isSafeInteger(time))
  return {status:'RUNTIME_DENIED'};
 const db=env.RECOVERY_DB;
 const job=await query(db,
 "UPDATE fact001_cf_command_jobs_v1 SET state='RUNNING',attempts=attempts+1,started_at_ms=?1,updated_at_ms=?1 WHERE id=(SELECT id FROM fact001_cf_command_jobs_v1 WHERE state='QUEUED' AND attempts=0 ORDER BY created_at_ms,id LIMIT 1) AND state='QUEUED' AND attempts=0 RETURNING id,company_id,engine_id,environment,version,operation,resource_name,request_id,max_cost_eur,state,attempts",
 [time]).first();
 if(!job)return {status:'IDLE',engine_version:RUNTIME_VERSION};
 let state='RECONCILE',phase='UNVERIFIED',error=null;
 try{
  assertJob(job);
  if(job.operation==='worker.create_private')phase=await create(db,env.CF_WORKERS_TOKEN,job.resource_name,time,job.request_id);
  else if(job.operation==='worker.update_private')phase=await update(db,env.CF_WORKERS_TOKEN,job.resource_name,time);
  else if(job.operation==='worker.rollback_private')phase=await rollback(db,env.CF_WORKERS_TOKEN,job.resource_name,time);
  else if(job.operation==='worker.delete_private')phase=await remove(db,env.CF_WORKERS_TOKEN,job.resource_name,time);
  state='COMPLETED';
 }catch(e){error=providerError(e);}
 const out=await query(db,
 "UPDATE fact001_cf_command_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id,state,attempts",
 [job.id,state,phase,error,time]).first();
 if(!out||out.id!==job.id)throw Error('SQL_AUDIT_FAILED');
 try{await query(db,
 "INSERT INTO fact001_cf_command_events_v1(job_id,event,state,phase,error_code,recorded_at_ms) VALUES(?1,'JOB_FINISHED',?2,?3,?4,?5)",
 [job.id,state,phase,error,time]).run();}catch{}
 return {status:state,request_id:job.request_id,attempts:out.attempts};
}
export default {
 async fetch(){return new Response('Not Found',{status:404,headers:HEAD});},
 async scheduled(controller,env,ctx){ctx.waitUntil(Promise.allSettled([tick(env,controller.scheduledTime),pagesTick(env,controller.scheduledTime),d1Tick(env,controller.scheduledTime),vercelTick(env,controller.scheduledTime)]));}
};
