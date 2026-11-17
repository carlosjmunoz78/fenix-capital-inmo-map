// Same protocol for Operativa, JARVIS, Neuronal, Browser and mobile.
// Client selects context but server alone decides identities and permissions.
export function createUniversalSdkV0({request,session_token,company_id,environment='LAB'}){
 if(typeof request!=='function')throw Error('TRANSPORT_REQUIRED');
 if(environment!=='LAB')throw Error('SDK_LAB_ONLY');
 if(typeof session_token!=='string'||!session_token||typeof company_id!=='string'||!company_id)throw Error('CONTEXT_REQUIRED');
 const call=(action,fields={})=>request({session_token,action,params:{...fields,company_id,environment}});
 return Object.freeze({
  listCapabilities:()=>call('list_capabilities'),
  getCapability:capability_id=>call('get_capability',{capability_id}),
  getEngineStatus:engine_id=>call('get_engine_status',{engine_id}),
  listJobs:(engine_id,version)=>call('list_jobs',{engine_id,version}),
  listWorkActivity:()=>call('list_work_activity'),
  getDependencyStatus:()=>call('get_dependency_status'),
  readStagingSuspension:()=>call('get_staging_suspension_live'),
  captureStagingEvidence:idempotency_key=>call('capture_staging_suspension',{idempotency_key}),
  assessOperation:operation=>call('assess_operation',{operation}),
  getJob001Controls:()=>call('get_job001_controls'),
  listOwnerSources:()=>call('list_owner_sources'),
  getJob:(engine_id,version,job_id)=>call('get_job',{engine_id,version,job_id}),
  getEvidence:capability_id=>call('get_evidence',{capability_id}),
  dryRun:(engine_id,capability_id,version,payload,idempotency_key)=>call('submit_command',{engine_id,capability_id,version,payload,idempotency_key,dry_run:true}),
  invokeRead:(capability_id,payload={})=>call('invoke_read',{capability_id,payload}),
  audit:()=>call('audit_log')
 });
}
