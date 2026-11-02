import { assertNonEmptyString, assertSafeNumber, deepFreeze, result } from './shared-v1.mjs';
export const OBJ_001 = deepFreeze({ engine_id:'OBJ-001', version:'0.1.0', layer:'L0', mode:'DETERMINISTIC_OBJECTIVES', prod_writes:false, additional_cost_eur:0 });
export function evaluateObjective({objective_id,current,target,direction='MAXIMIZE'}){
  const id=assertNonEmptyString(objective_id,'objective_id'); current=assertSafeNumber(current,'current'); target=assertSafeNumber(target,'target');
  const dir=assertNonEmptyString(direction,'direction').toUpperCase(); if(!['MAXIMIZE','MINIMIZE','EXACT'].includes(dir)) throw new TypeError('direction must be MAXIMIZE, MINIMIZE or EXACT');
  const achieved=dir==='MAXIMIZE'?current>=target:dir==='MINIMIZE'?current<=target:current===target;
  return result('OBJ-001',{objective_id:id,status:achieved?'ACHIEVED':'GAP',direction,current,target,variance:current-target});
}
