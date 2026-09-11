export function assessNotarialReadiness(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],fein_ready=false,acta_ready=false,signature_required=true,payment_plan_ready=false,agenda_ready=false,parties_confirmed=false}=input;
  if (!context.company_id || context.engine_id!=='NOT-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  const checks={fein_ready,acta_ready,payment_plan_ready,agenda_ready,parties_confirmed};
  const completed=Object.values(checks).filter(Boolean).length;
  const readiness_score=Math.round(completed/Object.keys(checks).length*100);
  const missing=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k.toUpperCase());
  if (signature_required && readiness_score===100) return {status:'HUMAN_REQUIRED',reason:'SIGNATURE_REQUIRED',engine_id:'NOT-001',company_id:context.company_id,readiness_score,missing,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
  return {status:readiness_score===100?'NOTARIAL_READY':'NOTARIAL_PREPARATION_REQUIRED',engine_id:'NOT-001',company_id:context.company_id,readiness_score,missing,next_action:missing[0]??'AWAIT_HUMAN_SIGNATURE',read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
