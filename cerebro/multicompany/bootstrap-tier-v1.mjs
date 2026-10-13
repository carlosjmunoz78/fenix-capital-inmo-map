import {createHash} from 'node:crypto';

export const BOOTSTRAP_TIER_ENGINE_IDS=Object.freeze(['KBOOT-001','SEOBOOT-001','SOCBOOT-001']);
export const BOOTSTRAP_TIER_ENVIRONMENT='PREPROD';
export const BOOTSTRAP_TIER_VERSION='1.0.0';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const SECRET_KEYS=['token','secret','password','api_key','apikey','authorization','credential','private_key'];

function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value),'utf8').digest('hex');}
function norm(value){return String(value??'').trim().replace(/\s+/g,' ');}
function normLower(value){return norm(value).toLowerCase();}
function uniq(values){return [...new Set((values||[]).map(norm).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
function assertBase({company_id,evidence_at,environment='PREPROD'}){
  if(!norm(company_id)) throw new Error('company_id required');
  if(!norm(evidence_at)) throw new Error('evidence_at required');
  if(environment!=='PREPROD') throw new Error('PREPROD_ONLY');
}
function rejectSecrets(value,path='root'){
  if(Array.isArray(value)){value.forEach((x,i)=>rejectSecrets(x,`${path}[${i}]`));return;}
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(SECRET_KEYS.some(s=>String(k).toLowerCase().includes(s))) throw new Error(`SECURITY_INCIDENT:${path}.${k}`);
      rejectSecrets(v,`${path}.${k}`);
    }
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
  const result={company_id,engine_id,environment:'PREPROD',version:BOOTSTRAP_TIER_VERSION,evidence_at,evidence_sha256,payload,human_required_code,read_only:true,remote_write:false,publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  result.result_sha256=sha256(result);
  return result;
}

export function bootstrapKnowledge({company_id,evidence_at,keyword_audit,website_audit,social_audit,local_audit,sources=[],rules=[],glossary=[],products=[],processes=[]}){
  assertBase({company_id,evidence_at});
  rejectSecrets({keyword_audit,website_audit,social_audit,local_audit,sources,rules,glossary,products,processes});
  for(const [result,id] of [[keyword_audit,'KW-001'],[website_audit,'WAUD-001'],[social_audit,'SOCAUD-001'],[local_audit,'LOCALP-001']]) assertUpstream(result,{company_id,engine_ids:[id]});
  const source_refs=uniq([
    ...sources,
    keyword_audit?.evidence_sha256,
    website_audit?.evidence_sha256,
    social_audit?.evidence_sha256,
    local_audit?.evidence_sha256
  ]);
  const sections={rules:uniq(rules),glossary:uniq(glossary),products:uniq(products),processes:uniq(processes)};
  const declared_item_count=Object.values(sections).reduce((n,x)=>n+x.length,0);
  const confidence_basis=source_refs.length>=4?'audited_sources_present':'insufficient_provenance';
  const payload={
    namespace_id:`${normLower(company_id)}:knowledge:v1`,
    source_refs,
    source_count:source_refs.length,
    sections,
    declared_item_count,
    provenance_required:true,
    source_of_truth_policy:'reference_not_duplicate',
    confidence_basis
  };
  return finalize('KBOOT-001',company_id,evidence_at,payload,source_refs.length>=4?null:'LOW_CONFIDENCE');
}

export function bootstrapSeo({company_id,evidence_at,keyword_audit,website_audit,local_audit=null,url_inventory=[],content_topics=[]}){
  assertBase({company_id,evidence_at});
  rejectSecrets({keyword_audit,website_audit,local_audit,url_inventory,content_topics});
  assertUpstream(keyword_audit,{company_id,engine_ids:['KW-001']});
  assertUpstream(website_audit,{company_id,engine_ids:['WAUD-001']});
  if(local_audit) assertUpstream(local_audit,{company_id,engine_ids:['LOCALP-001']});
  const keywords=(keyword_audit?.payload?.opportunities||[]).map(x=>norm(x?.keyword)).filter(Boolean);
  const urls=uniq(url_inventory);
  const topics=uniq(content_topics);
  const keyword_url_map=keywords.map((keyword,i)=>({keyword,url:urls.length?urls[i%urls.length]:null,state:urls.length?'mapped_to_declared_url':'URL_REQUIRED'}));
  const payload={
    keyword_url_map,
    keyword_count:keyword_url_map.length,
    declared_url_count:urls.length,
    technical_finding_count:Number(website_audit?.payload?.finding_count??0),
    local_evidence_included:Boolean(local_audit),
    content_topics:topics,
    content_topic_count:topics.length,
    publication_gate:'REQUIRED',
    publish_authorized:false,
    external_metrics_fabricated:false
  };
  const low=keyword_url_map.length===0;
  return finalize('SEOBOOT-001',company_id,evidence_at,payload,low?'LOW_CONFIDENCE':null);
}

export function bootstrapSocial({company_id,evidence_at,social_audit,brand_context={},business_context={},content_pillars=[],formats=[],cadence=[]}){
  assertBase({company_id,evidence_at});
  rejectSecrets({social_audit,brand_context,business_context,content_pillars,formats,cadence});
  assertUpstream(social_audit,{company_id,engine_ids:['SOCAUD-001']});
  if(brand_context?.company_id&&brand_context.company_id!==company_id) throw new Error('POLICY_CONFLICT:BRAND_SCOPE');
  if(business_context?.company_id&&business_context.company_id!==company_id) throw new Error('POLICY_CONFLICT:BUSINESS_SCOPE');
  const profile_count=Number(social_audit?.payload?.profile_count??0);
  const payload={
    profile_count,
    content_pillars:uniq(content_pillars),
    formats:uniq(formats),
    cadence:uniq(cadence),
    tone_ref:brand_context?.tone_ref?norm(brand_context.tone_ref):null,
    audience_ref:business_context?.audience_ref?norm(business_context.audience_ref):null,
    planning_only:true,
    publication_gate:'REQUIRED',
    publish_authorized:false,
    metric_policy:'observed_public_evidence_only'
  };
  return finalize('SOCBOOT-001',company_id,evidence_at,payload,profile_count>0?null:'LOW_CONFIDENCE');
}

export function persistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||!BOOTSTRAP_TIER_ENGINE_IDS.includes(result.engine_id)||result.environment!=='PREPROD'||result.read_only!==true) throw new Error('invalid bootstrap tier result');
  const payload=result.payload||{};
  const item_count=result.engine_id==='KBOOT-001'?payload.declared_item_count:result.engine_id==='SEOBOOT-001'?payload.keyword_count:(payload.content_pillars?.length||0)+(payload.formats?.length||0)+(payload.cadence?.length||0);
  const source_count=result.engine_id==='KBOOT-001'?payload.source_count:result.engine_id==='SEOBOOT-001'?2+(payload.local_evidence_included?1:0):payload.profile_count;
  return {company_id:result.company_id,engine_id:result.engine_id,version:result.version,evidence_at:result.evidence_at,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,item_count:Number(item_count??0),source_count:Number(source_count??0),human_required_code:result.human_required_code,idempotency_key:norm(idempotency_key),recorded_by:norm(recorded_by),publish_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
