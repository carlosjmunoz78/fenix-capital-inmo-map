// SHADOW PLANNER ONLY. No queue, worker, cron, state or execution.
// Any real dispatch must reuse EXISTING JOB-001 after dedicated gates.
export function analyzeConcurrentJobsV0({jobs,running=[],limits={global:2,company:2,resource:1,provider:2}}){
 if(!Array.isArray(jobs)||!Array.isArray(running))throw Error('JOBS_ARRAY_REQUIRED');
 const caps={};for(const k of ['global','company','resource','provider']){if(!Number.isSafeInteger(limits[k])||limits[k]<0)throw Error('INVALID_LIMIT_'+k);caps[k]=limits[k];}
 if(new Set(jobs.map(j=>j.id)).size!==jobs.length)throw Error('DUPLICATE_JOB_ID');
 const byId=new Map(jobs.map(j=>[j.id,j])),active=[...running],selected=[],blocked=[];
 const ordered=[...jobs].sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.id).localeCompare(String(b.id)));
 for(const j of ordered){
  if(j.status!=='QUEUED')continue;
  if(!j.company_id||!j.engine_id||!j.environment||!j.version||!j.resource||!j.pool)throw Error('MISSING_JOB_CONTEXT');
  let reason;
  if(j.environment!=='LAB')reason='ENVIRONMENT_NOT_LAB';
  else if((j.dependencies||[]).some(id=>!byId.has(id)))reason='UNKNOWN_DEPENDENCY';
  else if((j.dependencies||[]).some(id=>byId.get(id).status!=='SUCCEEDED'))reason='BLOCKED_DEPENDENCY';
  else if(j.estimated_additional_cost_eur>0)reason='MONEY_LIMIT';
  else if(active.length>=caps.global)reason='GLOBAL_CAPACITY';
  else if(active.filter(x=>x.company_id===j.company_id).length>=caps.company)reason='COMPANY_CAPACITY';
  else if(active.filter(x=>x.resource===j.resource).length>=caps.resource)reason='RESOURCE_LOCK';
  else if(j.provider&&active.filter(x=>x.provider===j.provider).length>=caps.provider)reason='PROVIDER_CAPACITY';
  if(reason)blocked.push({id:j.id,reason});else{selected.push(j.id);active.push(j);}
 }
 return{mode:'SHADOW_PLAN_ONLY',executed:false,started:0,parallel_candidates:selected,blocked,limits:caps,additional_cost_eur:0};
}
