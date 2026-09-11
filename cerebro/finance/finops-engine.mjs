export function assessCost(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],items=[],budget_cents=0}=input;
  if(!context.company_id||context.engine_id!=='FINOPS-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const allowed=['ENGINE','TASK','API','AI','STORAGE','JOB'];
  let total=0;
  const normalized=items.map((i,idx)=>{if(!allowed.includes(i.type)) throw new Error('COST_TYPE_NOT_ALLOWED'); const c=Number(i.cost_cents); if(!Number.isInteger(c)||c<0) throw new Error('CENT_VALUES_REQUIRED'); total+=c; return {line:idx+1,type:i.type,cost_cents:c,ref:i.ref||null};});
  const budget=Number(budget_cents); if(!Number.isInteger(budget)||budget<0) throw new Error('CENT_VALUES_REQUIRED');
  if(total>budget) return human('MONEY_LIMIT');
  return {status:'COST_WITHIN_BUDGET',engine_id:'FINOPS-001',company_id:context.company_id,total_cost_cents:total,budget_cents:budget,remaining_cents:budget-total,items:normalized,additional_subscription_required:false,read_only:true,plan_only:true,executed:false,prod_writes:false};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
