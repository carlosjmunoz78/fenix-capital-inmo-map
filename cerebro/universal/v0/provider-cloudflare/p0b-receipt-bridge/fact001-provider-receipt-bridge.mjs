/** CEREBRO P0-B · FACT-001 provider receipt validation (LAB only, fail closed).
 * Pure: receives separately observed job/event/provider/ownership evidence.
 * This is NOT a remote provider acknowledgement or proof that the runtime deployed it.
 */
const SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
const OPERATIONS={
 'worker.create_private':{phase:'CREATED_V1_PRIVATE',owner:'V1',exists:true},
 'worker.update_private':{phase:'UPDATED_V2_PRIVATE',owner:'V2',exists:true},
 'worker.rollback_private':{phase:'ROLLED_BACK_V1_PRIVATE',owner:'ROLLED_BACK',exists:true},
 'worker.delete_private':{phase:'OWNED_WORKER_REMOVED',owner:'DELETED',exists:false}
};
const RESOURCE=/^cerebro-fact001-managed-lab-[a-z0-9]{4,20}$/;
const REQUEST=/^[A-Z0-9-]{10,80}$/;
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const VERSION=/^[a-f0-9-]{16,64}$/i;
const fail=reason=>Object.freeze({status:'NOT_CERTIFIED',reason,provider_readback_matched:false,
 signed_runtime_receipt_verified:false,provider_causality_certified:false,prod_promotion_allowed:false});
const equalScope=x=>x&&Object.entries(SCOPE).every(([k,v])=>x[k]===v);
const validTime=n=>Number.isSafeInteger(n)&&n>0;
/**
 * Requires fresh provider readback AND a durable terminal event; refuses optimistic
 * matches, provider-only screenshots and local operator P0-B fixture receipts.
 * Outputs a non-certifying evidence projection until runtime signature & canonical
 * company mapping have been independently verified.
 */
export function validateFact001ProviderReadbackV0({job,event,ownership,provider,readback,observed_at_ms}={}){
 if(!equalScope(job)||!ID.test(job?.id||'')||!REQUEST.test(job?.request_id||'')||
    !ID.test(job?.idempotency_key||'')||!RESOURCE.test(job?.resource_name||'')||
    job?.state!=='COMPLETED'||job?.attempts!==1||job?.max_cost_eur!==0||
    !Object.hasOwn(OPERATIONS,job?.operation||''))return fail('JOB_CONTRACT_INVALID');
 if(!event||event.job_id!==job.id||event.event!=='JOB_FINISHED'||
    event.state!=='COMPLETED'||event.phase!==OPERATIONS[job.operation].phase||
    event.error_code!==null)return fail('TERMINAL_EVENT_INVALID');
 if(!validTime(event.recorded_at_ms)||!validTime(job.created_at_ms)||
    !validTime(job.updated_at_ms)||!validTime(observed_at_ms)||
    event.recorded_at_ms<job.created_at_ms||observed_at_ms<event.recorded_at_ms||
    observed_at_ms-event.recorded_at_ms>300000)return fail('READBACK_NOT_FRESH');
 if(!equalScope(ownership)||ownership.name!==job.resource_name||
    (ownership.created_by_request!==job.request_id&&job.operation==='worker.create_private')||
    ownership.state!==OPERATIONS[job.operation].owner)return fail('OWNERSHIP_INVALID');
 const expected=OPERATIONS[job.operation];
 if(!provider||provider.name!==job.resource_name||provider.exists!==expected.exists||
    provider.account_id!=='e39a57e1ac42650ca5a6d5307cf0ac8e'||
    provider.api_read_success!==true||
    provider.workers_dev_enabled!==false||provider.preview_urls_enabled!==false||
    provider.routes_count!==0||provider.domains_count!==0||provider.crons_count!==0||
    provider.bindings_count!==0)return fail('PROVIDER_PRIVATE_READBACK_INVALID');
 if(!readback||readback.source!=='CLOUDFLARE_PROVIDER_API'||
    readback.name!==job.resource_name||readback.exists!==expected.exists||
    !validTime(readback.observed_at_ms)||readback.observed_at_ms>observed_at_ms||
    readback.observed_at_ms<event.recorded_at_ms||
    observed_at_ms-readback.observed_at_ms>300000)return fail('INDEPENDENT_READBACK_INVALID');
 if(expected.exists){
  const desired=job.operation==='worker.update_private'?ownership.v2_version_id:ownership.v1_version_id;
  if(!VERSION.test(desired||'')||ownership.current_version_id!==desired||
     provider.version_id!==desired||readback.version_id!==desired)return fail('VERSION_READBACK_MISMATCH');
 }else if(ownership.current_version_id!==null||provider.version_id!==null||readback.version_id!==null){
  return fail('DELETED_VERSION_STILL_ACTIVE');
 }
 return Object.freeze({status:'READBACK_MATCHED_UNATTESTED',reason:'RUNTIME_SIGNED_RECEIPT_AND_COMPANY_MAPPING_PENDING',
  provider_readback_matched:true,signed_runtime_receipt_verified:false,
  provider_causality_certified:false,prod_promotion_allowed:false,
  job_id:job.id,request_id:job.request_id,operation:job.operation,
  company_id:job.company_id,engine_id:job.engine_id,environment:job.environment,
  provider:'CLOUDFLARE_WORKERS',observed_at_ms});
}
