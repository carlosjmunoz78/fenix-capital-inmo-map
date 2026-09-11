export function analyzeRegistryRecord(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],title_holders=[],mortgages=[],embargoes=[],encumbrances=[],cancellations_pending=[],registry_notes=[]}=input;
  if (!context.company_id || context.engine_id!=='REGP-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  const complex=embargoes.length>0 || encumbrances.length>1 || cancellations_pending.length>0 || registry_notes.some(n=>String(n.severity||'').toUpperCase()==='HIGH');
  const tasks=[];
  if (mortgages.length) tasks.push('VERIFY_MORTGAGE_STATUS');
  if (embargoes.length) tasks.push('LEGAL_REVIEW_EMBARGO');
  if (encumbrances.length) tasks.push('VERIFY_ENCUMBRANCES');
  if (cancellations_pending.length) tasks.push('FOLLOW_UP_CANCELLATIONS');
  if (!tasks.length) tasks.push('NO_REGISTRY_BLOCKER_DETECTED');
  return {status:complex?'HUMAN_REQUIRED':'REGISTRY_ANALYSIS_READY',reason:complex?'LEGAL_REQUIRED':null,engine_id:'REGP-001',company_id:context.company_id,title_holders:[...title_holders],mortgages:[...mortgages],embargoes:[...embargoes],encumbrances:[...encumbrances],cancellations_pending:[...cancellations_pending],tasks,legal_complexity:complex,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
