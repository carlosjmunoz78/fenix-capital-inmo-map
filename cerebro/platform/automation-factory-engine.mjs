const TRIGGERS=new Set(['EVENT','SCHEDULE','CONDITION','MANUAL']);
const ACTIONS=new Set(['CALL_ENGINE','CREATE_TASK','WRITE_AUDIT','GENERATE_DOCUMENT','SEND_DRAFT']);
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
export function planAutomation(input={}){
  const {context={},authorized=false,confidence=0,trigger={},actions=[],requires_prod_write=false,requires_external_send=false,estimated_cost_eur=0}=input;
  if(!context.company_id||context.engine_id!=='AUTO-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(requires_external_send) return human('HIGH_RISK');
  if(Number(estimated_cost_eur)>0) return human('MONEY_LIMIT');
  if(confidence<0.75) return human('LOW_CONFIDENCE');
  if(!trigger||!TRIGGERS.has(trigger.type)) throw new Error('INVALID_TRIGGER');
  if(!Array.isArray(actions)||actions.length===0) throw new Error('ACTIONS_REQUIRED');
  const normalized=actions.map((a,i)=>{if(!a||!ACTIONS.has(a.type))throw new Error(`INVALID_ACTION_${i}`);return {type:a.type,target_engine_id:a.target_engine_id||null};});
  return {status:'AUTOMATION_PLAN',engine_id:'AUTO-001',company_id:context.company_id,trigger:{type:trigger.type},actions:normalized,qa_required:true,policy_gate_required:true,external_send:false,prod_writes:false,read_only:true,plan_only:true,executed:false,cost_additional_eur:0};
}
