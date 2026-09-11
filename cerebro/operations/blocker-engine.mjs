const TAXONOMY=new Set(['CLIENTE','BANCO','DOC','INMUEBLE','LEGAL','FISCAL','TECNICO','INTERNO']);
export function classifyBlocker(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],category='',owner='',severity=1,resolved=false}=input;
  if(!context.company_id||context.engine_id!=='BLK-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!Array.isArray(source_refs)||source_refs.length===0) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  if(!TAXONOMY.has(category)) throw new Error('INVALID_BLOCKER_CATEGORY');
  if(!owner) throw new Error('BLOCKER_OWNER_REQUIRED');
  const sev=Math.max(1,Math.min(5,Number(severity)||1));
  if((category==='LEGAL'||category==='FISCAL')&&sev>=4) return human('HIGH_RISK');
  return {status:resolved?'BLOCKER_RESOLVED':'BLOCKER_ACTIVE',engine_id:'BLK-001',company_id:context.company_id,category,owner,severity:sev,resolved:Boolean(resolved),next_action:resolved?'NONE':sev>=4?'ESCALATE':'TRACK',source_refs:[...source_refs],read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
