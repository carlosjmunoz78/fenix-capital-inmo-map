export function compareOffers(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],principal_eur=0,term_months=0,offers=[]}=input;
  if (!context.company_id || context.engine_id!=='OFR-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  if (!(principal_eur>0) || !(term_months>0) || !Array.isArray(offers) || offers.length===0) throw new Error('OFFER_INPUT_REQUIRED');
  const normalized=offers.map(o=>{
    const tin=Number(o.tin_pct??0), tae=Number(o.tae_pct??0), fees=Number(o.fees_eur??0), insurance=Number(o.insurance_total_eur??0), bonusCost=Number(o.bonus_products_total_eur??0), flexibility=clamp(o.flexibility_score,0,1);
    const monthlyRate=tin/1200;
    const payment=monthlyRate===0?principal_eur/term_months:principal_eur*(monthlyRate*Math.pow(1+monthlyRate,term_months))/(Math.pow(1+monthlyRate,term_months)-1);
    const financingCost=Math.max(0,payment*term_months-principal_eur);
    const totalCost=financingCost+fees+insurance+bonusCost;
    return {...o,tin_pct:tin,tae_pct:tae,fees_eur:fees,insurance_total_eur:insurance,bonus_products_total_eur:bonusCost,flexibility_score:flexibility,monthly_payment_eur:Number(payment.toFixed(2)),financing_cost_eur:Number(financingCost.toFixed(2)),total_cost_eur:Number(totalCost.toFixed(2))};
  }).sort((a,b)=>a.total_cost_eur-b.total_cost_eur || b.flexibility_score-a.flexibility_score || a.tae_pct-b.tae_pct || String(a.bank).localeCompare(String(b.bank)));
  return {status:'OFFER_COMPARISON_READY',engine_id:'OFR-001',company_id:context.company_id,principal_eur:Number(principal_eur),term_months:Number(term_months),offers:normalized,best_offer_ref:normalized[0]?.offer_ref??null,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function clamp(v,min,max){const n=Number(v);if(Number.isNaN(n))return min;return Math.max(min,Math.min(max,n));}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
