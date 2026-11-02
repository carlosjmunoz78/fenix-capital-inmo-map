import { assertNonEmptyString, deepFreeze, result } from '../l0/shared-v1.mjs';

export const LOCAL_001=deepFreeze({engine_id:'LOCAL-001',version:'0.1.0',layer:'L6',capability:'LOCAL_FIRST_PLANNER_FOUNDATION',execution:false,prod_writes:false,additional_cost_eur:0});

export function selectProcessingPath(input){
  const task_id=assertNonEmptyString(input?.task_id,'task_id'),task_type=assertNonEmptyString(input?.task_type,'task_type').toUpperCase();
  const local_supported=input?.local_supported===true,local_available=input?.local_available===true,free_fallback_available=input?.free_fallback_available===true,paid_fallback_required=input?.paid_fallback_required===true;
  if(local_supported&&local_available)return result('LOCAL-001',{task_id,task_type,status:'LOCAL_SELECTED',path:'LOCAL',human_exception_code:null,execution:false});
  if(free_fallback_available)return result('LOCAL-001',{task_id,task_type,status:'FREE_FALLBACK_SELECTED',path:'FREE_FALLBACK',human_exception_code:null,execution:false});
  if(paid_fallback_required)return result('LOCAL-001',{task_id,task_type,status:'HUMAN_REQUIRED',path:null,human_exception_code:'MONEY_LIMIT',execution:false});
  return result('LOCAL-001',{task_id,task_type,status:'NO_SAFE_PATH',path:null,human_exception_code:'LOW_CONFIDENCE',execution:false});
}
