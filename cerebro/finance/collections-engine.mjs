export function assessCollection(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],invoice_ref='',due_date='',amount_cents=0,paid_cents=0,today=''}=input;
  if(!context.company_id||context.engine_id!=='COL-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!invoice_ref||!due_date||!today) throw new Error('COLLECTION_FIELDS_REQUIRED');
  const total=Number(amount_cents), paid=Number(paid_cents);
  if(!Number.isInteger(total)||!Number.isInteger(paid)||total<0||paid<0||paid>total) throw new Error('CENT_VALUES_REQUIRED');
  const outstanding=total-paid;
  const overdue=outstanding>0 && new Date(today)>new Date(due_date);
  const action=outstanding===0?'CLOSED':overdue?'PLAN_COLLECTION_FOLLOWUP':'WAIT_UNTIL_DUE';
  return {status:'COLLECTION_ASSESSED',engine_id:'COL-001',company_id:context.company_id,invoice_ref,outstanding_cents:outstanding,overdue,action,payment_write:false,communication_send:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
