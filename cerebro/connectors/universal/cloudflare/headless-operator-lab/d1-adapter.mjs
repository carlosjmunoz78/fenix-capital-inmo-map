// FACT001 D1 bounded data-operations adapter, shared private LAB D1 binding only.
// Does NOT create/delete databases, change existing tables, read customer data, or use API tokens.
export const D1_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
export const D1_OPS=Object.freeze(['d1.owned.create','d1.owned.update','d1.owned.rollback','d1.owned.delete']);
export const SAFE_KEY=/^fact001-lab-[a-z0-9]{4,20}$/;
const run=(db,sql,params)=>db.prepare(sql).bind(...params);
function safeError(err){const s=err instanceof Error?err.message:'';return /^(D1_KEY_EXISTS|D1_KEY_MISSING|D1_OWNER_MISMATCH|D1_VERSION_CONFLICT|D1_POLICY_DENIED|D1_READBACK_FAILED|D1_STATE_CONFLICT)$/.test(s)?s:'D1_RECONCILE_UNKNOWN';}
function checkJob(j){if(!j||j.company_id!==D1_SCOPE.company_id||j.engine_id!==D1_SCOPE.engine_id||j.environment!==D1_SCOPE.environment||j.version!==D1_SCOPE.version||j.state!=='RUNNING'||j.attempts!==1||j.max_cost_eur!==0||!D1_OPS.includes(j.operation)||!SAFE_KEY.test(j.resource_key)||!/^[A-Z0-9-]{10,80}$/.test(j.request_id||''))throw Error('D1_POLICY_DENIED');}
async function existing(db,key){return await run(db,"SELECT resource_key,state,value_tag,company_id,engine_id,environment,version FROM fact001_cf_d1_owned_values_v1 WHERE resource_key=?1",[key]).first();}
async function mutation(db,j,t){
 const key=j.resource_key;let previous=await existing(db,key);const valid=previous&&previous.company_id===D1_SCOPE.company_id&&previous.engine_id===D1_SCOPE.engine_id&&previous.environment==='LAB'&&previous.version==='1.0.0';
 let phase;
 if(j.operation==='d1.owned.create'){
  if(previous)throw Error('D1_KEY_EXISTS');
  const x=await run(db,"INSERT INTO fact001_cf_d1_owned_values_v1(resource_key,company_id,engine_id,environment,version,state,value_tag,created_by_request,created_at_ms,updated_at_ms) VALUES(?1,'fenix-capital','FACT-001','LAB','1.0.0','V1','V1',?2,?3,?3) RETURNING resource_key,state,value_tag",[key,j.request_id,t]).first();
  if(x?.resource_key!==key||x.state!=='V1'||x.value_tag!=='V1')throw Error('D1_READBACK_FAILED');
  phase='D1_OWNED_CREATED_V1';
 }else{
  if(!previous)throw Error('D1_KEY_MISSING');
  if(!valid)throw Error('D1_OWNER_MISMATCH');
  if(j.operation==='d1.owned.update'){
   if(previous.state!=='V1'||previous.value_tag!=='V1')throw Error('D1_STATE_CONFLICT');
   const x=await run(db,"UPDATE fact001_cf_d1_owned_values_v1 SET state='V2',value_tag='V2',updated_at_ms=?2 WHERE resource_key=?1 AND state='V1' AND value_tag='V1' RETURNING state,value_tag",[key,t]).first();
   if(x?.state!=='V2'||x?.value_tag!=='V2')throw Error('D1_VERSION_CONFLICT');
   phase='D1_OWNED_UPDATED_V2';
  }else if(j.operation==='d1.owned.rollback'){
   if(previous.state!=='V2'||previous.value_tag!=='V2')throw Error('D1_STATE_CONFLICT');
   const x=await run(db,"UPDATE fact001_cf_d1_owned_values_v1 SET state='ROLLED_BACK',value_tag='V1',updated_at_ms=?2 WHERE resource_key=?1 AND state='V2' AND value_tag='V2' RETURNING state,value_tag",[key,t]).first();
   if(x?.state!=='ROLLED_BACK'||x?.value_tag!=='V1')throw Error('D1_VERSION_CONFLICT');
   phase='D1_OWNED_ROLLBACK_V1';
  }else{
   if(!['V1','V2','ROLLED_BACK'].includes(previous.state))throw Error('D1_STATE_CONFLICT');
   // Soft delete preserves evidence in LAB. No DROP, DELETE, mass changes, or table deletion.
   const x=await run(db,"UPDATE fact001_cf_d1_owned_values_v1 SET state='DELETED',value_tag='DELETED',updated_at_ms=?2 WHERE resource_key=?1 AND state IN ('V1','V2','ROLLED_BACK') RETURNING state,value_tag",[key,t]).first();
   if(x?.state!=='DELETED'||x?.value_tag!=='DELETED')throw Error('D1_VERSION_CONFLICT');
   phase='D1_OWNED_SOFT_DELETE';
  }
 }
 const current=await existing(db,key);
 if(current?.resource_key!==key||current.state!==(phase==='D1_OWNED_CREATED_V1'?'V1':phase==='D1_OWNED_UPDATED_V2'?'V2':phase==='D1_OWNED_ROLLBACK_V1'?'ROLLED_BACK':'DELETED'))throw Error('D1_READBACK_FAILED');
 return phase;
}
export async function d1Tick(env,time=Date.now()){
 if(!env?.RECOVERY_DB||!Number.isSafeInteger(time))return{status:'D1_RUNTIME_DENIED'};
 const db=env.RECOVERY_DB;
 const j=await run(db,
 "UPDATE fact001_cf_d1_jobs_v1 SET state='RUNNING',attempts=attempts+1,updated_at_ms=?1 WHERE id=(SELECT id FROM fact001_cf_d1_jobs_v1 WHERE state='QUEUED' AND attempts=0 ORDER BY created_at_ms,id LIMIT 1) AND state='QUEUED' AND attempts=0 RETURNING id,company_id,engine_id,environment,version,operation,resource_key,request_id,max_cost_eur,state,attempts",[time]).first();
 if(!j)return{status:'IDLE'};
 let state='RECONCILE',phase='UNVERIFIED',error=null;
 try{checkJob(j);phase=await mutation(db,j,time);state='COMPLETED';}
 catch(e){error=safeError(e);}
 const saved=await run(db,
 "UPDATE fact001_cf_d1_jobs_v1 SET state=?2,phase=?3,error_code=?4,updated_at_ms=?5 WHERE id=?1 AND state='RUNNING' AND attempts=1 RETURNING id,state,attempts",[j.id,state,phase,error,time]).first();
 if(saved?.id!==j.id)throw Error('D1_AUDIT_NOT_PERSISTED');
 await run(db,"INSERT INTO fact001_cf_d1_events_v1(job_id,state,phase,error_code,recorded_at_ms) VALUES(?1,?2,?3,?4,?5)",[j.id,state,phase,error,time]).run();
 return{status:saved.state,attempts:saved.attempts};
}
