import crypto from 'node:crypto';
import { assertNonEmptyString, assertNonNegativeNumber, assertPlainObject, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const CACHE_001=deepFreeze({
  engine_id:'CACHE-001',version:'0.1.0',layer:'L1',capability:'INTELLIGENCE_CACHE_FOUNDATION',
  persistence:'NOT_BOUND_IN_FOUNDATION',prod_writes:false,additional_cost_eur:0
});

function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function isoMs(v,l){const s=assertNonEmptyString(v,l);const n=Date.parse(s);if(!Number.isFinite(n))throw new TypeError(`${l} must be ISO-compatible`);return n;}

export function buildCacheKey(input){
  assertPlainObject(input,'input');
  const scope={
    company_id:assertNonEmptyString(input.company_id,'company_id'),
    engine_id:assertNonEmptyString(input.engine_id,'engine_id'),
    rule_version:assertNonEmptyString(input.rule_version,'rule_version'),
    prompt_version:assertNonEmptyString(input.prompt_version ?? 'none','prompt_version'),
    domain:assertNonEmptyString(input.domain,'domain'),
    payload:clone(input.payload ?? null)
  };
  const canonical=JSON.stringify(stable(scope));
  return result('CACHE-001',{cache_key:crypto.createHash('sha256').update(canonical).digest('hex'),scope});
}

export function createCacheRecord(input){
  const key=assertNonEmptyString(input?.cache_key,'cache_key');
  const created_at=assertNonEmptyString(input?.created_at,'created_at');isoMs(created_at,'created_at');
  const ttl_ms=assertNonNegativeNumber(input?.ttl_ms,'ttl_ms');
  return result('CACHE-001',{status:'CACHE_RECORD',cache_key:key,created_at,ttl_ms,value:clone(input?.value ?? null),persistent:false});
}

export function assessCacheRecord(record,now){
  const created=isoMs(record?.created_at,'record.created_at'),current=isoMs(now,'now');
  if(current<created)throw new RangeError('now must not be before record.created_at');
  const ttl=assertNonNegativeNumber(record?.ttl_ms,'record.ttl_ms');
  const age_ms=current-created,fresh=age_ms<=ttl;
  return result('CACHE-001',{status:fresh?'HIT_FRESH':'MISS_STALE',fresh,age_ms,ttl_ms:ttl,cache_key:assertNonEmptyString(record?.cache_key,'record.cache_key')});
}
