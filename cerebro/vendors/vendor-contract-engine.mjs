export function assessVendorContract(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],contract_ref='',clauses=[]}=input;
  if(!context.company_id||context.engine_id!=='VCON-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!contract_ref||!Array.isArray(clauses)) throw new Error('CONTRACT_INPUT_REQUIRED');
  const required=['SCOPE','SLA','PRICE','TERM','TERMINATION','DATA_PROTECTION'];
  const present=new Set(clauses.map(c=>c.type));
  const missing=required.filter(x=>!present.has(x));
  const risky=clauses.filter(c=>c.legal_review_required===true||Number(c.risk_score||0)>=70).map(c=>c.type);
  if(risky.length) return human('LEGAL_REQUIRED');
  return {status:missing.length?'CONTRACT_GAPS_FOUND':'CONTRACT_READY_FOR_HUMAN_REVIEW',engine_id:'VCON-001',company_id:context.company_id,contract_ref,missing_clauses:missing,signature_execute:false,contract_write:false,legal_decision:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
