export function assessDependency(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],dependency={}}=input;
  if(!context.company_id||context.engine_id!=='DEP-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!source_refs.length) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!dependency.from_engine||!dependency.to_engine||!dependency.type) throw new Error('INVALID_DEPENDENCY');
  if(dependency.from_engine===dependency.to_engine) throw new Error('SELF_DEPENDENCY');
  if(dependency.cross_company===true) return human('POLICY_CONFLICT');
  if(dependency.critical===true&&dependency.rollback_defined!==true) return human('HIGH_RISK');
  return {status:'DEPENDENCY_VALID',engine_id:'DEP-001',company_id:context.company_id,from_engine:dependency.from_engine,to_engine:dependency.to_engine,type:dependency.type,critical:dependency.critical===true,rollback_defined:dependency.rollback_defined===true,mutation:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:[...source_refs]};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
