export function assessLegalCase(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],issues=[]}=input;
  if(!context.company_id||context.engine_id!=='LEG-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(issues)) throw new Error('ISSUES_REQUIRED');
  const normalized=issues.map((x,i)=>({id:x.id??String(i+1),type:String(x.type??'GENERAL'),severity:Number(x.severity??1),requires_signature:x.requires_signature===true,legal_interpretation:x.legal_interpretation===true}));
  if(normalized.some(x=>x.requires_signature)) return human('SIGNATURE_REQUIRED');
  if(normalized.some(x=>x.legal_interpretation||x.severity>=4)) return human('LEGAL_REQUIRED');
  return {status:'LEGAL_TRIAGE_READY',engine_id:'LEG-001',company_id:context.company_id,issues:normalized,next_action:normalized.length?'PREPARE_LEGAL_PACKET':'NO_LEGAL_BLOCKER',legal_decision:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:[...source_refs]};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
