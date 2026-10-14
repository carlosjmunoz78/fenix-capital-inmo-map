import {createHash} from 'node:crypto';

export const MARKETING_CRM_BOOTSTRAP_ENGINE_IDS=Object.freeze(['MKTBOOT-001','CRMBOOT-001']);
export const MARKETING_CRM_BOOTSTRAP_ENVIRONMENT='PREPROD';
export const MARKETING_CRM_BOOTSTRAP_VERSION='1.0.0';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const FORBIDDEN_KEYS=['token','secret','password','api_key','apikey','authorization','credential','private_key','email','phone','mobile','iban','dni','nif','message_body','raw_message','customer_name'];

function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex');}
function norm(value){return String(value??'').trim().replace(/\s+/g,' ');}
function uniq(values){return [...new Set((values||[]).map(norm).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function assertBase({company_id,evidence_at,environment='PREPROD'}){
  if(!norm(company_id)) throw new Error('company_id required');
  if(!norm(evidence_at)) throw new Error('evidence_at required');
  if(environment!=='PREPROD') throw new Error('PREPROD_ONLY');
}
function rejectForbidden(value,path='root'){
  if(Array.isArray(value)){value.forEach((x,i)=>rejectForbidden(x,`${path}[${i}]`));return;}
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(FORBIDDEN_KEYS.some(s=>String(k).toLowerCase().includes(s))) throw new Error(`SECURITY_INCIDENT:${path}.${k}`);
      rejectForbidden(v,`${path}.${k}`);
    }
  }
}
function assertUpstream(result,{company_id,engine_ids}){
  if(!result||result.company_id!==company_id||!engine_ids.includes(result.engine_id)) throw new Error('POLICY_CONFLICT:UPSTREAM_SCOPE');
  if(result.environment!=='PREPROD'||result.prod_authorized===true||result.prod_write_authorized===true||result.trading_access===true||Number(result.additional_cost_eur||0)!==0) throw new Error('POLICY_CONFLICT:UPSTREAM_AUTHORITY');
  if(result.human_required_code) throw new Error(`LOW_CONFIDENCE:UPSTREAM_${result.engine_id}`);
}
function finalize(engine_id,company_id,evidence_at,payload,human_required_code=null){
  if(human_required_code!==null&&!HUMAN_REQUIRED.has(human_required_code)) throw new Error('invalid human_required_code');
  const evidence_sha256=sha256({company_id,engine_id,evidence_at,payload});
  const result={company_id,engine_id,environment:'PREPROD',version:MARKETING_CRM_BOOTSTRAP_VERSION,evidence_at,evidence_sha256,payload,human_required_code,read_only:true,plan_only:true,remote_write:false,publish_authorized:false,crm_write_authorized:false,spend_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  result.result_sha256=sha256(result);
  return result;
}

export function bootstrapMarketing({company_id,evidence_at,knowledge_bootstrap,seo_bootstrap,social_bootstrap,segments=[],offers=[],channels=[],funnel_stages=[]}){
  assertBase({company_id,evidence_at});
  rejectForbidden({knowledge_bootstrap,seo_bootstrap,social_bootstrap,segments,offers,channels,funnel_stages});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  assertUpstream(seo_bootstrap,{company_id,engine_ids:['SEOBOOT-001']});
  assertUpstream(social_bootstrap,{company_id,engine_ids:['SOCBOOT-001']});
  const source_refs=uniq([knowledge_bootstrap.evidence_sha256,seo_bootstrap.evidence_sha256,social_bootstrap.evidence_sha256]);
  const payload={
    source_refs,
    source_count:source_refs.length,
    segments:uniq(segments),
    offers:uniq(offers),
    channels:uniq(channels),
    funnel_stages:uniq(funnel_stages),
    campaign_execution:false,
    publishing:false,
    spend_authorized:false,
    metric_policy:'observed_evidence_only',
    orchestration_target:'MKT-001'
  };
  return finalize('MKTBOOT-001',company_id,evidence_at,payload,source_refs.length===3?null:'LOW_CONFIDENCE');
}

export function bootstrapCrm({company_id,evidence_at,knowledge_bootstrap,pipeline_stages=[],required_fields=[],automation_hooks=[]}){
  assertBase({company_id,evidence_at});
  rejectForbidden({knowledge_bootstrap,pipeline_stages,required_fields,automation_hooks});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  const source_refs=uniq([knowledge_bootstrap.evidence_sha256]);
  const payload={
    source_refs,
    source_count:source_refs.length,
    pipeline_stages:uniq(pipeline_stages),
    required_fields:uniq(required_fields),
    automation_hooks:uniq(automation_hooks),
    crm_write_authorized:false,
    import_authorized:false,
    customer_data_required:false,
    schema_policy:'reference_existing_crm_before_extension',
    orchestration_target:'CRM-001'
  };
  return finalize('CRMBOOT-001',company_id,evidence_at,payload,source_refs.length===1?null:'LOW_CONFIDENCE');
}

export function persistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||!MARKETING_CRM_BOOTSTRAP_ENGINE_IDS.includes(result.engine_id)||result.environment!=='PREPROD'||result.read_only!==true||result.plan_only!==true) throw new Error('invalid marketing/crm bootstrap result');
  const payload=result.payload||{};
  const item_count=result.engine_id==='MKTBOOT-001'?(payload.segments?.length||0)+(payload.offers?.length||0)+(payload.channels?.length||0)+(payload.funnel_stages?.length||0):(payload.pipeline_stages?.length||0)+(payload.required_fields?.length||0)+(payload.automation_hooks?.length||0);
  return {company_id:result.company_id,engine_id:result.engine_id,version:result.version,evidence_at:result.evidence_at,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,item_count:Number(item_count||0),source_count:Number(payload.source_count||0),human_required_code:result.human_required_code,idempotency_key:norm(idempotency_key),recorded_by:norm(recorded_by),publish_authorized:false,crm_write_authorized:false,spend_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
