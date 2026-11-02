import { assertLabContext, assertNonEmptyString, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const INC_001=deepFreeze({engine_id:'INC-001',version:'0.1.0',layer:'L2',capability:'INCIDENT_FOUNDATION',containment_execution:false,prod_writes:false,additional_cost_eur:0});
const LEVELS=new Set(['LOW','MEDIUM','HIGH','CRITICAL']);

export function classifyIncident(input){
  const context=assertLabContext(input?.context);
  const incident_id=assertNonEmptyString(input?.incident_id,'incident_id');
  const type=assertNonEmptyString(input?.type,'type').toUpperCase();
  const severity=assertNonEmptyString(input?.severity,'severity').toUpperCase();
  if(!LEVELS.has(severity))throw new TypeError('severity must be LOW, MEDIUM, HIGH or CRITICAL');
  const known=input?.known===true,security_incident=input?.security_incident===true,legal_required=input?.legal_required===true;
  let human_exception_code=null;
  if(security_incident)human_exception_code='SECURITY_INCIDENT';
  else if(legal_required)human_exception_code='LEGAL_REQUIRED';
  else if(severity==='CRITICAL')human_exception_code='HIGH_RISK';
  const status=human_exception_code?'HUMAN_REQUIRED':known?'RUNBOOK_CANDIDATE':'TRIAGE_REQUIRED';
  return result('INC-001',{status,context,incident_id,type,severity,known,human_exception_code,impact:clone(input?.impact ?? {}),containment_execution:false,rca_required:true,learning_required:true});
}
