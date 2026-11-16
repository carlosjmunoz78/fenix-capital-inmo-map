/** FACT-001 evidence gate: D1 command logs versus provider CURRENT owned-worker state.
 * Pure reader validation; no network calls, no side effects, no claim of per-job
 * provider acknowledgement. Must never authorize execution or PROD promotion.
 */
const allowedOperations=new Set([
 'worker.create_private','worker.update_private',
 'worker.rollback_private','worker.delete_private'
]);
const nonEmpty=(value,max=180)=>typeof value==='string'&&value.length>0&&value.length<=max;
const emptyResult=(reason)=>({
 status:'NOT_CERTIFIED',historical_reconciliation:'UNAVAILABLE',
 job_count:null,matching_terminal_events:null,deleted_workers_absent:null,
 business_receipt_e2e:false,provider_job_receipt_verified:false,
 canonical_company_mapping_verified:false,cost_status:'NO_MEDIDO',
 reason
});
export function auditFact001ProviderEvidence({jobs,events,ownedWorkers,providerScriptNames}={}){
 if(!Array.isArray(jobs)||!Array.isArray(events)||!Array.isArray(ownedWorkers)||
  !Array.isArray(providerScriptNames)||jobs.length===0||jobs.length>100||
  events.length>1000||ownedWorkers.length>100||providerScriptNames.length>500)
  return emptyResult('SOURCE_MISSING_OR_OUT_OF_BOUNDS');
 if(providerScriptNames.some(x=>!nonEmpty(x,220)))
  return emptyResult('PROVIDER_INVENTORY_INVALID');
 const current=new Set(providerScriptNames);
 const ids=new Set(),requests=new Set(),idempotencies=new Set();
 for(const j of jobs){
  if(!j||j.company_id!=='fenix-capital'||j.environment!=='LAB'||j.engine_id!=='FACT-001'||
    !nonEmpty(j.id)||!nonEmpty(j.version)||!nonEmpty(j.request_id)||
    !nonEmpty(j.idempotency_key)||!allowedOperations.has(j.operation)||
    j.state!=='COMPLETED'||ids.has(j.id)||requests.has(j.request_id)||
    idempotencies.has(j.idempotency_key))
   return emptyResult('JOB_SCOPE_OR_CORRELATION_INVALID');
  ids.add(j.id);requests.add(j.request_id);idempotencies.add(j.idempotency_key);
 }
 let terminal=0;
 for(const id of ids){
  const matched=events.filter(e=>e&&e.job_id===id&&e.event==='JOB_FINISHED');
  if(matched.length!==1||matched[0].state!=='COMPLETED')
   return emptyResult('TERMINAL_EVENT_NOT_PROVEN');
  terminal++;
 }
 if(events.some(e=>e&&e.event==='JOB_FINISHED'&&!ids.has(e.job_id)))
  return emptyResult('ORPHAN_TERMINAL_EVENT');
 let deleted=0;
 const ownedNames=new Set();
 for(const row of ownedWorkers){
  if(!row||!nonEmpty(row.name,220)||ownedNames.has(row.name)||
   row.company_id!=='fenix-capital'||row.environment!=='LAB'||
   row.engine_id!=='FACT-001'||row.state!=='DELETED')
    return emptyResult('OWNERSHIP_CONTRACT_INVALID');
  ownedNames.add(row.name);
  if(current.has(row.name))
   return emptyResult('DELETED_WORKER_STILL_PRESENT');
  deleted++;
 }
 return {
  status:'PARTIAL',historical_reconciliation:'MATCHED',
  job_count:jobs.length,matching_terminal_events:terminal,
  deleted_workers_absent:deleted,
  business_receipt_e2e:false,provider_job_receipt_verified:false,
  canonical_company_mapping_verified:false,cost_status:'NO_MEDIDO',
  reason:'D1_HISTORY_AND_CURRENT_ABSENCE_ONLY_NO_PER_JOB_PROVIDER_RECEIPT'
 };
}
