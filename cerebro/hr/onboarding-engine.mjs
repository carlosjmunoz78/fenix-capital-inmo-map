export function assessOnboarding(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],checklist={}}=input;
  if(!context.company_id||context.engine_id!=='HR-003'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const required=['identity_verified','accounts_planned','permissions_planned','training_complete','shadowing_complete'];
  const missing=required.filter(k=>checklist[k]!==true);
  if(checklist.requires_signature===true) return human('SIGNATURE_REQUIRED');
  if(checklist.requires_otp===true||checklist.requires_captcha===true) return human('POLICY_CONFLICT');
  const readiness=required.length-missing.length;
  return {status:missing.length?'ONBOARDING_INCOMPLETE':'ONBOARDING_READY',engine_id:'HR-003',company_id:context.company_id,missing,readiness_score:Number((readiness/required.length).toFixed(2)),account_creation_execute:false,permission_write:false,training_promotion:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
