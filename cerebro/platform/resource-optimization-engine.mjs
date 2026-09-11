const TYPES=new Set(['CPU','MEMORY','STORAGE','API','AI','JOB','NETWORK']);
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
export function optimizeResources(input={}){
  const {context={},authorized=false,confidence=0,resources=[],requires_prod_write=false,additional_cost_eur=0}=input;
  if(!context.company_id||context.engine_id!=='OPT-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(Number(additional_cost_eur)>0) return human('MONEY_LIMIT');
  if(confidence<0.7) return human('LOW_CONFIDENCE');
  if(!Array.isArray(resources)||resources.length===0) throw new Error('RESOURCES_REQUIRED');
  const findings=resources.map((r,i)=>{
    if(!r||!TYPES.has(r.type)) throw new Error(`INVALID_RESOURCE_${i}`);
    const used=Number(r.used), capacity=Number(r.capacity), unit_cost=Number(r.unit_cost_eur||0);
    if(!Number.isFinite(used)||!Number.isFinite(capacity)||capacity<=0||used<0) throw new Error(`INVALID_METRICS_${i}`);
    const utilization=Math.min(1,used/capacity);
    const action=utilization<0.25?'DOWNSIZE_OR_CONSOLIDATE':utilization>0.9?'CAPACITY_REVIEW':'KEEP';
    return {type:r.type,utilization:Number(utilization.toFixed(4)),action,monthly_cost_eur:Number.isFinite(unit_cost)?unit_cost:0};
  });
  const savings=findings.filter(x=>x.action==='DOWNSIZE_OR_CONSOLIDATE').length;
  return {status:'OPTIMIZATION_PLAN',engine_id:'OPT-001',company_id:context.company_id,findings,savings_candidates:savings,additional_subscription_required:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
