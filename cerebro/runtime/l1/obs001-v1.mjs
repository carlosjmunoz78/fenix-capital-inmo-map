import { assertNonEmptyString, assertNonNegativeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const OBS_001 = deepFreeze({
  engine_id:'OBS-001',version:'0.1.0',layer:'L1',capability:'OBSOLESCENCE_FOUNDATION',
  history_deletion:false,prod_writes:false,additional_cost_eur:0
});

function timestamp(value,label){const s=assertNonEmptyString(value,label);const n=Date.parse(s);if(!Number.isFinite(n))throw new TypeError(`${label} must be ISO-compatible`);return n;}

export function assessObsolescence(input){
  const record_id=assertNonEmptyString(input?.record_id,'record_id');
  const last=timestamp(input?.last_verified_at,'last_verified_at');
  const now=timestamp(input?.now,'now');
  if(now<last)throw new RangeError('now must not be before last_verified_at');
  const ttl_ms=assertNonNegativeNumber(input?.ttl_ms,'ttl_ms');
  const contradictions=Array.isArray(input?.contradictions)?input.contradictions.map((x,i)=>assertNonEmptyString(x,`contradictions[${i}]`)):[];
  const age_ms=now-last;
  const stale_by_ttl=age_ms>ttl_ms;
  const stale_by_contradiction=contradictions.length>0;
  const stale=stale_by_ttl||stale_by_contradiction;
  return result('OBS-001',{
    record_id,status:stale?'STALE':'ACTIVE',age_ms,ttl_ms,stale_by_ttl,stale_by_contradiction,
    contradictions,action:stale?'CREATE_REVIEW':'KEEP',delete_history:false
  });
}
