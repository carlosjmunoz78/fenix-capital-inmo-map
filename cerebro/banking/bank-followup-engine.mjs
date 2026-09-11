export function planBankFollowup(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],bank='',contact_ref='',last_contact_at=null,sla_hours=48,preferred_channels=['email'],now='2026-09-11T12:00:00Z'}=input;
  if (!context.company_id || context.engine_id!=='BNK-005' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!bank || !contact_ref || !last_contact_at) throw new Error('FOLLOWUP_INPUT_REQUIRED');
  const elapsed=Math.max(0,(Date.parse(now)-Date.parse(last_contact_at))/3600000);
  const due=elapsed>=Number(sla_hours);
  const channel=preferred_channels.includes('email')?'email':preferred_channels[0]||'manual';
  return {status:'BANK_FOLLOWUP_PLAN_READY',engine_id:'BNK-005',company_id:context.company_id,bank,contact_ref,sla_hours:Number(sla_hours),elapsed_hours:Number(elapsed.toFixed(2)),due,channel,next_action:due?'PREPARE_FOLLOWUP':'WAIT_UNTIL_SLA',read_only:true,plan_only:true,executed:false,prod_writes:false,reminder_only:true,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
