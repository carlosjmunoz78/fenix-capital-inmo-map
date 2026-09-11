export function reconcileClosingPayments(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],sale_price_cents=0,arras_cents=0,encumbrance_cents=0,payment_instruments_cents=[],fenix_fees_cents=0,other_adjustments_cents=0}=input;
  if (!context.company_id || context.engine_id!=='PAY-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  const vals=[sale_price_cents,arras_cents,encumbrance_cents,fenix_fees_cents,other_adjustments_cents,...payment_instruments_cents].map(Number);
  if (!vals.every(Number.isSafeInteger)) throw new Error('INTEGER_CENTS_REQUIRED');
  const due=Number(sale_price_cents)-Number(arras_cents)-Number(encumbrance_cents)+Number(fenix_fees_cents)+Number(other_adjustments_cents);
  const instruments=payment_instruments_cents.reduce((a,b)=>a+Number(b),0);
  const delta=instruments-due;
  return {status:delta===0?'PAYMENT_RECONCILED':'HUMAN_REQUIRED',reason:delta===0?null:'HIGH_RISK',engine_id:'PAY-001',company_id:context.company_id,due_cents:due,instruments_cents:instruments,delta_cents:delta,double_check:{arithmetic_match:delta===0,integer_cents:true},read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
