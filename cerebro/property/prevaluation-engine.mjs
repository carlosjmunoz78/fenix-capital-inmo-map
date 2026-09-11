export function estimatePrevaluation(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],area_sqm=0,comparables=[],observed_value_eur=null,max_deviation_pct=20}=input;
  if (!context.company_id || context.engine_id!=='TAS-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!(area_sqm>0) || !Array.isArray(comparables) || comparables.length<3) return human('LOW_CONFIDENCE');
  const ppsqm=comparables.map(c=>Number(c.price_eur)/Number(c.area_sqm)).filter(Number.isFinite).filter(v=>v>0).sort((a,b)=>a-b);
  if (ppsqm.length<3) return human('LOW_CONFIDENCE');
  const median=ppsqm[Math.floor(ppsqm.length/2)];
  const lower=percentile(ppsqm,.25), upper=percentile(ppsqm,.75);
  const estimate=median*area_sqm, intervalLow=lower*area_sqm, intervalHigh=upper*area_sqm;
  let deviationPct=null, status='PREVALUATION_READY';
  if (Number.isFinite(Number(observed_value_eur)) && Number(observed_value_eur)>0){ deviationPct=Math.abs(Number(observed_value_eur)-estimate)/estimate*100; if (deviationPct>Number(max_deviation_pct)) status='HUMAN_REQUIRED'; }
  return {status,reason:status==='HUMAN_REQUIRED'?'HIGH_RISK':null,engine_id:'TAS-001',company_id:context.company_id,estimate_eur:Number(estimate.toFixed(2)),interval_eur:{low:Number(intervalLow.toFixed(2)),high:Number(intervalHigh.toFixed(2))},median_eur_sqm:Number(median.toFixed(2)),comparable_count:ppsqm.length,deviation_pct:deviationPct===null?null:Number(deviationPct.toFixed(2)),max_deviation_pct:Number(max_deviation_pct),valuation_final:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function percentile(a,p){const i=Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)));return a[i];}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
