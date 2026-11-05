/**
 * Read-only governance hook in front of the EXISTING JOB-001 handoff router.
 * Does not create a queue, worker, scheduler, listener or executor.
 * Operates only on a PREPROD work outcome authenticated by the host runtime.
 */
import {evaluateSelfInitiatedWorkV0} from './agent-excellence-autonomy-v0.mjs';
const SOURCE_NAME='agent.autonomous.intent.v0';
const KEYS=['company_id','engine_id','environment','version'];
const plain=x=>x!==null && typeof x==='object' && !Array.isArray(x) && (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const hold=(code,decision='HOLD')=>Object.freeze({status:decision,reason:code,queued:false,prod_authorized:false,trading_access:false});
export const AGENT_AUTONOMY_BRIDGE_CONTRACT_V0=Object.freeze({
 source_job_name:SOURCE_NAME,existing_queue_only:true,additional_workers:0,
 prod_writes:false,trading_access:false,physical_pc_control:false,
 requires_runtime_attested_source:true,requires_owner_policy_grant:true,
 no_generated_execution_authority:true
});
export class AgentAutonomyHandoffBridgeV0 {
 #router;
 constructor({router}={}){
  if (!router||typeof router.handleOutcome!=='function'||!Array.isArray(router.allowed_job_names)) throw new TypeError('Existing governed handoff router required');
  this.#router=router;
 }
 handle({outcome,agent,supervisor,context,task,grant,now}={}) {
  if (![outcome,agent,supervisor,context,task,grant].every(plain)) return hold('malformed_input');
  const job=outcome.job;
  if (outcome.status!=='SUCCEEDED'||!plain(job)||job.name!==SOURCE_NAME||typeof job.job_id!=='string'||!job.job_id.trim())
   return hold('not_verified_autonomous_source_outcome');
  if (job.provenance?.runtime_verified!==true||job.provenance?.source_type!==SOURCE_NAME||!plain(job.context))
   return hold('source_job_attestation_required');
  if (!KEYS.every(k=>job.context[k]===context[k])) return hold('source_context_mismatch');
  if (task.source_job_id!==job.job_id) return hold('source_job_id_mismatch');
  const policy=evaluateSelfInitiatedWorkV0({agent,supervisor,context,task,grant,now});
  if (policy.decision!=='ROUTE_TO_EXISTING_GOVERNED_EXECUTOR') return hold(policy.code,policy.decision);
  // Actual execution authority remains inside the pre-existing runtime and target allowlist.
  const receipt=this.#router.handleOutcome({outcome});
  return Object.freeze({
   status:receipt.status,reason:receipt.reason??null,queued:receipt.status==='ENQUEUED',
   source_job_id:job.job_id,target_job_id:receipt.target_job_id??null,
   target_job_name:receipt.target_job_name??null,
   prod_authorized:false,trading_access:false,physical_pc_control:false,
   note:'Queue receipt only, not proof of executed work or Windows control.'
  });
 }
}