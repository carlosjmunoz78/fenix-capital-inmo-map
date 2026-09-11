export function planVendorReplacement(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],current_vendor={},alternatives=[]}=input;
  if(!context.company_id||context.engine_id!=='VREP-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!current_vendor.vendor_ref||!Array.isArray(alternatives)||alternatives.length===0) throw new Error('REPLACEMENT_INPUT_REQUIRED');
  const current=Number(current_vendor.score); if(!Number.isFinite(current)) throw new Error('CURRENT_SCORE_REQUIRED');
  const ranked=alternatives.map(a=>({vendor_ref:a.vendor_ref,score:Number(a.score),migration_risk:Number(a.migration_risk??0)})).filter(a=>Number.isFinite(a.score)&&Number.isFinite(a.migration_risk)).sort((a,b)=>b.score-a.score||a.migration_risk-b.migration_risk||String(a.vendor_ref).localeCompare(String(b.vendor_ref)));
  if(!ranked.length) throw new Error('ALTERNATIVES_REQUIRED');
  const best=ranked[0], replace=best.score>current && best.migration_risk<=50;
  return {status:'VENDOR_REPLACEMENT_ASSESSED',engine_id:'VREP-001',company_id:context.company_id,current_vendor_ref:current_vendor.vendor_ref,recommended_vendor_ref:replace?best.vendor_ref:null,replace_recommended:replace,ranked,vendor_switch_execute:false,contract_termination_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
