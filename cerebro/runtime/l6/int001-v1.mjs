import { assertNonEmptyString, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const INT_001=deepFreeze({engine_id:'INT-001',version:'0.1.0',layer:'L6',capability:'INTEGRATION_INVENTORY_FOUNDATION',secret_values_allowed:false,health_execution:false,prod_writes:false,additional_cost_eur:0});
const FORBIDDEN=new Set(['token','secret','password','api_key','apiKey','private_key','privateKey','value']);

function noSecretValues(obj,label='integration'){
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return;
  for(const [k,v] of Object.entries(obj)){if(FORBIDDEN.has(k))throw new Error(`${label} contains forbidden secret-value field: ${k}`);if(v&&typeof v==='object'&&!Array.isArray(v))noSecretValues(v,`${label}.${k}`);}
}

export function buildIntegrationInventoryEntry(input){
  noSecretValues(input);
  const integration_id=assertNonEmptyString(input?.integration_id,'integration_id');
  const provider=assertNonEmptyString(input?.provider,'provider');
  const owner=assertNonEmptyString(input?.owner,'owner');
  const company_id=assertNonEmptyString(input?.company_id,'company_id');
  const readers=Array.isArray(input?.readers)?input.readers.map((x,i)=>assertNonEmptyString(x,`readers[${i}]`)):[];
  const writers=Array.isArray(input?.writers)?input.writers.map((x,i)=>assertNonEmptyString(x,`writers[${i}]`)):[];
  const webhooks=Array.isArray(input?.webhooks)?input.webhooks.map((x,i)=>assertNonEmptyString(x,`webhooks[${i}]`)):[];
  const credential_ref=input?.credential_ref?assertNonEmptyString(input.credential_ref,'credential_ref'):null;
  return result('INT-001',{status:'REGISTERED',integration_id,provider,owner,company_id,readers,writers,webhooks,credential_ref,health:clone(input?.health ?? {status:'UNKNOWN'}),contains_secret_values:false,health_execution:false});
}

export function assessIntegrationHealth(entry){
  noSecretValues(entry,'entry');
  const status=assertNonEmptyString(entry?.health?.status ?? 'UNKNOWN','health.status').toUpperCase();
  const healthy=status==='GREEN';
  return result('INT-001',{integration_id:assertNonEmptyString(entry?.integration_id,'integration_id'),status:healthy?'GREEN':'ATTENTION',reported_health:status,health_execution:false});
}
