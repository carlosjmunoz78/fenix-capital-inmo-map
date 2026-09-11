export function assessDataGovernance(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],datasets=[]}=input;
  if(!context.company_id||context.engine_id!=='DATA-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const allowed=['TRANSACTIONAL','ANALYTICS','LOGS','RESEARCH','TRAINING','BACKUP'];
  const findings=[];
  for(const d of datasets){
    if(!d.name||!allowed.includes(d.classification)) throw new Error('INVALID_DATASET');
    if(!d.owner||!d.system_of_record) findings.push({dataset:d.name,issue:'MISSING_OWNERSHIP'});
    if(d.cross_company===true) return human('POLICY_CONFLICT');
    if(d.contains_raw_secrets===true) return human('SECURITY_INCIDENT');
    if(d.retention_defined!==true) findings.push({dataset:d.name,issue:'RETENTION_UNDEFINED'});
  }
  return {status:findings.length?'REMEDIATION_REQUIRED':'GOVERNED',engine_id:'DATA-001',company_id:context.company_id,findings,source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
