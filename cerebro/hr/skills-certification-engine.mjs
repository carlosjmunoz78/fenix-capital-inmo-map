export function assessCertification(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],skills=[],required_skills=[],test_score=0,case_score=0,critical=false}=input;
  if(!context.company_id||context.engine_id!=='HR-004'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const have=new Set((Array.isArray(skills)?skills:[]).map(String));
  const missing=(Array.isArray(required_skills)?required_skills:[]).map(String).filter(s=>!have.has(s));
  const test=Math.max(0,Math.min(100,Number(test_score)||0));
  const cases=Math.max(0,Math.min(100,Number(case_score)||0));
  const score=Number((test*.5+cases*.5).toFixed(2));
  const eligible=missing.length===0&&score>=80;
  if(critical&&eligible) return human('HIGH_RISK');
  return {status:eligible?'CERTIFICATION_READY':'CERTIFICATION_NOT_READY',engine_id:'HR-004',company_id:context.company_id,missing_skills:missing,score,eligible,critical:Boolean(critical),automatic_certification:eligible&&!critical,training_promotion:false,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
