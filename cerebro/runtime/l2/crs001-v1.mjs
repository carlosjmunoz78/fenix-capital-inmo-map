import { assertLabContext, assertNonEmptyString, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const CRS_001=deepFreeze({engine_id:'CRS-001',version:'0.1.0',layer:'L2',capability:'CRISIS_PLAYBOOK_FOUNDATION',communications_execution:false,prod_writes:false,additional_cost_eur:0});
const LEVELS=new Set(['LOW','MEDIUM','HIGH','CRITICAL']);

export function classifyCrisis(input){
  const context=assertLabContext(input?.context);
  const crisis_id=assertNonEmptyString(input?.crisis_id,'crisis_id'),type=assertNonEmptyString(input?.type,'type').toUpperCase(),severity=assertNonEmptyString(input?.severity,'severity').toUpperCase();
  if(!LEVELS.has(severity))throw new TypeError('severity must be LOW, MEDIUM, HIGH or CRITICAL');
  let human_exception_code=null;
  if(input?.customer_human_request===true)human_exception_code='CUSTOMER_HUMAN_REQUEST';
  else if(input?.security_incident===true)human_exception_code='SECURITY_INCIDENT';
  else if(input?.legal_required===true)human_exception_code='LEGAL_REQUIRED';
  else if(severity==='HIGH'||severity==='CRITICAL')human_exception_code='HIGH_RISK';
  return result('CRS-001',{
    status:human_exception_code?'HUMAN_REQUIRED':'PLAYBOOK_CANDIDATE',context,crisis_id,type,severity,human_exception_code,
    communications:clone(input?.communications ?? []),communications_execution:false,prod_write:false
  });
}
