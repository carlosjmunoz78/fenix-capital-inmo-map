const REQUIRED=['registry','contracts','dependency_map','runbook','changelog','backup','rebuild','autonomy_state'];
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
export function assessDocumentation(input={}){
  const {context={},authorized=false,confidence=0,artifacts={},requires_prod_write=false}=input;
  if(!context.company_id||context.engine_id!=='DOCS-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.75) return human('LOW_CONFIDENCE');
  if(!artifacts||typeof artifacts!=='object'||Array.isArray(artifacts)) throw new Error('ARTIFACTS_REQUIRED');
  const missing=REQUIRED.filter(k=>typeof artifacts[k]!=='string'||artifacts[k].trim()==='');
  const stale=Object.entries(artifacts).filter(([,v])=>v&&typeof v==='object'&&v.stale===true).map(([k])=>k);
  return {status:missing.length||stale.length?'DOCUMENTATION_GAPS':'DOCUMENTATION_COMPLETE',engine_id:'DOCS-001',company_id:context.company_id,required:[...REQUIRED],missing,stale,autowrite_execute:false,source_of_truth_preserved:true,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
