/** LAB-DEMO-001 transition check: a receipt is not proof of the requested action
 * until original state, mutation semantics and fresh persisted readback agree.
 * No business job, signed agent identity, or global cost is certified here.
 */
import type {LabWorkerAction,LabWorkerReceipt,LabWorkerState} from './cerebroLabWorkerControlApi';
import {summarizeLabRuntimeEvidence} from './cerebroRuntimeEvidence.ts';

export type LabTransitionVerdict={verified:boolean;reason:string};
const rejected=(reason:string):LabTransitionVerdict=>({verified:false,reason});
export function verifyLabReceiptCausality(
 before:LabWorkerState,action:LabWorkerAction,requestedPriority:number|null,
 receipt:LabWorkerReceipt,readback:LabWorkerState|null|undefined,now=Date.now()
):LabTransitionVerdict{
 if(!before||!receipt||!readback)return rejected('MISSING_RECEIPT_OR_READBACK');
 if(before.company_id!=='fenix'||before.environment!=='LAB'||before.engine_id!=='LAB-DEMO-001'||
  before.version!=='0.1.0'||readback.company_id!=='fenix'||readback.environment!=='LAB'||
  readback.engine_id!=='LAB-DEMO-001'||readback.version!=='0.1.0'||
  receipt.company_id!=='fenix'||receipt.environment!=='LAB'||receipt.engine_id!=='LAB-DEMO-001')
  return rejected('SCOPE_NOT_VERIFIED');
 if(receipt.prod_execution_enabled!==false||receipt.external_actions_executed!==false||
   receipt.autonomous_scheduling!==false)return rejected('SIDE_EFFECTS_NOT_VERIFIED');
 const b=receipt.before,a=receipt.after;
 if(!b||!a||b.revision!==before.revision||b.desired_state!==before.desired_state||
  b.priority!==before.priority||b.work_units!==before.work_units)
  return rejected('BEFORE_STATE_MISMATCH');
 if(a.revision!==b.revision+1||!Number.isSafeInteger(a.work_units)||a.work_units<b.work_units)
  return rejected('REVISION_OR_COUNTER_MISMATCH');
 if(!['PAUSED','RUNNING'].includes(a.desired_state)||!Number.isSafeInteger(a.priority)||
   a.priority<1||a.priority>5)return rejected('AFTER_STATE_INVALID');
 const targetState=action==='PAUSE'?'PAUSED':action==='RESUME'?'RUNNING':b.desired_state;
 const targetPriority=action==='PRIORITIZE'?requestedPriority:b.priority;
 if(!['PAUSE','RESUME','PRIORITIZE','TICK'].includes(action)||targetPriority===null||
   !Number.isSafeInteger(targetPriority)||targetPriority<1||targetPriority>5)
  return rejected('ACTION_NOT_VERIFIED');
 if(a.desired_state!==targetState||a.priority!==targetPriority)
  return rejected('ACTION_TRANSITION_MISMATCH');
 const delta=a.work_units-b.work_units;
 if(action!=='TICK'&&(delta!==0||receipt.executed_work_units!==0))
  return rejected('UNEXPECTED_WORK');
 if(action==='TICK'&&(delta!==receipt.executed_work_units||![0,1].includes(delta)||
   (b.desired_state==='PAUSED'&&delta!==0)))
  return rejected('WORK_UNIT_DELTA_MISMATCH');
 if(readback.revision!==a.revision||readback.desired_state!==a.desired_state||
  readback.priority!==a.priority||readback.work_units!==a.work_units||
  readback.last_receipt_id!==receipt.receipt_id)
  return rejected('READBACK_MISMATCH');
 const runtime=summarizeLabRuntimeEvidence(readback,now);
 if(runtime.kind!=='ready')return rejected('READBACK_'+runtime.reason);
 // Only the desired state and manual counter are verified; never infer live agents/jobs.
 return {verified:true,reason:'MANUAL_LAB_TRANSITION_VERIFIED'};
}
