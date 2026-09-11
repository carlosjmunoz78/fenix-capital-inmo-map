export function assessApi(input={}){
  const {context={},authorized=false,requires_prod_write=false,confidence=0,source_refs=[],api={}}=input;
  if(!context.company_id||context.engine_id!=='API-001'||!['LAB','PREPROD'].includes(context.environment)) throw new Error('UNSAFE_CONTEXT');
  if(!source_refs.length) throw new Error('EVIDENCE_REQUIRED');
  if(!authorized) return human('POLICY_CONFLICT');
  if(requires_prod_write) return human('HIGH_RISK');
  if(confidence<0.8) return human('LOW_CONFIDENCE');
  const methods=['GET','POST','PUT','PATCH','DELETE'];
  if(!api.name||!api.version||!api.path||!methods.includes(api.method)||!api.auth||!api.owner) throw new Error('INVALID_API_CONTRACT');
  if(api.cross_company===true) return human('POLICY_CONFLICT');
  if(api.exposes_raw_secret===true) return human('SECURITY_INCIDENT');
  if(api.rate_limit_required!==true) throw new Error('RATE_LIMIT_REQUIRED');
  return {status:'API_CONTRACT_VALID',engine_id:'API-001',company_id:context.company_id,name:api.name,version:api.version,path:api.path,method:api.method,auth:api.auth,owner:api.owner,rate_limit_required:true,invoke_execute:false,read_only:true,plan_only:true,executed:false,prod_writes:false,cost_additional_eur:0,source_refs:[...source_refs]};
}
function human(reason){return {status:'HUMAN_REQUIRED',reason,read_only:true,plan_only:true,executed:false,prod_writes:false};}
