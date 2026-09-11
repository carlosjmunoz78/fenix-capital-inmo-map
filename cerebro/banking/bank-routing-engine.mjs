export function routeBank(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],denial_reason='',subsanable=false,attempts=0,max_attempts=3,next_bank_available=false}=input;
  if (!context.company_id || context.engine_id!=='BNK-003' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  const remaining=Math.max(0,Number(max_attempts)-Number(attempts));
  let action='STOP_AND_REVIEW';
  if (remaining>0 && subsanable) action='RETRY_SAME_BANK_AFTER_REMEDIATION';
  else if (remaining>0 && next_bank_available) action='ROUTE_NEXT_BANK';
  const human_required=remaining<=0;
  return {status:human_required?'HUMAN_REQUIRED':'BANK_ROUTE_READY',reason:human_required?'HIGH_RISK':null,engine_id:'BNK-003',company_id:context.company_id,denial_reason,subsanable:Boolean(subsanable),attempts:Number(attempts),max_attempts:Number(max_attempts),remaining_attempts:remaining,next_action:action,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
