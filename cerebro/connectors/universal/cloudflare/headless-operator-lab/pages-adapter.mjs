// FACT001 isolated Cloudflare Pages LAB adapter. Requires a SEPARATE Pages Write secret.
// Stage only until owner provisions CF_PAGES_TOKEN; no interaction with existing Pages projects.
export const PAGES_ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
export const PAGES_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
export const PAGES_ACTIONS=Object.freeze(['pages.project.create_empty','pages.project.update_branch','pages.project.rollback_branch','pages.project.delete_empty']);
export const PAGES_SAFE_NAME=/^cerebro-fact001-managed-pages-lab-[a-z0-9]{4,20}$/;
const endpoint='https://api.cloudflare.com/client/v4/accounts/'+PAGES_ACCOUNT+'/pages/projects';
const dbSql=(db,sql,values)=>db.prepare(sql).bind(...values);
function errorCode(e){const c=e instanceof Error?e.message:'';return /^(PAGES_HTTP_(400|401|403|404|408|409|429|500|502|503|504)|PAGES_PROVIDER_REJECTED|PAGES_UNTRUSTED|PROJECT_EXISTS|OWNER_NOT_FOUND|OWNER_STATE_DENIED|PAGES_PUBLIC_DEPLOYMENT_UNSAFE|PAGES_DRIFT|PAGES_AUDIT_FAILED|PAGES_ORDER_DENIED)$/.test(c)?c:'PAGES_ERROR_RECONCILE';}
async function cf(token,method,path='',body,fetchImpl=fetch){
 const h={Authorization:'Bearer '+token,Accept:'application/json'};
 if(body!==undefined)h['Content-Type']='application/json';
 const r=await fetchImpl(endpoint+path,{method,headers:h,redirect:'manual',
  ...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 if(!r?.ok)throw Error('PAGES_HTTP_'+(r?.status||503));
 if(method==='DELETE')return{success:true};
 const data=await r.json();if(data?.success!==true)throw Error('PAGES_PROVIDER_REJECTED');
 return data;
}
async function owned(db,name){
 return await dbSql(db,"SELECT name,state,original_branch,current_branch,company_id,engine_id,environment,version FROM fact001_cf_pages_owned_v1 WHERE name=?1",[name]).first();
}
async function assertOwned(db,name,states){
 const value=await owned(db,name);
 if(!value)throw Error('OWNER_NOT_FOUND');
 if(value.company_id!==PAGES_SCOPE.company_id||value.engine_id!==PAGES_SCOPE.engine_id||
 value.environment!=='LAB'||value.version!=='1.0.0'||!states.includes(value.state))
  throw Error('OWNER_STATE_DENIED');
 return value;
}
async function project(token,name){return (await cf(token,'GET','/'+name)).result;}
function noDeployment(p){
 if(!p||p.latest_deployment!=null||p.canonical_deployment!=null||p.source!=null)
  throw Error('PAGES_PUBLIC_DEPLOYMENT_UNSAFE');
 return true;
}
async function runOperation(db,token,job,time){
 const name=job.resource_name,operation=job.operation;
 if(!PAGES_SAFE_NAME.test(name)||!PAGES_ACTIONS.includes(operation)||
  job.company_id!==PAGES_SCOPE.company_id||job.engine_id!==PAGES_SCOPE.engine_id||
  job.environment!==PAGES_SCOPE.environment||job.version!==PAGES_SCOPE.version||
  job.max_cost_eur!==0||job.attempts!==1||job.state!=='RUNNING')throw Error('PAGES_ORDER_DENIED');
 if(operation==='pages.project.create_empty'){
  if(await owned(db,name))throw Error('PROJECT_EXISTS');
  const l=await cf(token,'GET');if(!Array.isArray(l.result)||l.result.some(x=>x.name===name))throw Error('PROJECT_EXISTS');
  await cf(token,'POST','',{name,production_branch:'lab-inert-v1'});
  const curr=await project(token,name);noDeployment(curr);
  if(curr.name!==name||curr.production_branch!=='lab-inert-v1')throw Error('PAGES_DRIFT');
  const put=await dbSql(db,
   "INSERT INTO fact001_cf_pages_owned_v1(name,company_id,engine_id,environment,version,state,original_branch,current_branch,created_by_request,created_at_ms,updated_at_ms) VALUES(?1,'fenix-capital','FACT-001','LAB','1.0.0','V1','lab-inert-v1','lab-inert-v1',?2,?3,?3) RETURNING name",
   [name,job.request_id,time]).first();
  if(put?.name!==name)throw Error('PAGES_AUDIT_FAILED');
  return 'EMPTY_PAGES_PROJECT_CREATED';
 }
 if(operation==='pages.project.update_branch'){
  const o=await assertOwned(db,name,['V1']);
  const before=await project(token,name);noDeployment(before);
  if(before.production_branch!==o.current_branch)throw Error('PAGES_DRIFT');
  await cf(token,'PATCH','/'+name,{production_branch:'lab-inert-v2'});
  const after=await project(token,name);noDeployment(after);
  if(after.production_branch!=='lab-inert-v2')throw Error('PAGES_DRIFT');
  const put=await dbSql(db,"UPDATE fact001_cf_pages_owned_v1 SET state='V2',current_branch='lab-inert-v2',updated_at_ms=?2 WHERE name=?1 AND state='V1' RETURNING name",[name,time]).first();
  if(put?.name!==name)throw Error('PAGES_AUDIT_FAILED');
  return 'EMPTY_PAGES_BRANCH_UPDATED';
 }
 if(operation==='pages.project.rollback_branch'){
  const o=await assertOwned(db,name,['V2']);
  const curr=await project(token,name);noDeployment(curr);
  if(curr.production_branch!=='lab-inert-v2')throw Error('PAGES_DRIFT');
  await cf(token,'PATCH','/'+name,{production_branch:'lab-inert-v1'});
  const revert=await project(token,name);noDeployment(revert);
  if(revert.production_branch!=='lab-inert-v1')throw Error('PAGES_DRIFT');
  const put=await dbSql(db,"UPDATE fact001_cf_pages_owned_v1 SET state='ROLLED_BACK',current_branch='lab-inert-v1',updated_at_ms=?2 WHERE name=?1 AND state='V2' RETURNING name",[name,time]).first();
  if(put?.name!==name)throw Error('PAGES_AUDIT_FAILED');
  return 'EMPTY_PAGES_BRANCH_REVERTED';
 }
 const o=await assertOwned(db,name,['V1','V2','ROLLED_BACK']);
 const before=await project(token,name);noDeployment(before);
 if(before.production_branch!==o.current_branch)throw Error('PAGES_DRIFT');
 await cf(token,'DELETE','/'+name);
 const listing=await cf(token,'GET');
 if(!Array.isArray(listing.result)||listing.result.some(x=>x.name===name))throw Error('PAGES_DRIFT');
 const put=await dbSql(db,"UPDATE fact001_cf_pages_owned_v1 SET state='DELETED',updated_at_ms=?2 WHERE name=?1 AND state IN ('V1','V2','ROLLED_BACK') RETURNING name",[name,time]).first();
 if(put?.name!==name)throw Error('PAGES_AUDIT_FAILED');
 return 'EMPTY_PAGES_PROJECT_DELETED';
}
export async function pagesTick(env,time=Date.now()){
 if(!env?.RECOVERY_DB||typeof env.CF_PAGES_TOKEN!=='string'||env.CF_PAGES_TOKEN.length<24||!Number.isSafeInteger(time))
  return{status:'PAGES_SECRET_NOT_CONFIGURED'};
 const db=env.RECOVERY_DB;
 const job=await dbSql(db,
  "UPDATE fact001_cf_pages_jobs_v1 SET state='RUNNING',attempts=attempts+1,updated_at_ms=?1 WHERE id=(SELECT id FROM fact001_cf_pages_jobs_v1 WHERE state='QUEUED' AND attempts=0 ORDER BY created_at_ms,id LIMIT 1) AND state='QUEUED' AND attempts=0 RETURNING id,operation,resource_name,request_id,company_id,engine_id,environment,version,max_cost_eur,attempts,state",
  [time]).first();
 if(!job)return{status:'IDLE'};
 let state='RECONCILE',phase='UNVERIFIED',code=null;
 try{phase=await runOperation(db,env.CF_PAGES_TOKEN,job,time);state='COMPLETED';}
 catch(e){code=errorCode(e);}
 const done=await dbSql(db,
  "UPDATE fact001_cf_pages_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING state,attempts",
  [job.id,state,phase,code,time]).first();
 if(!done)throw Error('PAGES_AUDIT_FAILED');
 return{status:done.state,attempts:done.attempts};
}
