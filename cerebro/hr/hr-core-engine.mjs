const SENSITIVE=new Set(['HIRING_DECISION','TERMINATION','DISCIPLINARY_ACTION','COMPENSATION_CHANGE','LEGAL_EMPLOYMENT_DECISION']);
const STAGES=['RECRUITING','ONBOARDING','SKILLS','PERFORMANCE','WORKFORCE','OFFBOARDING','TRANSFER'];
export function assessHrLifecycle(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],employee_ref='',stage='',requested_action='',facts={}}=input;
  if(!context.company_id||context.engine_id!=='HR-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!STAGES.includes(stage)) throw new Error('INVALID_HR_STAGE');
  if(SENSITIVE.has(requested_action)) return human('HIGH_RISK');
  const engine_map={RECRUITING:'HR-002',ONBOARDING:'HR-003',SKILLS:'HR-004',PERFORMANCE:'HR-005',WORKFORCE:'HR-006',OFFBOARDING:'HR-001',TRANSFER:'HR-001'};
  const missing=[];
  if(!employee_ref&&stage!=='RECRUITING') missing.push('employee_ref');
  if(!facts||typeof facts!=='object') missing.push('facts');
  return {status:missing.length?'HR_CORE_INCOMPLETE':'HR_CORE_READY',engine_id:'HR-001',company_id:context.company_id,stage,delegate_engine_id:engine_map[stage],missing,requested_action:requested_action||null,sensitive_decision:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
