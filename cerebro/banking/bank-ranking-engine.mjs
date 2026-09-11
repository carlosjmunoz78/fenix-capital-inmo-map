export function rankBanks(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],banks=[]}=input;
  if (!context.company_id || context.engine_id!=='BNK-002' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs) || source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence < 0.8) return human('LOW_CONFIDENCE');
  const normalized=banks.map((b,i)=>{
    const approval=clamp(b.approval_probability,0,1);
    const totalCost=Math.max(0,Number(b.total_cost_eur??0));
    const speed=Math.max(0,Number(b.expected_days??999));
    const profile=clamp(b.profile_fit,0,1);
    const experience=clamp(b.experience_score,0,1);
    const costScore=1/(1+totalCost/10000);
    const speedScore=1/(1+speed/30);
    const score=Math.round((approval*.35+costScore*.25+speedScore*.15+profile*.15+experience*.10)*10000)/100;
    return {...b,rank_input_index:i,score,explanation:{approval, costScore:Number(costScore.toFixed(4)), speedScore:Number(speedScore.toFixed(4)), profile, experience}};
  }).sort((a,b)=>b.score-a.score || String(a.bank).localeCompare(String(b.bank)));
  return {status:'BANK_RANKING_READY',engine_id:'BNK-002',company_id:context.company_id,ranked_banks:normalized,read_only:true,plan_only:true,executed:false,prod_writes:false,source_of_truth_preserved:true,model_used:false,cost_additional_eur:0};
}
function clamp(v,min,max){const n=Number(v); if(Number.isNaN(n)) return min; return Math.max(min,Math.min(max,n));}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
