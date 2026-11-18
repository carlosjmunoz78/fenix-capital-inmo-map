/** CEREBRO OS · Shared state contract v1, deterministic and consumer-agnostic.
 * It NEVER moves or creates a profile, changes a department, or infers activity
 * from a deployed Worker/function or from an engine-family association.
 */
export const CONTRACT='CEREBRO_SHARED_STATE_V1';
export const STATES=Object.freeze(['ACTIVO','PARCIAL','FALLANDO','DEFINIDO','POR_VERIFICAR']);
export const MAX_FEED_AGE_MS=20*60*1000;
const evidenceUrl=(s)=>typeof s==='string'&&/^https:\/\/github\.com\/carlosjmunoz78\/fenix-capital-inmo-map\/actions\/runs\/[1-9]\d*$/.test(s);
const times=(v)=>typeof v==='string'?Date.parse(v):NaN;
export function classifyProfile(profile,source,now=Date.now()){
 if(profile?.kind==='SUBAGENT_TEMPLATE')return {status:'DEFINIDO',reason:'TEMPLATE_NOT_RUNTIME',evidence:null};
 const obs=profile?.runtime_observation;
 const valid=source?.status==='ACTIVO'&&Number.isFinite(times(source.observed_at))&&
   now-times(source.observed_at)>=-120000&&now-times(source.observed_at)<=MAX_FEED_AGE_MS&&
   obs&&obs.engine_id===profile.id&&obs.company_id==='fenix'&&
   obs.source==='CEREBRO_CONSOLE_ACTIVITY_V0'&&obs.provider==='GITHUB_ACTIONS'&&
   /^\d+$/.test(String(obs.runtime_id))&&evidenceUrl(obs.evidence)&&
   Number.isFinite(times(obs.last_run))&&now-times(obs.last_run)>=-120000&&
   now-times(obs.last_run)<=MAX_FEED_AGE_MS;
 if(!valid)return {status:'POR_VERIFICAR',reason:source?.status==='DEGRADADO'?'SOURCE_DEGRADED':'NO_EXACT_PROFILE_RUNTIME_EVIDENCE',evidence:null};
 if(profile.runtime_verified===true&&obs.status==='ACTIVO'&&now-times(obs.last_run)<=120000)
  return {status:'ACTIVO',reason:'EXACT_RUNNING_PROFILE_ID',evidence:obs.evidence};
 if(obs.last_run_result==='failure'||obs.last_run_result==='timed_out')
  return {status:'FALLANDO',reason:'EXACT_FAILED_RUN_NOT_UNIVERSAL_HEALTH',evidence:obs.evidence};
 if(obs.last_run_result==='success')
  return {status:'PARCIAL',reason:'EXACT_COMPLETED_RUN_UNVERIFIED_QUALITY_GATES',evidence:obs.evidence};
 return {status:'POR_VERIFICAR',reason:'EXACT_RUN_NOT_ENOUGH_PROOF',evidence:obs.evidence};
}
export function buildSharedState(entries,source,now=Date.now()){
 if(!Array.isArray(entries)||!entries.every(x=>typeof x.id==='string'&&typeof x.kind==='string'&&typeof x.family==='string'&&Array.isArray(x.engine_ids)))
  throw Error('INVALID_PROFILE_REGISTRY');
 const seen=new Set(),departments={},counts=Object.fromEntries(STATES.map(s=>[s,0]));
 const records=entries.map(x=>{
  const key=x.kind+':'+x.id;
  if(seen.has(key))throw Error('DUPLICATE_PROFILE_ID');
  seen.add(key);
  const decision=classifyProfile(x,source,now);
  const department=String(x.family); // SOURCE key: preserve existing family/department and parent_id
  const dep=departments[department]??{department_key:department,total:0,states:Object.fromEntries(STATES.map(s=>[s,0]))};
  dep.total+=1;dep.states[decision.status]+=1;departments[department]=dep;
  counts[decision.status]+=1;
  return {...x,shared_state:{
   ...decision,company_id:'fenix',profile_key:key,department_key:department,
   engine_ids:[...x.engine_ids],parent_id:x.parent_id??null,
   observed_at:source?.observed_at??null}};
 });
 const total=records.length;
 const fromDepartments=Object.values(departments).reduce((n,d)=>n+d.total,0);
 if(total!==fromDepartments||Object.values(counts).reduce((a,b)=>a+b,0)!==total)throw Error('GROUP_COUNT_DRIFT');
 const verifiedNow=counts.ACTIVO;
 return {schema:CONTRACT,company_id:'fenix',environment:'PROD_READONLY',version:'1.0.0',
  status:source?.status==='ACTIVO'?'LIVE_EVIDENCE_FEED':'DEGRADED_EVIDENCE_FEED',
  observed_at:source?.observed_at??null,source_status:source?.status??'DEGRADADO',
  source:'CEREBRO_CONSOLE_ACTIVITY_V0',refresh_interval_seconds:30,
  read_only:true,executed:false,
  overview:{total_profiles:total,departments:Object.keys(departments).length,
    states:counts,verified_running_profiles:verifiedNow,templates:counts.DEFINIDO,
    engine_association_is_not_execution:true},
  departments:Object.values(departments),records};
}
