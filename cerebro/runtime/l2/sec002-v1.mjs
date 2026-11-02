import { assertNonEmptyString, assertNonNegativeNumber, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const SEC_002=deepFreeze({engine_id:'SEC-002',version:'0.1.0',layer:'L2',capability:'SECRETS_METADATA_FOUNDATION',secret_values_allowed:false,rotation_execution:false,prod_writes:false,additional_cost_eur:0});
const FORBIDDEN_VALUE_KEYS=new Set(['value','secret','token','password','private_key','privateKey','api_key','apiKey']);

function assertNoSecretValues(input){for(const key of Object.keys(input ?? {}))if(FORBIDDEN_VALUE_KEYS.has(key))throw new Error(`secret value field is forbidden: ${key}`);}
function time(value,label){const s=assertNonEmptyString(value,label);const n=Date.parse(s);if(!Number.isFinite(n))throw new TypeError(`${label} must be ISO-compatible`);return n;}

export function buildSecretInventoryEntry(input){
  assertNoSecretValues(input);
  const secret_id=assertNonEmptyString(input?.secret_id,'secret_id');
  const provider=assertNonEmptyString(input?.provider,'provider');
  const location_ref=assertNonEmptyString(input?.location_ref,'location_ref');
  const owner=assertNonEmptyString(input?.owner,'owner');
  const access_scopes=Array.isArray(input?.access_scopes)?input.access_scopes.map((x,i)=>assertNonEmptyString(x,`access_scopes[${i}]`)):[];
  const rotation_interval_ms=assertNonNegativeNumber(input?.rotation_interval_ms,'rotation_interval_ms');
  const last_rotated_at=assertNonEmptyString(input?.last_rotated_at,'last_rotated_at');time(last_rotated_at,'last_rotated_at');
  return result('SEC-002',{status:'METADATA_REGISTERED',secret_id,provider,location_ref,owner,access_scopes,rotation_interval_ms,last_rotated_at,metadata:clone(input?.metadata ?? {}),contains_secret_value:false,rotation_execution:false});
}

export function assessSecretRotation(entry,now){
  assertNoSecretValues(entry);
  const last=time(entry?.last_rotated_at,'entry.last_rotated_at'),current=time(now,'now');
  if(current<last)throw new RangeError('now must not be before last_rotated_at');
  const interval=assertNonNegativeNumber(entry?.rotation_interval_ms,'entry.rotation_interval_ms');
  const age_ms=current-last,due=age_ms>=interval;
  return result('SEC-002',{status:due?'ROTATION_DUE':'CURRENT',secret_id:assertNonEmptyString(entry?.secret_id,'entry.secret_id'),age_ms,rotation_interval_ms:interval,rotation_due:due,rotation_execution:false});
}
