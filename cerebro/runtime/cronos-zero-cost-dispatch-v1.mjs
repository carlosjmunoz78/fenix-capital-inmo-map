// CRONOS LAB dispatch guard. Only trusted coordinator-owned route descriptors.
// No external inference until the central quota reservation / reconciliation port exists.
import {DeepSeekBudgetGuardV0} from './deepseek-budget-guard-v0.mjs';
export const CRONOS_CLOSURE_BUDGET=Object.freeze({target_eur:150,authorized_incremental_eur:0,auto_recharge:false,paid_inference:false,environment:'LAB'});
const guard=new DeepSeekBudgetGuardV0({initialHardCapEur:0,monthlyVariableCeilingEur:0,autoRecharge:false});
const valid=n=>Number.isSafeInteger(n)&&n>=0;
const verdict=(code,allowed=false)=>Object.freeze({allowed,code,authorized_incremental_eur:0,target_eur:150,production_authorized:false});
export function evaluateCronosDispatch({route,projected_micros,settled_micros,reserved_micros}={}){
  if(![projected_micros,settled_micros,reserved_micros].every(valid))return verdict('HOLD_UNKNOWN_COST');
  const committed=settled_micros+reserved_micros;
  if(!Number.isSafeInteger(committed)||committed>0||projected_micros>0)return verdict('MONEY_LIMIT');
  if(route?.provider==='DEEPSEEK'){
    const legacy=guard.authorize({spentEur:committed/1e6,projectedCostEur:projected_micros/1e6});
    if(!legacy.allowed)return verdict('MONEY_LIMIT');
  }
  if(route?.environment!=='LAB'||route?.approved!==true)return verdict('HOLD_ROUTE_AUTHORITY');
  if(route.provider==='LOCAL'&&route.execution_class==='DETERMINISTIC'&&route.external_calls===false&&route.inference===false)return verdict('ALLOW_LOCAL_ZERO_COST',true);
  return verdict('HOLD_QUOTA_AND_RESERVATION_REQUIRED');
}
