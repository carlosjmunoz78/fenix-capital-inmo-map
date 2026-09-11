export function assessPerformance(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],metrics={}}=input;
  if(!context.company_id||context.engine_id!=='HR-005'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const errorRate=Math.max(0,Number(metrics.error_rate??0));
  const slaBreach=Math.max(0,Number(metrics.sla_breach_rate??0));
  const completion=Math.max(0,Math.min(1,Number(metrics.completion_rate??1)));
  const quality=Math.max(0,Math.min(1,Number(metrics.quality_score??1)));
  const score=Number(((1-Math.min(1,errorRate))*.3+(1-Math.min(1,slaBreach))*.2+completion*.25+quality*.25).toFixed(4));
  const interventions=[];
  if(errorRate>.1) interventions.push('MICROTRAINING_ERRORS');
  if(slaBreach>.1) interventions.push('COACHING_SLA');
  if(completion<.8) interventions.push('OBJECTIVE_COMPLETION');
  if(quality<.8) interventions.push('QUALITY_REVIEW');
  return {status:interventions.length?'COACHING_PLAN_REQUIRED':'PERFORMANCE_OK',engine_id:'HR-005',company_id:context.company_id,score,interventions,disciplinary_action:false,compensation_change:false,training_promotion:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
