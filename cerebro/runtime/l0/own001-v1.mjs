import { assertNonEmptyString, assertPlainObject, deepFreeze, result } from './shared-v1.mjs';
export const OWN_001 = deepFreeze({ engine_id:'OWN-001', version:'0.1.0', layer:'L0', mode:'DETERMINISTIC_OWNERSHIP', prod_writes:false, additional_cost_eur:0 });
export function resolveOwner({engine_id,owners,fallback_owner=null}){
  const id=assertNonEmptyString(engine_id,'engine_id'); assertPlainObject(owners,'owners');
  const owner=owners[id] ?? fallback_owner;
  if (owner==null) return result('OWN-001',{status:'UNASSIGNED',engine_id:id,owner:null});
  return result('OWN-001',{status:'ASSIGNED',engine_id:id,owner:assertNonEmptyString(owner,'owner')});
}
