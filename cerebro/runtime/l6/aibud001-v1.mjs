import { assertNonEmptyString, assertNonNegativeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const AIBUD_001=deepFreeze({engine_id:'AIBUD-001',version:'0.1.0',layer:'L6',capability:'AI_BUDGET_FOUNDATION',purchase_execution:false,prod_writes:false,additional_cost_eur:0});

export function evaluateAiBudget(input){
  const engine_id=assertNonEmptyString(input?.engine_id,'engine_id');
  const spent=assertNonNegativeNumber(input?.spent_eur ?? 0,'spent_eur'),proposed=assertNonNegativeNumber(input?.proposed_eur ?? 0,'proposed_eur'),hard_cap=assertNonNegativeNumber(input?.hard_cap_eur ?? 0,'hard_cap_eur');
  const projected=spent+proposed;
  if(projected>hard_cap)return result('AIBUD-001',{engine_id,status:'HUMAN_REQUIRED',spent_eur:spent,proposed_eur:proposed,hard_cap_eur:hard_cap,projected_eur:projected,human_exception_code:'MONEY_LIMIT',purchase_execution:false});
  return result('AIBUD-001',{engine_id,status:'WITHIN_BUDGET',spent_eur:spent,proposed_eur:proposed,hard_cap_eur:hard_cap,projected_eur:projected,remaining_eur:hard_cap-projected,human_exception_code:null,purchase_execution:false});
}
