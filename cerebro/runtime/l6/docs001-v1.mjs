import { assertNonEmptyString, deepFreeze, result } from '../l0/shared-v1.mjs';

export const DOCS_001=deepFreeze({engine_id:'DOCS-001',version:'0.1.0',layer:'L6',capability:'DOCUMENTATION_COMPLETENESS_FOUNDATION',write_execution:false,prod_writes:false,additional_cost_eur:0});
const REQUIRED=['engine_registry','contracts','dependency_map','runbook','changelog','backup','rebuild','autonomy_state'];

export function assessChangeDocumentation(input){
  const change_id=assertNonEmptyString(input?.change_id,'change_id');
  const provided=input?.provided && typeof input.provided==='object'&&!Array.isArray(input.provided)?input.provided:{};
  const missing=REQUIRED.filter(k=>provided[k]!==true);
  return result('DOCS-001',{change_id,status:missing.length?'INCOMPLETE':'GREEN',required:[...REQUIRED],missing,write_execution:false});
}
