import crypto from 'node:crypto';
import { assertNonEmptyString, assertSafeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const FF_001=deepFreeze({engine_id:'FF-001',version:'0.1.0',layer:'L6',capability:'FEATURE_FLAG_FOUNDATION',flag_persistence:false,prod_writes:false,additional_cost_eur:0});
function pct(v,label){assertSafeNumber(v,label);if(v<0||v>100)throw new RangeError(`${label} must be 0..100`);return v;}
function bucket(seed){const h=crypto.createHash('sha256').update(seed).digest();return h.readUInt32BE(0)%10000/100;}

export function evaluateFeatureFlag(input){
  const flag_id=assertNonEmptyString(input?.flag_id,'flag_id'),company_id=assertNonEmptyString(input?.company_id,'company_id'),environment=assertNonEmptyString(input?.environment,'environment').toUpperCase(),subject_id=assertNonEmptyString(input?.subject_id,'subject_id');
  if(environment==='PROD')throw new Error('PROD feature activation is outside this foundation');
  const enabled=input?.enabled===true,percentage=pct(input?.percentage ?? 0,'percentage');
  const roles=Array.isArray(input?.roles)?input.roles.map((x,i)=>assertNonEmptyString(x,`roles[${i}]`)):[];
  const role=input?.role?assertNonEmptyString(input.role,'role'):null;
  const roleAllowed=roles.length===0||roles.includes(role);
  const rollout_bucket=bucket(`${company_id}|${flag_id}|${subject_id}`);
  const active=enabled&&roleAllowed&&rollout_bucket<percentage;
  return result('FF-001',{flag_id,company_id,environment,subject_id,active,enabled,percentage,rollout_bucket,role_allowed:roleAllowed,flag_persistence:false});
}
