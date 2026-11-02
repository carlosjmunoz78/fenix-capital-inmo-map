import { assertNonEmptyString, assertNonNegativeNumber, assertSafeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const BCP_001=deepFreeze({engine_id:'BCP-001',version:'0.1.0',layer:'L2',capability:'CONTINUITY_PLAN_FOUNDATION',execution:false,prod_writes:false,additional_cost_eur:0});

export function selectContinuityPlan(input){
  const service_id=assertNonEmptyString(input?.service_id,'service_id');
  const money_limit_eur=assertNonNegativeNumber(input?.money_limit_eur ?? 0,'money_limit_eur');
  if(!Array.isArray(input?.options)||!input.options.length)throw new TypeError('options must be a non-empty array');
  const options=input.options.map((x,i)=>({
    id:assertNonEmptyString(x?.id,`options[${i}].id`),
    priority:assertSafeNumber(x?.priority,`options[${i}].priority`),
    available:x?.available===true,
    safe:x?.safe===true,
    additional_cost_eur:assertNonNegativeNumber(x?.additional_cost_eur ?? 0,`options[${i}].additional_cost_eur`),
    degradation_mode:assertNonEmptyString(x?.degradation_mode ?? 'NONE',`options[${i}].degradation_mode`)
  }));
  const safeAvailable=options.filter(x=>x.safe&&x.available);
  const within=safeAvailable.filter(x=>x.additional_cost_eur<=money_limit_eur).sort((a,b)=>a.priority-b.priority||a.additional_cost_eur-b.additional_cost_eur||a.id.localeCompare(b.id));
  if(within.length)return result('BCP-001',{status:'PLAN_SELECTED',service_id,plan:within[0],execution:false,human_exception_code:null});
  if(safeAvailable.length)return result('BCP-001',{status:'HUMAN_REQUIRED',service_id,plan:null,execution:false,human_exception_code:'MONEY_LIMIT'});
  return result('BCP-001',{status:'HUMAN_REQUIRED',service_id,plan:null,execution:false,human_exception_code:'HIGH_RISK'});
}
