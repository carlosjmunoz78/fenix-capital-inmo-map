/**
 * CUT59 · Execute EXISTING Marketing / CRM bootstrap engines with synthetic inputs.
 * Actual runtime functions execute in-process. This is NOT client/CRM/App E2E,
 * not PROD, and never submits the persistence envelope to the database.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {bootstrapMarketing,bootstrapCrm,persistenceEnvelope} from '../../multicompany/marketing-crm-bootstrap-v1.mjs';

const digest=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const fakeUpstream=(engine_id,content)=>({
  company_id:'fenix',engine_id,environment:'PREPROD',version:'1.0.0',
  evidence_sha256:digest('CUT59_SYNTHETIC_ONLY:'+engine_id+':'+content),
  human_required_code:null,prod_authorized:false,prod_write_authorized:false,
  trading_access:false,additional_cost_eur:0,source:'SYNTHETIC_FIXTURE_NOT_HISTORICAL_PROOF'
});
const t='2026-11-07T15:00:00.000Z';
function verifyResult(r,id,envelope){
  const f=r.payload;
  if(r.engine_id!==id||r.company_id!=='fenix'||r.environment!=='PREPROD'||
   r.plan_only!==true||r.read_only!==true||r.remote_write!==false||
   r.prod_authorized!==false||r.prod_write_authorized!==false||
   r.trading_access!==false||r.crm_write_authorized!==false||
   r.spend_authorized!==false||r.publish_authorized!==false||
   r.additional_cost_eur!==0||r.human_required_code!==null||
   !/^[a-f0-9]{64}$/.test(r.evidence_sha256)||
   !/^[a-f0-9]{64}$/.test(r.result_sha256)||
   envelope.company_id!=='fenix'||envelope.engine_id!==id||
   envelope.prod_authorized!==false||envelope.prod_write_authorized!==false||
   envelope.crm_write_authorized!==false||envelope.spend_authorized!==false||
   envelope.publish_authorized!==false)
    throw Error('SYNTHETIC_RUNTIME_GOVERNANCE_FAILED:'+id);
  if(f.source_count!==(id==='MKTBOOT-001'?3:1))
    throw Error('SOURCE_COUNT_MISMATCH:'+id);
  if(envelope.evidence_sha256!==r.evidence_sha256||
    envelope.result_sha256!==r.result_sha256)
    throw Error('EVIDENCE_DIGEST_MISMATCH:'+id);
  if(typeof envelope.idempotency_key!=='string'||!envelope.idempotency_key.startsWith('cut59:synthetic:fenix:'))
    throw Error('IDEMPOTENCY_SCOPE_MISSING');
}
export function executeSyntheticCanary(){
 const k=fakeUpstream('KBOOT-001','synthetic-knowledge-demo');
 const seo=fakeUpstream('SEOBOOT-001','synthetic-seo-demo');
 const soc=fakeUpstream('SOCBOOT-001','synthetic-social-demo');
 const marketing=bootstrapMarketing({
  company_id:'fenix',evidence_at:t,
  knowledge_bootstrap:k,seo_bootstrap:seo,social_bootstrap:soc,
  segments:['persona_compradora_sintetica'],
  offers:['simulacion_hipotecaria_sin_datos_reales'],
  channels:['web_laboratorio','seo_laboratorio'],
  funnel_stages:['visita_sintetica','formulario_mock','lead_sintetico']
 });
 const crm=bootstrapCrm({
  company_id:'fenix',evidence_at:t,knowledge_bootstrap:k,
  pipeline_stages:['lead_sintetico','evaluacion_sintetica','seguimiento_mock'],
  required_fields:['estado','etapa','empresa'],
  automation_hooks:['on_mock_lead','on_mock_stage_change']
 });
 const outputs=[marketing,crm].map(r=>{
  const id=r.engine_id;
  const envelope=persistenceEnvelope(r,{
    idempotency_key:'cut59:synthetic:fenix:'+id+':v1',
    recorded_by:'jarvis-cut59-offline-ci'
  });
  verifyResult(r,id,envelope);
  return {
   engine_id:id,
   synthetic_data_only:true,
   evidence_sha256:r.evidence_sha256,
   result_sha256:r.result_sha256,
   input_source_count:r.payload.source_count,
   item_count:envelope.item_count,
   human_required_code:r.human_required_code,
   runtime_completed_in_process:true,
   backend_receipt_created:false,
   output_state:'LAB_SYNTHETIC_CODE_EXECUTED_NOT_PHYSICAL_PROD_PROOF'
  };
 });
 if(outputs.length!==2||new Set(outputs.map(x=>x.engine_id)).size!==2)
  throw Error('EXPECTED_EXACTLY_TWO_ENGINES');
 return Object.freeze({
  schema:'jarvis.cut59.existing.marketing.crm.synthetic.canary.v1',
  company_id:'fenix',engine_id:'JARVIS',environment:'LAB',
  version:'CUT59-SYNTHETIC-EXISTING-RUNTIME',
  synthetic_fixture_version:'v1',
  runtime_source_path:'cerebro/multicompany/marketing-crm-bootstrap-v1.mjs',
  execution_type:'REAL_EXISTING_JS_ENGINE_FUNCTIONS_SYNTHETIC_INPUTS',
  date_context:t,
  source_hashes_synthetic:true,
  source_historical_proofs_reused:false,
  runtime_success_count:outputs.length,
  outputs,
  actual_crm_read:false,actual_crm_write:false,
  actual_customer_data_used:false,
  actual_marketing_publication:false,actual_budget_spend:false,
  supabase_rpc_called:false,backend_receipt_created:false,
  live_production_integration_verified:false,
  stage_green_evidence:false,
  app_preprod_restored:false,
  independent_external_tribunal_passed:false,
  lrn_ingest_authorized:false,
  prod_write_authorized:false,production_ready:false
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=executeSyntheticCanary();
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({executed:report.runtime_success_count,mode:report.execution_type,
   crm_write:false,marketing_publish:false,rpc_called:false,stage_green_evidence:false}));
}
