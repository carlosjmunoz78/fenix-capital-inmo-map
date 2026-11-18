/** CEREBRO OS · Shared state contract v1, deterministic and consumer-agnostic.
 * It NEVER moves or creates a profile, changes a department, or infers activity
 * from a deployed Worker/function or from an engine-family association.
 */
export const CONTRACT='CEREBRO_SHARED_STATE_V1';
export const STATES=Object.freeze(['ACTIVO','PERFECTO','PARCIAL','FALLANDO','DEFINIDO','POR_VERIFICAR']);
export const MAX_FEED_AGE_MS=20*60*1000;
const evidenceUrl=(s)=>typeof s==='string'&&/^https:\/\/github\.com\/carlosjmunoz78\/fenix-capital-inmo-map\/actions\/runs\/[1-9]\d*$/.test(s);
const times=(v)=>typeof v==='string'?Date.parse(v):NaN;
export function classifyProfile(profile,source,now=Date.now()){
 if(profile?.kind==='SUBAGENT_TEMPLATE')return {status:'DEFINIDO',reason:'TEMPLATE_NOT_RUNTIME',evidence:null};
 const obs=profile?.runtime_observation;
 const valid=source?.status==='ACTIVO'&&Number.isFinite(times(source.observed_at))&&
   now-times(source.observed_at)>=-120000&&now-times(source.observed_at)<=MAX_FEED_AGE_MS&&
   obs&&obs.company_id==='fenix'&&typeof obs.engine_id==='string'&&/^[A-Z][A-Z0-9-]{2,25}$/.test(obs.engine_id)&&
   // A GitHub workflow engine_id, even exact, is not an independently attested profile identity.
   obs.profile_key===profile.kind+':'+profile.id&&
   obs.profile_provenance==='EXPLICIT_EXECUTOR_ATTESTATION'&&
   obs.source==='CEREBRO_CONSOLE_ACTIVITY_V0'&&obs.provider==='GITHUB_ACTIONS'&&
   /^\d+$/.test(String(obs.runtime_id))&&evidenceUrl(obs.evidence)&&
   Number.isFinite(times(obs.last_run))&&now-times(obs.last_run)>=-120000&&
   now-times(obs.last_run)<=MAX_FEED_AGE_MS;
 if(!valid)return {status:'POR_VERIFICAR',reason:source?.status==='DEGRADADO'?'SOURCE_DEGRADED':'NO_EXACT_PROFILE_RUNTIME_EVIDENCE',evidence:null};
 if(profile.runtime_verified===true&&obs.status==='ACTIVO'&&now-times(obs.last_run)<=120000)
  return {status:'ACTIVO',reason:'EXACT_RUNNING_PROFILE_ID',evidence:obs.evidence};
 if(obs.last_run_result==='failure'||obs.last_run_result==='timed_out')
  return {status:'FALLANDO',reason:'EXACT_FAILED_RUN_NOT_UNIVERSAL_HEALTH',evidence:obs.evidence};
 if(obs.last_run_result==='success'&&obs.quality_gate==='TRIBUNAL_GREEN'&&
    obs.required_tests_passed===true&&obs.rollback_verified===true)
  return {status:'PERFECTO',reason:'EXACT_QUALITY_TESTS_TRIBUNAL_AND_ROLLBACK_VERIFIED',evidence:obs.evidence};
 if(obs.last_run_result==='success')
  return {status:'PARCIAL',reason:'EXACT_COMPLETED_RUN_UNVERIFIED_QUALITY_GATES',evidence:obs.evidence};
 return {status:'POR_VERIFICAR',reason:'EXACT_RUN_NOT_ENOUGH_PROOF',evidence:obs.evidence};
}
export function buildSharedState(entries,source,now=Date.now()){
 if(!Array.isArray(entries)||!entries.every(x=>typeof x.id==='string'&&typeof x.kind==='string'&&typeof x.family==='string'&&Array.isArray(x.engine_ids)))
  throw Error('INVALID_PROFILE_REGISTRY');
 const seen=new Set(),departments={},sourceDepartments={},counts=Object.fromEntries(STATES.map(s=>[s,0]));
 const records=entries.map(x=>{
  const key=x.kind+':'+x.id;
  if(seen.has(key))throw Error('DUPLICATE_PROFILE_ID');
  seen.add(key);
  const decision=classifyProfile(x,source,now);
  const department=String(x.family); // SOURCE key: preserve existing family/department and parent_id
  const dep=departments[department]??{department_key:department,total:0,states:Object.fromEntries(STATES.map(s=>[s,0]))};
  dep.total+=1;dep.states[decision.status]+=1;departments[department]=dep;
  if(typeof x.department_id==='string'&&x.department_id.trim()){
   const unitKey=department+'/'+x.department_id;
   const unit=sourceDepartments[unitKey]??{department_key:x.department_id,family:department,total:0,states:Object.fromEntries(STATES.map(s=>[s,0])),source:'EXPLICIT_SOURCE_DEPARTMENT'};
   unit.total+=1;unit.states[decision.status]+=1;sourceDepartments[unitKey]=unit;
  }
  counts[decision.status]+=1;
  return {...x,shared_state:{
   ...decision,company_id:'fenix',profile_key:key,department_key:department,
   engine_ids:[...x.engine_ids],parent_id:x.parent_id??null,
   observed_at:source?.observed_at??null}};
 });
 const total=records.length;
 const fromDepartments=Object.values(departments).reduce((n,d)=>n+d.total,0);
 const departmentMapped=Object.values(sourceDepartments).reduce((n,d)=>n+d.total,0);
 const declared=entries.filter(x=>typeof x.department_id==='string'&&x.department_id.trim()).length;
 if(departmentMapped!==declared)throw Error('SOURCE_DEPARTMENT_DRIFT');
 if(total!==fromDepartments||Object.values(counts).reduce((a,b)=>a+b,0)!==total)throw Error('GROUP_COUNT_DRIFT');
 const verifiedNow=counts.ACTIVO;
 return {schema:CONTRACT,company_id:'fenix',environment:'PROD_READONLY',version:'1.0.0',
  feed_health:source?.status==='ACTIVO'?'LIVE_EVIDENCE_FEED':'DEGRADED_EVIDENCE_FEED',
  observed_at:source?.observed_at??null,source_status:source?.status??'DEGRADADO',
  source:'CEREBRO_CONSOLE_ACTIVITY_V0',refresh_interval_seconds:30,
  read_only:true,executed:false,
  overview:{total_profiles:total,departments:Object.keys(departments).length,
    states:counts,verified_running_profiles:verifiedNow,templates:counts.DEFINIDO,
    engine_association_is_not_execution:true},
  departments:Object.values(departments),source_departments:Object.values(sourceDepartments),records};
}

/** ENGINE telemetry is separate from profile identity. A GitHub workflow with an
 * engine ID establishes only observed CI activity, not engine health or specialist state.
 * No manual per-engine mapping is needed when the source already emits an exact ID.
 */
export function buildEngineActivity(engineIds,source,now=Date.now()){
 if(!Array.isArray(engineIds)||engineIds.length!==179||new Set(engineIds).size!==179||
  engineIds.some(id=>typeof id!=='string'||!/^[A-Z0-9][A-Z0-9-]{2,25}$/.test(id)))
  throw Error('CANONICAL_ENGINE_REGISTRY_DRIFT');
 const counts=Object.fromEntries(STATES.map(s=>[s,0]));
 const freshSource=source?.status==='ACTIVO'&&Number.isFinite(times(source.observed_at))&&
   now-times(source.observed_at)>=-120000&&now-times(source.observed_at)<=MAX_FEED_AGE_MS;
 const allowed=new Set(engineIds),byId=new Map();
 if(freshSource)for(const obs of (Array.isArray(source.engine_runs)?source.engine_runs:[])){
  const when=times(obs.observed_at);
  if(!allowed.has(obs.engine_id)||obs.provider!=='GITHUB_ACTIONS'||obs.company_id!=='fenix'||
   !/^\d+$/.test(String(obs.runtime_id))||!evidenceUrl(obs.evidence)||
   !Number.isFinite(when)||now-when< -120000||now-when>MAX_FEED_AGE_MS)continue;
  const old=byId.get(obs.engine_id);
  if(!old||times(old.observed_at)<when)byId.set(obs.engine_id,obs);
 }
 const records=engineIds.map(engine_id=>{
  const obs=byId.get(engine_id);
  let status='POR_VERIFICAR',reason=source?.status==='DEGRADADO'?'SOURCE_DEGRADED':'NO_RECENT_EXACT_ENGINE_WORKFLOW';
  if(obs){
   if(obs.status==='in_progress'&&now-times(obs.observed_at)<=120000){
    status='ACTIVO';reason='RECENT_GITHUB_WORKFLOW_IN_PROGRESS_NOT_ENGINE_HEALTH';
   }else if(obs.status==='completed'&&['failure','timed_out'].includes(obs.conclusion)){
    status='FALLANDO';reason='RECENT_GITHUB_WORKFLOW_FAILED_NOT_ENGINE_UNIVERSAL_HEALTH';
   }else if(obs.status==='completed'&&obs.conclusion==='success'){
    status='PARCIAL';reason='RECENT_GITHUB_WORKFLOW_SUCCESS_NOT_ENGINE_QUALITY';
   }else if(['queued','waiting','requested','pending'].includes(obs.status)){
    status='PARCIAL';reason='GITHUB_WORKFLOW_QUEUED_NOT_RUNNING';
   }
  }
  counts[status]+=1;
  return {engine_id,company_id:'fenix',status,reason,
   runtime_evidence:obs?{provider:obs.provider,run_id:obs.runtime_id,observed_at:obs.observed_at,
    evidence:obs.evidence,result:obs.conclusion??null}:null,
   runtime_health_verified:false};
 });
 if(records.length!==179||Object.values(counts).reduce((s,n)=>s+n,0)!==179)
  throw Error('ENGINE_ACTIVITY_TOTAL_DRIFT');
 return {registry_count:179,source:'GITHUB_ACTIONS',source_observed_at:source?.observed_at??null,
  observed_workflow_engines:byId.size,runtime_health_verified:0,
  status_counts:counts,source_limitations:'GitHub workflow engine ID is a lower-bound observed run, not all provider runtimes or autonomous health',
  recent_observed:records.filter(x=>x.runtime_evidence).slice(0,10),records};
}
