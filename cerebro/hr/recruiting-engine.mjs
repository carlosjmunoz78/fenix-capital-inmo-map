const PROTECTED_FIELDS=new Set(['age','sex','gender','race','ethnicity','religion','disability','marital_status','sexual_orientation','nationality']);
export function scoreCandidates(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],requirements=[],candidates=[]}=input;
  if(!context.company_id||context.engine_id!=='HR-002'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!Array.isArray(requirements)||requirements.length===0) throw new Error('REQUIREMENTS_REQUIRED');
  if(requirements.some(r=>PROTECTED_FIELDS.has(String(r.field)))) return human('POLICY_CONFLICT');
  const scored=(Array.isArray(candidates)?candidates:[]).map(c=>{
    const facts=c&&typeof c.facts==='object'?c.facts:{};
    const matches=requirements.reduce((sum,r)=>sum+(facts[r.field]===r.expected?Number(r.weight??1):0),0);
    const max=requirements.reduce((sum,r)=>sum+Number(r.weight??1),0)||1;
    return {candidate_id:String(c.id??''),score:Number((matches/max).toFixed(4)),evidence_ref:c.evidence_ref??null};
  }).sort((a,b)=>b.score-a.score||a.candidate_id.localeCompare(b.candidate_id));
  return {status:'RECRUITING_SHORTLIST_READY',engine_id:'HR-002',company_id:context.company_id,shortlist:scored,final_hiring_decision:false,human_approval_required:true,publication_execute:false,interview_execute:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
