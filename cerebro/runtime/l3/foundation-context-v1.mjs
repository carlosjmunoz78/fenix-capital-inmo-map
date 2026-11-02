const ALLOWED_ENVIRONMENTS=new Set(['LAB','PREPROD']);
const HUMAN_CODES=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);

export function foundationContext(engineId,input={}){
  const company_id=String(input.company_id||'').trim();
  const environment=String(input.environment||'').trim().toUpperCase();
  const version=String(input.version||'0.1.0-foundation').trim();
  const principal_company_id=String(input.principal_company_id||company_id).trim();
  if(!company_id) throw new Error(`${engineId}: company_id required`);
  if(!ALLOWED_ENVIRONMENTS.has(environment)) throw new Error(`${engineId}: environment must be LAB or PREPROD`);
  if(principal_company_id!==company_id) throw new Error(`${engineId}: CROSS_COMPANY_DENIED`);
  return Object.freeze({company_id,engine_id:engineId,environment,version,project_id:input.project_id??null,identity_id:input.identity_id??null,account_id:input.account_id??null});
}

export function humanRequired(code,reason,context){
  if(!HUMAN_CODES.has(code)) throw new Error(`Unsupported HUMAN_REQUIRED code: ${code}`);
  return {status:'HUMAN_REQUIRED',human_required:true,human_required_code:code,reason,context};
}

export function foundationManifest({engine_id,name,wrapped_existing_paths=[]}){
  return Object.freeze({engine_id,name,layer:'L3',version:'0.1.0-foundation',environment:'LAB_PREPROD_ONLY',company_scope:'REQUIRED_DENY_CROSS_COMPANY',wrapped_existing_paths:[...wrapped_existing_paths],network_execution:false,prod_writes:false,trading_access:false,secret_values:false,additional_cost_eur:0,promotion_authorized:false});
}
