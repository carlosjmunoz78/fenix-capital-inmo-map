import crypto from 'node:crypto';

const ENGINE_ID='TENANT-001';
const ENV='PREPROD';
const RESOURCE_CLASSES=Object.freeze(['data','knowledge','permissions','logs','jobs','storage','models','backups']);
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const text=(v,l,max=160)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);const s=v.trim();if(s.length>max)throw new Error(`${l} too long`);return s};
const company=v=>{const s=text(v,'company_id',64).toLowerCase();if(!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(s))throw new Error('company_id format rejected');return s};
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const safe=x=>Object.freeze({...x,engine_id:ENGINE_ID,environment:ENV,prod_authorized:false,prod_write_authorized:false,supabase_prod_write_authorized:false,trading_access:false,additional_cost_eur:0});

export function tenantNamespace({company_id,resource_class,resource_id='root'}){
  const c=company(company_id),r=text(resource_class,'resource_class',40).toLowerCase(),id=text(resource_id,'resource_id',220);
  if(!RESOURCE_CLASSES.includes(r))throw new Error('resource_class denied');
  const namespace=`company/${encodeURIComponent(c)}/${r}/${encodeURIComponent(id)}`;
  return safe({status:'NAMESPACE_READY_PREPROD',company_id:c,resource_class:r,resource_id:id,namespace,namespace_sha256:sha([c,r,id])});
}

export function authorizeTenantAccess({request_company_id,target_company_id,resource_class,resource_id='root',action='read'}){
  const request=company(request_company_id),target=company(target_company_id),act=text(action,'action',40).toLowerCase();
  if(request!==target)return safe({status:'HUMAN_REQUIRED',human_required:'POLICY_CONFLICT',allowed:false,reason:'CROSS_COMPANY_ACCESS_DENIED',request_company_id:request,target_company_id:target,action:act,resource_class:String(resource_class||'').toLowerCase()});
  const scope=tenantNamespace({company_id:target,resource_class,resource_id});
  return safe({status:'ALLOWED_PREPROD',human_required:null,allowed:true,request_company_id:request,target_company_id:target,action:act,resource_class:scope.resource_class,namespace:scope.namespace,namespace_sha256:scope.namespace_sha256});
}

export function validateTenantEnvelope(envelope={}){
  const required=['company_id','engine_id','environment','version','resource_class','resource_id'];
  const missing=required.filter(k=>typeof envelope[k]!=='string'||!envelope[k].trim());
  if(missing.length)return safe({status:'HUMAN_REQUIRED',human_required:'POLICY_CONFLICT',valid:false,reason:`MISSING_CONTEXT:${missing.join(',')}`});
  if(envelope.environment!==ENV)return safe({status:'HUMAN_REQUIRED',human_required:'HIGH_RISK',valid:false,reason:'PREPROD_ONLY'});
  const scope=tenantNamespace(envelope);
  if(envelope.namespace&&envelope.namespace!==scope.namespace)return safe({status:'HUMAN_REQUIRED',human_required:'SECURITY_INCIDENT',valid:false,reason:'NAMESPACE_MISMATCH',company_id:scope.company_id,resource_class:scope.resource_class});
  return safe({status:'GREEN',human_required:null,valid:true,company_id:scope.company_id,resource_class:scope.resource_class,namespace:scope.namespace,namespace_sha256:scope.namespace_sha256});
}

export function buildIsolationMatrix(company_id){
  const c=company(company_id);
  return safe({status:'GREEN',company_id:c,resource_classes:RESOURCE_CLASSES.map(resource_class=>tenantNamespace({company_id:c,resource_class,resource_id:'*'})),cross_company_access:'deny_by_default',database_boundary:'RLS_SERVICE_ROLE_PREPROD',abac_boundary:'COMPANY_ID_EQUALITY',namespace_boundary:'company/<company_id>/<resource_class>/<resource_id>'});
}

export function assertCanonicalHumanRequired(code){if(!HUMAN_REQUIRED.has(code))throw new Error('non-canonical HUMAN_REQUIRED');return code}
export const TENANT_001_CONTRACT=Object.freeze({schema_version:'1.0.0',engine_id:ENGINE_ID,layer:'L8',environment:ENV,version:'1.0.0',required_context:Object.freeze(['company_id','engine_id','environment','version']),resource_classes:RESOURCE_CLASSES,cross_company_access:'deny_by_default',database_boundary:'PostgreSQL_RLS_PREPROD',abac:'company_id_equality',namespace_strategy:'company/<company_id>/<resource_class>/<resource_id>',ai_required:false,prod_authorized:false,prod_write_authorized:false,supabase_prod_write_authorized:false,trading_access:false,additional_cost_target_eur:0});
