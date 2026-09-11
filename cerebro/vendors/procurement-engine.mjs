export function planProcurement(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],need_ref='',candidates=[],budget_cents=0}=input;
  if(!context.company_id||context.engine_id!=='BUY-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!need_ref||!Array.isArray(candidates)||candidates.length===0) throw new Error('PROCUREMENT_INPUT_REQUIRED');
  const budget=Number(budget_cents); if(!Number.isInteger(budget)||budget<0) throw new Error('CENT_VALUES_REQUIRED');
  const ranked=candidates.map(c=>{const cost=Number(c.cost_cents),quality=Number(c.quality_score),risk=Number(c.risk_score); if(!Number.isInteger(cost)||cost<0||![quality,risk].every(v=>Number.isFinite(v)&&v>=0&&v<=100)) throw new Error('CANDIDATE_VALUES_REQUIRED'); return {...c,score:Number((quality*0.6+(100-risk)*0.4).toFixed(2)),within_budget:cost<=budget};}).filter(c=>c.within_budget).sort((a,b)=>b.score-a.score||a.cost_cents-b.cost_cents||String(a.vendor_ref).localeCompare(String(b.vendor_ref)));
  if(ranked.length===0) return human('MONEY_LIMIT');
  return {status:'PROCUREMENT_PLAN_READY',engine_id:'BUY-001',company_id:context.company_id,need_ref,selected_vendor_ref:ranked[0].vendor_ref,ranked,po_create:false,payment_execute:false,contract_write:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
