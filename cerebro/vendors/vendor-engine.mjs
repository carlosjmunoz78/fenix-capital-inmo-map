export function assessVendor(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],vendor_ref='',sla_score=0,quality_score=0,cost_score=0,risk_score=0}=input;
  if(!context.company_id||context.engine_id!=='VEN-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!vendor_ref) throw new Error('VENDOR_REQUIRED');
  const vals=[sla_score,quality_score,cost_score,risk_score].map(Number); if(!vals.every(v=>Number.isFinite(v)&&v>=0&&v<=100)) throw new Error('SCORE_RANGE');
  const score=0.3*vals[0]+0.3*vals[1]+0.2*vals[2]+0.2*(100-vals[3]);
  return {status:'VENDOR_ASSESSED',engine_id:'VEN-001',company_id:context.company_id,vendor_ref,score:Number(score.toFixed(2)),approved_for_consideration:score>=70,risk_score:vals[3],vendor_write:false,contract_write:false,payment_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
