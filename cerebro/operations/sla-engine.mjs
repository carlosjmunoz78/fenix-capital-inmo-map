export function evaluateSla(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],process='',third_party='',severity='NORMAL',opened_at=null,now=null,sla_hours=48}=input;
  if (!context.company_id || context.engine_id!=='SLA-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!process || !third_party || !opened_at || !now) throw new Error('SLA_INPUT_REQUIRED');
  const elapsed=(Date.parse(now)-Date.parse(opened_at))/3600000;
  if (!Number.isFinite(elapsed) || elapsed<0) throw new Error('INVALID_TIME_RANGE');
  const multiplier=severity==='CRITICAL'?0.25:severity==='HIGH'?0.5:severity==='LOW'?1.5:1;
  const effectiveSla=Number(sla_hours)*multiplier;
  const breached=elapsed>effectiveSla;
  const next_action=breached?(severity==='CRITICAL'?'ESCALATE_HUMAN':'TRIGGER_FOLLOWUP'):'WAIT';
  return {status:'SLA_EVALUATED',engine_id:'SLA-001',company_id:context.company_id,process,third_party,severity,elapsed_hours:Number(elapsed.toFixed(2)),effective_sla_hours:Number(effectiveSla.toFixed(2)),breached,next_action,human_required:breached&&severity==='CRITICAL',human_reason:breached&&severity==='CRITICAL'?'HIGH_RISK':null,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
