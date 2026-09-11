export function assessEvent(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],event={}}=input;
  if(!context.company_id||context.engine_id!=='EVT-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!source_refs.length) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!event.name||!event.version||!event.producer||!Array.isArray(event.consumers)||!event.schema_ref) throw new Error('INVALID_EVENT_CONTRACT');
  if(event.company_id&&event.company_id!==context.company_id) return human('POLICY_CONFLICT');
  if(event.contains_secret===true) return human('SECURITY_INCIDENT');
  return {status:'EVENT_CONTRACT_VALID',engine_id:'EVT-001',company_id:context.company_id,event_name:event.name,version:event.version,consumers:[...event.consumers].sort(),schema_ref:event.schema_ref,delivery:'PLAN_ONLY',publish_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:[...source_refs]};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
