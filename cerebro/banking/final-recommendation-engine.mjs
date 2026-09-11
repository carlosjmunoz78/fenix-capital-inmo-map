export function recommendFinancialOption(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],ranked_banks=[],compared_offers=[],policy_flags=[]}=input;
  if (!context.company_id || context.engine_id!=='REC-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!Array.isArray(compared_offers)||compared_offers.length===0) throw new Error('COMPARED_OFFERS_REQUIRED');
  if (Array.isArray(policy_flags) && policy_flags.includes('DENY')) return human('POLICY_CONFLICT');
  const ranked=[...compared_offers].sort((a,b)=>Number(a.total_cost_eur)-Number(b.total_cost_eur) || Number(b.flexibility_score??0)-Number(a.flexibility_score??0));
  const primary=ranked[0]??null, planB=ranked[1]??null, planC=ranked[2]??null;
  const bankRankMap=new Map((ranked_banks||[]).map((b,i)=>[b.bank,{rank:i+1,score:b.score??null}]));
  const explanation={primary_reason:'LOWEST_NORMALIZED_TOTAL_COST_WITH_POLICY_PASS',bank_rank:primary?bankRankMap.get(primary.bank)??null:null,confidence:Number(confidence),trace_refs:[...source_refs]};
  return {status:'FINAL_RECOMMENDATION_READY',engine_id:'REC-001',company_id:context.company_id,recommendation:primary,plan_b:planB,plan_c:planC,explanation,confidence:Number(confidence),traceability:{source_refs:[...source_refs],policy_flags:[...policy_flags]},read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
