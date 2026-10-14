import {createHash} from 'node:crypto';
import {buildAppFactoryPlan} from '../digital-build/brand-commerce-appfactory-runtime-v0.mjs';

export const FINAL_ONBOARDING_ENGINE_IDS=Object.freeze(['APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001']);
export const FINAL_ONBOARDING_ENVIRONMENT='PREPROD';
export const FINAL_ONBOARDING_VERSION='1.0.0';
const HUMAN_REQUIRED=new Set(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const FORBIDDEN_KEYS=['token','secret','password','api_key','apikey','authorization','credential','private_key','email','phone','mobile','iban','dni','nif','raw_customer','raw_message','message_body'];

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
  if(value&&typeof value==='object') for(const [k,v] of Object.entries(value)){
    if(FORBIDDEN_KEYS.some(s=>String(k).toLowerCase().includes(s))) throw new Error(`SECURITY_INCIDENT:${path}.${k}`);
    rejectForbidden(v,`${path}.${k}`);
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
  const result={company_id,engine_id,environment:'PREPROD',version:FINAL_ONBOARDING_VERSION,evidence_at,evidence_sha256,payload,human_required_code,read_only:true,plan_only:true,external_execution_authorized:false,publish_authorized:false,deploy_authorized:false,crm_write_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
  result.result_sha256=sha256(result);
  return result;
}

export function bootstrapApp({company_id,evidence_at,knowledge_bootstrap,crm_bootstrap,app_slug='company-app',surface='PWA',brand_tokens_ref='brand:bootstrap',requirements_ref='requirements:bootstrap'}){
  assertBase({company_id,evidence_at});
  rejectForbidden({knowledge_bootstrap,crm_bootstrap,app_slug,surface,brand_tokens_ref,requirements_ref});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  assertUpstream(crm_bootstrap,{company_id,engine_ids:['CRMBOOT-001']});
  const appFactory=buildAppFactoryPlan({
    context:{company_id,engine_id:'FACT-001',capability_id:'BRAND-COMMERCE-APPFACTORY',environment:'PREPROD',version:'v0'},
    target_company_id:company_id,confidence:1,spend_cents:0,
    surface,app_slug,brand_tokens_ref,requirements_ref
  });
  if(!appFactory.allowed) throw new Error(`POLICY_CONFLICT:APP_FACTORY_${appFactory.code||'BLOCKED'}`);
  const source_refs=uniq([knowledge_bootstrap.evidence_sha256,crm_bootstrap.evidence_sha256,appFactory.plan_hash]);
  return finalize('APPBOOT-001',company_id,evidence_at,{source_refs,source_count:source_refs.length,wrapped_owner:'FACT-001',wrapped_capability:'BRAND-COMMERCE-APPFACTORY',surface:appFactory.plan.surface,app_slug:appFactory.plan.app_slug,artifact_count:appFactory.plan.artifacts.length,deploy:false,publish:false,prod_write:false},source_refs.length===3?null:'LOW_CONFIDENCE');
}

export function bootstrapAutomation({company_id,evidence_at,crm_bootstrap,app_bootstrap,event_types=[],job_types=[]}){
  assertBase({company_id,evidence_at}); rejectForbidden({crm_bootstrap,app_bootstrap,event_types,job_types});
  assertUpstream(crm_bootstrap,{company_id,engine_ids:['CRMBOOT-001']});
  assertUpstream(app_bootstrap,{company_id,engine_ids:['APPBOOT-001']});
  const source_refs=uniq([crm_bootstrap.evidence_sha256,app_bootstrap.evidence_sha256]);
  const payload={source_refs,source_count:source_refs.length,event_types:uniq(event_types),job_types:uniq(job_types),composed_engines:['EVT-001','JOB-001','AUTO-001'],dispatch_authorized:false,scheduler_mutation_authorized:false,external_execution_authorized:false};
  return finalize('AUTBOOT-001',company_id,evidence_at,payload,source_refs.length===2?null:'LOW_CONFIDENCE');
}

export function bootstrapTraining({company_id,evidence_at,knowledge_bootstrap,automation_bootstrap,learning_tracks=[],evaluation_hooks=[]}){
  assertBase({company_id,evidence_at}); rejectForbidden({knowledge_bootstrap,automation_bootstrap,learning_tracks,evaluation_hooks});
  assertUpstream(knowledge_bootstrap,{company_id,engine_ids:['KBOOT-001']});
  assertUpstream(automation_bootstrap,{company_id,engine_ids:['AUTBOOT-001']});
  const source_refs=uniq([knowledge_bootstrap.evidence_sha256,automation_bootstrap.evidence_sha256]);
  const payload={source_refs,source_count:source_refs.length,learning_tracks:uniq(learning_tracks),evaluation_hooks:uniq(evaluation_hooks),composed_engines:['TRN-001','LRN-001','EVA-001'],raw_training_data:false,automatic_prod_training:false,learning_candidate_only:true};
  return finalize('TRNBOOT-001',company_id,evidence_at,payload,source_refs.length===2?null:'LOW_CONFIDENCE');
}

export function activateEngineSet({company_id,evidence_at,tenant_guard,seo_bootstrap,social_bootstrap,marketing_bootstrap,crm_bootstrap,app_bootstrap,automation_bootstrap,training_bootstrap}){
  assertBase({company_id,evidence_at});
  rejectForbidden({tenant_guard,seo_bootstrap,social_bootstrap,marketing_bootstrap,crm_bootstrap,app_bootstrap,automation_bootstrap,training_bootstrap});
  for(const [result,id] of [[tenant_guard,'TENANT-001'],[seo_bootstrap,'SEOBOOT-001'],[social_bootstrap,'SOCBOOT-001'],[marketing_bootstrap,'MKTBOOT-001'],[crm_bootstrap,'CRMBOOT-001'],[app_bootstrap,'APPBOOT-001'],[automation_bootstrap,'AUTBOOT-001'],[training_bootstrap,'TRNBOOT-001']]) assertUpstream(result,{company_id,engine_ids:[id]});
  const source_refs=uniq([tenant_guard.evidence_sha256,seo_bootstrap.evidence_sha256,social_bootstrap.evidence_sha256,marketing_bootstrap.evidence_sha256,crm_bootstrap.evidence_sha256,app_bootstrap.evidence_sha256,automation_bootstrap.evidence_sha256,training_bootstrap.evidence_sha256]);
  const payload={source_refs,source_count:source_refs.length,required_green_engines:['TENANT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001'],activation_scope:'PREPROD_ONLY',prod_promotion:false,prod_write:false,trading_access:false,next_gate:'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED'};
  return finalize('ENGACT-001',company_id,evidence_at,payload,source_refs.length===8?null:'LOW_CONFIDENCE');
}

export function persistenceEnvelope(result,{idempotency_key,recorded_by}){
  if(!result||!FINAL_ONBOARDING_ENGINE_IDS.includes(result.engine_id)||result.environment!=='PREPROD'||result.read_only!==true||result.plan_only!==true) throw new Error('invalid final onboarding result');
  const payload=result.payload||{};
  const item_count=result.engine_id==='APPBOOT-001'?Number(payload.artifact_count||0):result.engine_id==='AUTBOOT-001'?(payload.event_types?.length||0)+(payload.job_types?.length||0):result.engine_id==='TRNBOOT-001'?(payload.learning_tracks?.length||0)+(payload.evaluation_hooks?.length||0):payload.required_green_engines?.length||0;
  return {company_id:result.company_id,engine_id:result.engine_id,version:result.version,evidence_at:result.evidence_at,evidence_sha256:result.evidence_sha256,result_sha256:result.result_sha256,item_count,source_count:Number(payload.source_count||0),human_required_code:result.human_required_code,idempotency_key:norm(idempotency_key),recorded_by:norm(recorded_by),publish_authorized:false,deploy_authorized:false,external_execution_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
}
