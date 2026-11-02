import { assertNonEmptyString, assertNonNegativeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const QAB_001=deepFreeze({engine_id:'QAB-001',version:'0.1.0',layer:'L2',capability:'PROCESS_QA_FOUNDATION',prod_writes:false,additional_cost_eur:0});

export function evaluateProcessQuality(input){
  const case_id=assertNonEmptyString(input?.case_id,'case_id');
  const nonconformities=[];
  const gates=Array.isArray(input?.gates)?input.gates:[];
  const slas=Array.isArray(input?.slas)?input.slas:[];
  const documents=Array.isArray(input?.documents)?input.documents:[];
  const followups=Array.isArray(input?.followups)?input.followups:[];
  for(const [i,g] of gates.entries()){
    const id=assertNonEmptyString(g?.id,`gates[${i}].id`);if(g?.required===true&&g?.passed!==true)nonconformities.push({type:'GATE',id,reason:'REQUIRED_GATE_NOT_PASSED'});
  }
  for(const [i,s] of slas.entries()){
    const id=assertNonEmptyString(s?.id,`slas[${i}].id`),actual=assertNonNegativeNumber(s?.actual_ms,`slas[${i}].actual_ms`),max=assertNonNegativeNumber(s?.max_ms,`slas[${i}].max_ms`);if(actual>max)nonconformities.push({type:'SLA',id,reason:'SLA_EXCEEDED',actual_ms:actual,max_ms:max});
  }
  for(const [i,d] of documents.entries()){
    const id=assertNonEmptyString(d?.id,`documents[${i}].id`);if(d?.required===true&&d?.present!==true)nonconformities.push({type:'DOCUMENT',id,reason:'REQUIRED_DOCUMENT_MISSING'});
  }
  for(const [i,f] of followups.entries()){
    const id=assertNonEmptyString(f?.id,`followups[${i}].id`);if(f?.required===true&&f?.done!==true)nonconformities.push({type:'FOLLOWUP',id,reason:'REQUIRED_FOLLOWUP_PENDING'});
  }
  return result('QAB-001',{case_id,status:nonconformities.length?'NON_CONFORMING':'CONFORMING',nonconformities,automatic_correction:false});
}
