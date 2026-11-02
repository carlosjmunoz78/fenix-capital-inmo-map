import { assertLabContext, assertNonEmptyString, deepFreeze, result } from '../l0/shared-v1.mjs';

export const SUP_001=deepFreeze({engine_id:'SUP-001',version:'0.1.0',layer:'L2',capability:'SUPERVISOR_FOUNDATION',recovery_execution:false,prod_writes:false,additional_cost_eur:0});
const HEALTH=new Set(['GREEN','YELLOW','RED']);
const SEVERITY={LOW:0,MEDIUM:1,HIGH:2,CRITICAL:3};

export function evaluateHealth(input){
  const context=assertLabContext(input?.context);
  if(!Array.isArray(input?.checks)||!input.checks.length)throw new TypeError('checks must be a non-empty array');
  const checks=input.checks.map((x,i)=>{
    const id=assertNonEmptyString(x?.id,`checks[${i}].id`),status=assertNonEmptyString(x?.status,`checks[${i}].status`).toUpperCase(),severity=assertNonEmptyString(x?.severity ?? 'LOW',`checks[${i}].severity`).toUpperCase();
    if(!HEALTH.has(status)||!(severity in SEVERITY))throw new TypeError(`checks[${i}] has invalid status/severity`);
    return {id,status,severity,known:x?.known===true,recovery_playbook_id:x?.recovery_playbook_id?assertNonEmptyString(x.recovery_playbook_id,`checks[${i}].recovery_playbook_id`):null,security_incident:x?.security_incident===true};
  });
  const worst=checks.reduce((a,b)=>SEVERITY[b.severity]>SEVERITY[a.severity]?b:a,checks[0]);
  const security=checks.some(x=>x.security_incident),critical=checks.some(x=>x.severity==='CRITICAL'),red=checks.filter(x=>x.status==='RED');
  const human_exception_code=security?'SECURITY_INCIDENT':critical?'HIGH_RISK':null;
  return result('SUP-001',{status:human_exception_code?'HUMAN_REQUIRED':red.length?'RECOVERY_PLAN_REQUIRED':'HEALTHY',context,worst,checks,red_checks:red,human_exception_code,recovery_execution:false});
}
