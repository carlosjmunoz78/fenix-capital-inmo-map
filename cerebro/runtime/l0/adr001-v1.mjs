import { assertNonEmptyString, deepFreeze, clone, result } from './shared-v1.mjs';
export const ADR_001 = deepFreeze({ engine_id:'ADR-001', version:'0.1.0', layer:'L0', mode:'IMMUTABLE_RECORD', prod_writes:false, additional_cost_eur:0 });
export function createAdr(input){
  const record={adr_id:assertNonEmptyString(input?.adr_id,'adr_id'),title:assertNonEmptyString(input?.title,'title'),context:assertNonEmptyString(input?.context,'context'),decision:assertNonEmptyString(input?.decision,'decision'),alternatives:clone(input?.alternatives ?? []),consequences:clone(input?.consequences ?? []),rollback:assertNonEmptyString(input?.rollback,'rollback'),created_at:assertNonEmptyString(input?.created_at,'created_at')};
  if(!Array.isArray(record.alternatives)||!Array.isArray(record.consequences)) throw new TypeError('alternatives and consequences must be arrays');
  return result('ADR-001',{status:'VALID',record});
}
