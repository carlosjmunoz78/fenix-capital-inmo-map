/** Additive JOB-001 enqueue wrapper: universal excellence can stop suspended LAB performers.
 * Never modifies JOB-001 internals, grants IAM, or schedules real external work.
 */
import {dispatchGate} from './universal-excellence-lab-v0.mjs';
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_:.-]{2,100}$/.test(x);
export function guardedEnqueueLab({job_runtime,merit_ledger_path,actor_id,
 context,lab_version='0.1.0',task_name,payload={},now_ms=Date.now()}={}){
 if(!job_runtime||typeof job_runtime.enqueue!=='function')throw Error('MERIT_JOB001_RUNTIME_REQUIRED');
 if(!valid(actor_id)||!valid(task_name)||!context||typeof context!=='object')throw Error('MERIT_JOB001_INPUT_INVALID');
 if(context.environment!=='PREPROD'||!valid(context.company_id)||!valid(context.engine_id)||!valid(context.version))
  throw Error('MERIT_JOB001_PREPROD_ONLY');
 if(!Number.isSafeInteger(now_ms)||now_ms<1)throw Error('MERIT_JOB001_CLOCK_INVALID');
 if(!merit_ledger_path)throw Error('MERIT_JOB001_LEDGER_REQUIRED');
 if(payload===null||typeof payload!=='object'||Array.isArray(payload))throw Error('MERIT_JOB001_PAYLOAD_INVALID');
 if(Object.keys(payload).some(k=>/secret|password|jwt|token|customer/i.test(k)))
  throw Error('MERIT_JOB001_SENSITIVE_PAYLOAD_DENIED');
 const meritContext={company_id:context.company_id,engine_id:context.engine_id,
  environment:'LAB',version:lab_version};
 const gate=dispatchGate({file_path:merit_ledger_path,context:meritContext,subject_actor_id:actor_id});
 if(gate.decision!=='LAB_TASK_ELIGIBLE')return {status:'DENIED_BY_UNIVERSAL_EXCELLENCE_LAB',
  actor_id,gate,job_id:null,job_created:false,prod_authorized:false};
 const lab_priority=gate.state==='EXCELLENCE_REWARD_CANDIDATE_LAB'?50:100;
 const result=job_runtime.enqueue({name:task_name,context,priority:lab_priority,payload:{
  ...payload,universal_merit_gate:{actor_id,policy:'CEREBRO_UNIVERSAL_EXCELLENCE_OWNER_AUTHORITY_V0',
   lab_decision:gate.decision,role_state:gate.state,iam_actor_authenticated:false,
   prod_authorized:false}
 },idempotency_key:'universal-merit-'+actor_id+'-'+task_name+'-'+context.company_id,now_ms,
 max_attempts:1,timeout_ms:10000});
 return {status:'LAB_READONLY_JOB001_QUEUED_NOT_DISPATCHED_TO_EXTERNAL_SERVICE',
  actor_id,gate,job_id:result.job.job_id,job_created:result.accepted,
  lab_priority_applied:lab_priority,experimental_reward:'IN_SCOPE_JOB_PRIORITY_ONLY_NO_ADDITIONAL_PRIVILEGES',
  prod_authorized:false,paid_ai_calls:0,external_writes:0};
}
