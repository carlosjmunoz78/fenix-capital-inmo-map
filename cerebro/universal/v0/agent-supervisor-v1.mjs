/**
 * Supervisor v1. No network or database access. Inputs must come from already
 * cryptographically verified runtime projections; inventory NEVER proves health.
 */
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const summary=(arr,p)=>arr.filter(p).length;
export function superviseAgentsV1({projection,observed_at}={}){
 const now=date(observed_at);
 if(!projection||projection.status!=='OK'||projection.read_only!==true||
    projection.source!=='CEREBRO_VERIFIED_EXECUTOR_EVIDENCE_V1'||
    projection.company_id!=='fenix'||!Array.isArray(projection.profiles)||
    projection.profile_total!==projection.profiles.length||now===null)
  throw Error('SUPERVISOR_UNTRUSTED_PROJECTION');
 if(Math.abs(now-date(projection.observed_at))>120000)throw Error('SUPERVISOR_STALE_PROJECTION');
 const statuses=projection.profiles.map(p=>{
  if(p.kind==='SUBAGENT_TEMPLATE')return {id:p.id,kind:p.kind,state:'TEMPLATE_NOT_INSTALLED',runtime_certified:false,quality:'NOT_ATTESTED',last_evidence_at:null};
  if(!p.runtime_verified)return {id:p.id,kind:p.kind,state:'NOT_VERIFIED',runtime_certified:false,quality:'NOT_ATTESTED',last_evidence_at:null};
  const freshEvidence=date(p.last_receipt_at)!==null&&date(p.last_receipt_at)>=now-86400000;
  const terminalFailure=p.last_event==='FAILED';
  const state=p.active_execution_verified?'RUNNING_VERIFIED':
    terminalFailure&&freshEvidence?'FAILED_VERIFIED':
    terminalFailure?'HISTORICAL_FAILURE':
    freshEvidence?'EXECUTED_NOT_RUNNING':'HISTORICAL_EVIDENCE';
  return {id:p.id,kind:p.kind,state,runtime_certified:true,quality:'NOT_ATTESTED',
   last_evidence_at:p.last_receipt_at,last_event:p.last_event,
   source_count:p.evidence_providers?.length||0};
 });
 return {
  status:'OK',company_id:'fenix',observed_at,source:'CEREBRO_SUPERVISOR_PROJECTED_V1',
  read_only:true,quality_assertion:'HOLD_UNTIL_SIGNED_TESTS_EVALUATION_AND_TRIBUNAL',
  summary:{
   registered_profiles:statuses.length,
   templates_not_installed:summary(statuses,p=>p.state==='TEMPLATE_NOT_INSTALLED'),
   accreditable_profiles:summary(statuses,p=>p.state!=='TEMPLATE_NOT_INSTALLED'),
   running_verified:summary(statuses,p=>p.state==='RUNNING_VERIFIED'),
   failed_verified:summary(statuses,p=>p.state==='FAILED_VERIFIED'),
   executed_not_running:summary(statuses,p=>p.state==='EXECUTED_NOT_RUNNING'),
   historical_failure:summary(statuses,p=>p.state==='HISTORICAL_FAILURE'),
   historical_evidence:summary(statuses,p=>p.state==='HISTORICAL_EVIDENCE'),
   not_verified:summary(statuses,p=>p.state==='NOT_VERIFIED'),
   excellence_verified:0
  },profiles:statuses
 };
}
