export function planNegotiation(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],bank='',benchmark={},current_offer={},approved_range={}}=input;
  if (!context.company_id || context.engine_id!=='BNK-006' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!bank) throw new Error('BANK_REQUIRED');
  const currentRate=Number(current_offer.rate_pct??NaN);
  const benchmarkRate=Number(benchmark.rate_pct??NaN);
  const minRate=Number(approved_range.min_rate_pct??NaN);
  const maxRate=Number(approved_range.max_rate_pct??NaN);
  if (![currentRate,benchmarkRate,minRate,maxRate].every(Number.isFinite)) throw new Error('NEGOTIATION_NUMBERS_REQUIRED');
  const target=Math.max(minRate,Math.min(maxRate,benchmarkRate));
  const withinApproved=target>=minRate && target<=maxRate;
  const improvement=Math.max(0,currentRate-target);
  const arguments=[];
  if (currentRate>benchmarkRate) arguments.push('BENCHMARK_GAP');
  if (improvement>0) arguments.push('RATE_IMPROVEMENT_AVAILABLE');
  if (arguments.length===0) arguments.push('MAINTAIN_CURRENT_TERMS');
  return {status:'BANK_NEGOTIATION_PLAN_READY',engine_id:'BNK-006',company_id:context.company_id,bank,current_rate_pct:currentRate,benchmark_rate_pct:benchmarkRate,target_rate_pct:Number(target.toFixed(3)),improvement_pct:Number(improvement.toFixed(3)),approved_range:{min_rate_pct:minRate,max_rate_pct:maxRate},within_approved_range:withinApproved,arguments,read_only:true,plan_only:true,executed:false,external_communication:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
