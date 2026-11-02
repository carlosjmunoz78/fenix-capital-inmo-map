import { assertLabContext, assertNonEmptyString, deepFreeze, result } from '../l0/shared-v1.mjs';

export const RED_001=deepFreeze({engine_id:'RED-001',version:'0.1.0',layer:'L2',capability:'SYNTHETIC_RED_TEAM_FOUNDATION',destructive_execution:false,prod_writes:false,additional_cost_eur:0});
const CATEGORIES=new Set(['PROMPT_INJECTION','TOOL_ABUSE','MALICIOUS_MEMORY','PERMISSION_BYPASS','DATA_LEAK','HOSTILE_FILE']);

export function evaluateAdversarialCase(input){
  const context=assertLabContext(input?.context);
  const case_id=assertNonEmptyString(input?.case_id,'case_id');
  const category=assertNonEmptyString(input?.category,'category').toUpperCase();
  if(!CATEGORIES.has(category))throw new TypeError('category is not supported');
  if(input?.synthetic!==true)throw new Error('RED-001 foundation accepts synthetic cases only');
  const expected_blocked=input?.expected_blocked===true,observed_blocked=input?.observed_blocked===true;
  const pass=expected_blocked===observed_blocked;
  return result('RED-001',{status:pass?'PASS':'FAIL',context,case_id,category,synthetic:true,expected_blocked,observed_blocked,destructive_execution:false,prod_write:false});
}
