export function prepareAccounting(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],entries=[]}=input;
  if(!context.company_id||context.engine_id!=='ACC-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const allowed=['REVENUE','EXPENSE','TAX','BANK','RECEIVABLE','PAYABLE'];
  const normalized=entries.map((e,i)=>{const amount=Number(e.amount_cents); if(!Number.isInteger(amount)) throw new Error('CENT_VALUES_REQUIRED'); if(!allowed.includes(e.category)) throw new Error('CATEGORY_NOT_ALLOWED'); return {line:i+1,category:e.category,amount_cents:amount,source_ref:e.source_ref||null};});
  const total=normalized.reduce((s,e)=>s+e.amount_cents,0);
  return {status:'ACCOUNTING_PACKAGE_READY',engine_id:'ACC-001',company_id:context.company_id,entries:normalized,total_cents:total,reconciled:normalized.every(e=>e.source_ref),accounting_export_execute:false,book_entry_write:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
