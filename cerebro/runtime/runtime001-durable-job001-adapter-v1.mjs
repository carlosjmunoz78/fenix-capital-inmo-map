import { DurableJobRuntimeV1 } from './durable-job-runtime-v1.mjs';
const ctxKey=ctx=>[ctx.company_id,ctx.engine_id,ctx.environment,ctx.version].join('|');
export class Runtime001DurableJob001LedgerAdapterV1 {
 #runtime; #leases=new Map(); #now; #leaseMs;
 constructor({file_path,environment='PREPROD',now=()=>Date.now(),lease_ms=60000}={}){
  if(environment!=='PREPROD')throw Error('RUNTIME001_ADAPTER_PREPROD_ONLY');
  if(typeof file_path!=='string'||!file_path)throw Error('RUNTIME001_FILE_REQUIRED');
  this.#runtime=new DurableJobRuntimeV1({file_path,environment});this.#now=now;this.#leaseMs=lease_ms;
 }
 enqueue(input){if(input.context?.environment!=='PREPROD'||/LAB-TRD|TRADING/i.test(input.context?.engine_id||''))throw Error('RUNTIME001_ADAPTER_CONTEXT_DENIED');return this.#runtime.enqueue({...input,now_ms:this.#now()});}
 leaseNext({context,worker_id}) {
  if(context.environment!=='PREPROD'||/LAB-TRD|TRADING/i.test(context.engine_id))throw Error('RUNTIME001_ADAPTER_CONTEXT_DENIED');
  const job=this.#runtime.claim({context,worker_id,now_ms:this.#now(),lease_ms:this.#leaseMs});
  if(!job)return null;this.#leases.set(job.job_id,{worker_id,context});
  return {job_id:job.job_id,idempotency_key:job.idempotency_key,...job.context,attempt:job.attempts,payload:job.payload};
 }
 heartbeat({job_id,context}){const lease=this.#lease(job_id,context);return this.#runtime.heartbeat({job_id,worker_id:lease.worker_id,now_ms:this.#now(),lease_ms:this.#leaseMs});}
 succeed({job_id,context,result}){const lease=this.#lease(job_id,context);const out=this.#runtime.complete({job_id,worker_id:lease.worker_id,result,now_ms:this.#now()});this.#leases.delete(job_id);return {deduplicated:false,job:out};}
 fail({job_id,context,error}){const lease=this.#lease(job_id,context);const out=this.#runtime.fail({job_id,worker_id:lease.worker_id,error,now_ms:this.#now()});this.#leases.delete(job_id);return {retryable:out.status==='RETRY_WAIT',job:out};}
 recoverExpired({context}){if(context.environment!=='PREPROD'||/LAB-TRD|TRADING/i.test(context.engine_id))throw Error('RUNTIME001_ADAPTER_CONTEXT_DENIED');const recovered=this.#runtime.watchdog({now_ms:this.#now(),context});return {recovered:recovered.length};}
 get(job_id){return this.#runtime.get(job_id);}
 listForContext(context){return this.#runtime.listForContext(context);}
 get journal_path(){return this.#runtime.journal_path;}
 #lease(job_id,context){const lease=this.#leases.get(job_id);if(!lease||ctxKey(lease.context)!==ctxKey(context))throw Error('RUNTIME001_LEASE_CONTEXT_DENIED');return lease;}
}
export const RUNTIME001_DURABLE_JOB001_ADAPTER_CONTRACT_V1=Object.freeze({uses_existing_durable_job_ledger:true,additional_queue:false,additional_scheduler:false,environment:'PREPROD',prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
