export function assessPropertyRisk(input={}) {
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],registry_issue=false,new_build=false,inheritance=false,encumbrances=false,cadastral_mismatch=false,occupancy_issue=false,legal_complexity=false}=input;
  if (!context.company_id || context.engine_id!=='PROP-001' || !['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if (!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if (!authorized) return human('POLICY_CONFLICT');
  if (requires_prod_write) return human('HIGH_RISK');
  if (confidence<0.8) return human('LOW_CONFIDENCE');
  const weights={registry_issue:25,new_build:10,inheritance:20,encumbrances:25,cadastral_mismatch:15,occupancy_issue:20,legal_complexity:30};
  const flags={registry_issue,new_build,inheritance,encumbrances,cadastral_mismatch,occupancy_issue,legal_complexity};
  let score=0; const findings=[];
  for(const [k,v] of Object.entries(flags)){if(v){score+=weights[k];findings.push(k.toUpperCase());}}
  score=Math.min(100,score);
  const legalEscalation=Boolean(registry_issue||inheritance||encumbrances||legal_complexity||score>=50);
  return {status:legalEscalation?'HUMAN_REQUIRED':'PROPERTY_RISK_READY',reason:legalEscalation?'LEGAL_REQUIRED':null,engine_id:'PROP-001',company_id:context.company_id,property_risk_score:score,financial_profile_score:null,findings,legal_escalation:legalEscalation,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
