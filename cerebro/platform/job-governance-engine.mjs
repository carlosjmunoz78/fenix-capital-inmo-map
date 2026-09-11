export function assessJob(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],job={}}=input;
  if(!context.company_id||context.engine_id!=='JOB-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!source_refs.length) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!job.name||!Number.isInteger(job.timeout_seconds)||job.timeout_seconds<1||job.timeout_seconds>86400) throw new Error('INVALID_JOB');
  if(!Number.isInteger(job.max_retries)||job.max_retries<0||job.max_retries>10) throw new Error('INVALID_RETRIES');
  if(job.cost_limit_cents!=null&&job.estimated_cost_cents>job.cost_limit_cents) return human('MONEY_LIMIT');
  if(job.cross_company===true) return human('POLICY_CONFLICT');
  return {status:'JOB_PLAN_VALID',engine_id:'JOB-001',company_id:context.company_id,name:job.name,timeout_seconds:job.timeout_seconds,max_retries:job.max_retries,idempotency_required:true,dead_letter_required:true,execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:[...source_refs]};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
