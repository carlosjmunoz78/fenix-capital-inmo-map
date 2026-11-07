/**
 * CUT60 · Execute existing MKTBOOT/CRMBOOT JS from historical receipt references.
 * Source is REAL Supabase receipt metadata (read-only 2026-11-07 snapshot),
 * not underlying source payload bytes, fresh operations, or production data.
 * Candidate output cannot be registered to a writer or used to promote an engine.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {bootstrapMarketing,bootstrapCrm,persistenceEnvelope} from '../../multicompany/marketing-crm-bootstrap-v1.mjs';

const UPSTREAM=Object.freeze({
  'KBOOT-001':{evidence_sha256:'dc77c3e13902178120cc1d5d7faff09e62e8966f18e4a2030489dbc3dc0df5f0',items:4,sources:4},
  'SEOBOOT-001':{evidence_sha256:'9b6a06d0fddea103a1b10204bf78e812fb7c69ab7daf82d4ac53a9060f5c072f',items:20,sources:3},
  'SOCBOOT-001':{evidence_sha256:'28e7eba677ddd837db7525ff13c6b5163da4cda701b8f733bbb429f493ae23a8',items:5,sources:2}
});
const date='2026-11-07T15:00:00.000Z';
const sha=b=>createHash('sha256').update(b).digest('hex');
const invalid=msg=>{throw Error('CUT60_UPSTREAM_FAIL_CLOSED:'+msg);};

export function validateHistoricalReceipts(snapshot){
  if(snapshot?.schema!=='cerebro.jarvis.cut60.bootstrap.upstream.receipts.snapshot.v1'||
     snapshot.company_id!=='fenix'||snapshot.source_project_ref!=='hnqlnvakzaywtafeiybt'||
     snapshot.environment!=='PREPROD'||snapshot.historical_data_at!=='2026-10-13'||
     snapshot.source_payload_bytes_verified!==false||snapshot.live_upstream_reexecution_verified!==false||
     snapshot.official_green_promotion_authorized!==false||snapshot.prod_authorized!==false)
    invalid('INVALID_HISTORY_AND_AUTHORITY_SCOPE');
  if(!Array.isArray(snapshot.receipts)||snapshot.receipts.length!==3)invalid('BAD_RECEIPT_COUNT');
  const seen=new Set(), refs={};
  for(const r of snapshot.receipts){
    const expected=UPSTREAM[r?.engine_id];
    if(!expected||seen.has(r.engine_id))invalid('UNEXPECTED_OR_DUPLICATE_ENGINE');
    seen.add(r.engine_id);
    if(r.company_id!=='fenix'||r.environment!=='PREPROD'||r.version!=='1.0.0'||
       r.state!=='GREEN'||r.evidence_sha256!==expected.evidence_sha256||
       r.engine_evidence!==expected.evidence_sha256||
       !/^[a-f0-9]{64}$/.test(r.result_sha256)||r.item_count!==expected.items||
       r.source_count!==expected.sources||r.human_required_code!==null||r.read_only!==true||
       r.prod_authorized!==false||r.prod_write_authorized!==false||r.trading_access!==false||
       r.cost!=='0.00'||typeof r.bootstrap_idempotency_key!=='string'||
       !r.bootstrap_idempotency_key.startsWith('bootstrap:fenix:'+r.engine_id+':20261013')||
       !String(r.evidence_at).startsWith('2026-10-13 '))
      invalid('RECEIPT_MISMATCH');
    refs[r.engine_id]={
      company_id:'fenix',engine_id:r.engine_id,environment:'PREPROD',
      version:r.version,evidence_sha256:r.evidence_sha256,
      human_required_code:null,prod_authorized:false,prod_write_authorized:false,
      trading_access:false,additional_cost_eur:0
    };
  }
  if(Object.keys(refs).length!==3)invalid('MISSING_UPSTREAM_ENGINE');
  return Object.freeze(refs);
}
const safe=(r,e)=>{
 if(r.read_only!==true||r.plan_only!==true||r.prod_authorized!==false||
    r.prod_write_authorized!==false||r.remote_write!==false||r.trading_access!==false||
    r.spend_authorized!==false||r.publish_authorized!==false||r.crm_write_authorized!==false||
    r.human_required_code!==null||e.human_required_code!==null||
    e.evidence_sha256!==r.evidence_sha256||e.result_sha256!==r.result_sha256)
   invalid('ENGINE_GOVERNANCE_FAILED:'+r.engine_id);
};
export function runCut60HistoricalCanary(snapshot,sourceBytes){
 const upstream=validateHistoricalReceipts(snapshot);
 const marketing=bootstrapMarketing({
   company_id:'fenix',evidence_at:date,
   knowledge_bootstrap:upstream['KBOOT-001'],
   seo_bootstrap:upstream['SEOBOOT-001'],
   social_bootstrap:upstream['SOCBOOT-001'],
   segments:['inmueble_comprador_mock','hipoteca_interes_mock'],
   offers:['simulacion_informativa_sin_leads_reales'],
   channels:['seo_mock','redes_mock'],
   funnel_stages:['visita_mock','formulario_mock','seguimiento_mock']
 });
 const crm=bootstrapCrm({
   company_id:'fenix',evidence_at:date,knowledge_bootstrap:upstream['KBOOT-001'],
   pipeline_stages:['contacto_mock','calificacion_mock','seguimiento_mock'],
   required_fields:['etapa','origen','estado'],
   automation_hooks:['contacto_creado_mock','etapa_actualizada_mock']
 });
 if(marketing.payload.source_count!==3||crm.payload.source_count!==1)invalid('UPSTREAM_NOT_APPLIED');
 const declared=new Set(Object.values(upstream).map(x=>x.evidence_sha256));
 if(marketing.payload.source_refs.some(x=>!declared.has(x))||
    crm.payload.source_refs[0]!==upstream['KBOOT-001'].evidence_sha256)
   invalid('WRONG_SOURCE_LINEAGE');
 const rows=[marketing,crm].map(r=>{
  const e=persistenceEnvelope(r,{idempotency_key:'CUT60-REPORT-ONLY:'+r.engine_id,recorded_by:'jarvis-cut60-offline-code'});
  safe(r,e);
  return {
   engine_id:r.engine_id,source_refs:r.payload.source_refs,
   source_count:r.payload.source_count,item_count:e.item_count,
   evidence_sha256:r.evidence_sha256,result_sha256:r.result_sha256,
   in_process_existing_runtime_executed:true,
   source_kind:'ACTUAL_HISTORICAL_DB_RECEIPT_HASHES_NOT_PAYLOAD',
   output_kind:'SYNTHETIC_PLAN_ONLY',
   safe_to_send_to_record_preprod:false,
   official_green:true===false
  };
 });
 return {
  schema:'jarvis.cut60.historical.receipt.lineage.canary.v1',company_id:'fenix',
  engine_id:'JARVIS',environment:'LAB',version:'CUT60-v0.1',
  historical_upstream_receipt_bytes_sha256:sha(sourceBytes||Buffer.from(JSON.stringify(snapshot))),
  source_project_ref:snapshot.source_project_ref,
  target_project_ref:'cluhljgonannaafpmblx',
  historical_evidence_date:'2026-10-13',run_context_date:'2026-11-07',
  upstream_db_receipts_matched:3,actual_upstream_payloads_read:0,
  actual_upstream_runtime_reruns:0,actual_prod_mkt_crm_physical_runs:0,
  actual_crm_data_read:0,actual_crm_writes:0,actual_publications:0,
  actual_paid_calls:0,backend_record_rpc_calls:0,
  output_count:rows.length,outputs:rows,
  independent_tribunal_pass:false,writer_authorized:false,
  source_current_physical_proof:false,official_engine_state_changes:0,
  prod_authorized:false
 };
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==4)invalid('USAGE_INPUT_OUTPUT_REQUIRED');
 const input=fs.readFileSync(process.argv[2]);
 const report=runCut60HistoricalCanary(JSON.parse(input),input);
 fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({upstream_refs:3,executed:report.output_count,
   source_kind:'HISTORICAL_DB_RECEIPT_HASHES',
   actual_upstream_payload_verified:false,writer_authorized:false,prod_authorized:false}));
}
