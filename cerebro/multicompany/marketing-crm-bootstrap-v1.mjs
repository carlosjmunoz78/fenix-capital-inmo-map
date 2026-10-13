import {createHash} from 'node:crypto';

export const MARKETING_CRM_ENGINE_IDS=Object.freeze(['MKTBOOT-001','CRMBOOT-001']);
export const MARKETING_CRM_ENVIRONMENT='PREPROD';
export const MARKETING_CRM_VERSION='1.0.0';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const SECRET_KEYS=['token','secret','password','api_key','apikey','authorization','credential','private_key'];

function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex');}
function norm(value){return String(value??'').trim().replace(/\s+/g,' ');}
function uniq(values){return [...new Set((values||[]).map(norm).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function assertBase({company_id,evidence_at,environment='PREPROD'}){
  if(!norm(company_id)) throw new Error('company_id required');
  if(!norm(evidence_at)) throw new Error('evidence_at required');
  if(environment!=='PREPROD') throw new Error('PREPROD_ONLY');
}
function rejectSecrets(value,path='root'){
  if(Array.isArray(value)){value.forEach((x,i)=>rejectSecrets(x,`${path}[${i}]`));return;}
  if(value&&typeof value==='object') for(const [k,v] of Object.entries(value)){
    if(SECRET_KEYS.some(s=>String(k).toLowerCase().includes(s))) throw new Error(`SECURITY_INCIDENT:${path}.${k}`);
    rejectSecrets(v,`${path}.${k}`);
  }
}
function assertUpstream(result,{company_id,engine_ids}){
  if(!result||result.company_id!==company_id||!engine_ids.includes(result.engine_id)) throw new Error('POLICY_CONFLICT:UPSTREAM_SCOPE');
  if(result.environment!=='PREPROD'||result.prod_authorized===true||result.prod_write_authorized===true||result.trading_access===true) throw new Error('POLICY_CONFLICT:UPSTREAM_AUTHORITY');
  if(result.human_required_code) throw new Error(`LOW_CONFIDENCE:UPSTREAM_${result.engine_id}`);
}
function finalize(engine_id,company_id,evidence_at,payload,human_required_code=null){
  if(human_required_code!==null&&!HUMAN_REQUIRED.has(human_required_code)) throw new Error('invalid human_required_code');
  const evidence_sha256=sha256({company_id,engine_id,evidence_at,payload});
  const result={company_id,engine_id,environment:'PREPROD',version:MARKETING_CRM_VERSION,evidence_at,evidence_sha256,payload,human_required_code,read_only:true,remote_write:false,publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  result.result_sha256=sha256(result);
  return result;
}

export function bootstrapMarketing({company_id,evidence_at,knowledge_bootstrap,seo_bootstrap,social_bootstrap,objectives=[],channels=[],campaigns=[],budget_eur=0}){
  assertBase({company_id,evidence_at});
  rejectSecrets({knowledge_bootstrap,seo_bootstrap,social_bootstrap,objectives,channels,campaigns,budget_eur});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  assertUpstream(seo_bootstrap,{company_id,engine_ids:['SEOBOOT-001']});
  assertUpstream(social_bootstrap,{company_id,engine_ids:['SOCBOOT-001']});
  const budget=Number(budget_eur);
  if(!Number.isFinite(budget)||budget<0) throw new Error('invalid budget_eur');
  const payload={
    objectives:uniq(objectives),
    channels:uniq(channels),
    campaigns:uniq(campaigns),
    budget_eur:budget,
    execution_mode:'PLAN_ONLY',
    organic_first:true,
    paid_media_authorized:false,
    publication_gate:'REQUIRED',
    publish_authorized:false,
    source_refs:uniq([knowledge_bootstrap.evidence_sha256,seo_bootstrap.evidence_sha256,social_bootstrap.evidence_sha256])
  };
  const human=budget>0?'MONEY_LIMIT':(payload.objectives.length&&payload.channels.length?null:'LOW_CONFIDENCE');
  return finalize('MKTBOOT-001',company_id,evidence_at,payload,human);
}

export function bootstrapCrm({company_id,evidence_at,knowledge_bootstrap,existing_crm_ref=null,pipeline_stages=[],field_contracts=[],integration_refs=[]}){
  assertBase({company_id,evidence_at});
  rejectSecrets({knowledge_bootstrap,existing_crm_ref,pipeline_stages,field_contracts,integration_refs});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  const existingRef=norm(existing_crm_ref);
  const stages=uniq(pipeline_stages);
  const fields=uniq(field_contracts);
  const integrations=uniq(integration_refs);
  const mode=existingRef?'WRAP_EXISTING':'TEMPLATE_ONLY';
  const payload={
    mode,
    existing_crm_reference_present:Boolean(existingRef),
    existing_crm_ref_sha256:existingRef?sha256(existingRef):null,
    pipeline_stages:stages,
    field_contracts:fields,
    integration_refs:integrations,
    schema_write_authorized:false,
    customer_data_copy_authorized:false,
    destructive_migration_authorized:false,
    source_ref:knowledge_bootstrap.evidence_sha256,
    preservation_policy:'CONSERVAR_ENTENDER_ENVOLVER_PROBAR_MEJORAR_MIGRAR'
  };
  const human=existingRef||stages.length?null:'LOW_CONFIDENCE';
  return finalize('CRMBOOT-001',company_id,evidence_at,payload,human);
}

export function persistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||!MARKETING_CRM_ENGINE_IDS.includes(result.engine_id)||result.environment!=='PREPROD'||result.read_only!==true) throw new Error('invalid marketing/crm bootstrap result');
  const p=result.payload||{};
  const item_count=result.engine_id==='MKTBOOT-001'?(p.objectives?.length||0)+(p.channels?.length||0)+(p.campaigns?.length||0):(p.pipeline_stages?.length||0)+(p.field_contracts?.length||0)+(p.integration_refs?.length||0)+(p.existing_crm_reference_present?1:0);
  const source_count=result.engine_id==='MKTBOOT-001'?(p.source_refs?.length||0):(p.source_ref?1:0);
  return {company_id:result.company_id,engine_id:result.engine_id,version:result.version,evidence_at:result.evidence_at,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,item_count:Number(item_count),source_count:Number(source_count),human_required_code:result.human_required_code,idempotency_key:norm(idempotency_key),recorded_by:norm(recorded_by),publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
