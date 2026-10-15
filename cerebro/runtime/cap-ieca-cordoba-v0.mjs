#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PersistentJobQueue } from './persistent-runtime.mjs';
import { planLeadDiscovery, buildIcpDefinition, scoreCompanyAgainstIcp, dedupeLeadCandidates } from './lead-discovery-enrichment-profile-v1.mjs';

const PREPROD='PREPROD';
const ENDPOINT='https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/espacios_productivos/ows';
const ACTIVITY='Actividades Administrativas, Financieras y de Seguros';
const CORDOBA_CODE='14021';
const NAME_SIGNAL=/(inmob|inmobili|fincas|real\s*estate|property|properties|propiedad|servicios\s+inmobiliarios|gesti[oó]n\s+inmobiliaria)/i;
const MAX_BYTES=2_000_000;

function sha(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function text(value){return typeof value==='string'?value.trim():'';}
function refId(value){const s=String(value??'').trim();return /^\d+$/.test(s)?s:null;}
function context(){return {company_id:'fenix',engine_id:'CAP-001',environment:PREPROD,version:'v0'};}

export function extractIecaRealEstateCandidatesV0(payload,{evidence_at='2026-10-15T00:00:00Z'}={}){
  if(!payload||!Array.isArray(payload.features))throw new TypeError('IECA FeatureCollection required');
  const at=new Date(evidence_at);if(Number.isNaN(at.valueOf()))throw new TypeError('evidence_at invalid');
  const rows=[];
  for(const feature of payload.features){
    const p=feature?.properties;if(!p||typeof p!=='object')continue;
    if(text(p.codmun)!==CORDOBA_CODE||text(p.actividad)!==ACTIVITY)continue;
    const combined=`${text(p.nombre)} ${text(p.razon_soci)}`;
    if(!NAME_SIGNAL.test(combined))continue;
    const registryId=refId(p.id_directo);if(!registryId)continue;
    const companyName=text(p.nombre)||text(p.razon_soci);if(!companyName)continue;
    rows.push({
      company_name:companyName,
      location:'cordoba',
      sector:'real_estate_business_candidate',
      signals:['official_ieca_establishment','real_estate_name_match'],
      evidence_refs:[`ieca-espand:${registryId}`],
      registry_id:registryId,
      evidence_at:at.toISOString()
    });
  }
  const deduped=dedupeLeadCandidates(rows);
  return Object.freeze([...deduped].sort((a,b)=>String(a.registry_id).localeCompare(String(b.registry_id))));
}

async function fetchIecaCordobaV0(){
  const params=new URLSearchParams({
    service:'WFS',version:'2.0.0',request:'GetFeature',typeName:'espacios_productivos:directorio_establecimientos',outputFormat:'application/json',count:'1000',
    propertyName:'nombre,razon_soci,id_directo,actividad,codmun',
    cql_filter:`codmun='${CORDOBA_CODE}' AND actividad='${ACTIVITY}'`
  });
  const url=`${ENDPOINT}?${params.toString()}`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25_000);
  let response;try{response=await fetch(url,{method:'GET',redirect:'error',headers:{accept:'application/json','user-agent':'CEREBRO-PREPROD-CAP-IECA/0.1'},signal:controller.signal});}finally{clearTimeout(timer);}
  if(response.status!==200)throw new Error(`IECA_HTTP_${response.status}`);
  const ct=(response.headers.get('content-type')??'').toLowerCase();if(!ct.includes('json'))throw new Error(`IECA_CONTENT_TYPE_DENIED:${ct}`);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>MAX_BYTES)throw new Error('IECA_BODY_TOO_LARGE');
  let payload;try{payload=JSON.parse(bytes.toString('utf8'));}catch{throw new Error('IECA_JSON_INVALID');}
  if(!payload||!Array.isArray(payload.features))throw new Error('IECA_FEATURE_COLLECTION_REQUIRED');
  return Object.freeze({payload,http_status:response.status,content_type:ct,body_bytes:bytes.length,body_sha256:sha(bytes),feature_count:payload.features.length});
}

export async function runCapIecaCordobaV0({observed_at=new Date().toISOString(),workdir}={}){
  const at=new Date(observed_at);if(Number.isNaN(at.valueOf()))throw new TypeError('observed_at invalid');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-cap-ieca-'));
  const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try{
    const route=planLeadDiscovery({...context(),authorized_business_research:true,estimated_incremental_cost_eur:0,sources:{official_public_business_source:true},purpose:'B2B_REAL_ESTATE_COMPANY_DISCOVERY'});
    if(route.status!=='PLAN_READY'||route.selected_route!=='OFFICIAL_PUBLIC_BUSINESS_SOURCE')throw new Error('CAP official public business source route not authorized');
    const source=await fetchIecaCordobaV0();
    const candidates=extractIecaRealEstateCandidatesV0(source.payload,{evidence_at:at.toISOString()});
    if(candidates.length<1)throw new Error('CAP IECA returned zero deterministic real-estate candidates');

    const ctx=context();
    const queue=new PersistentJobQueue({file_path:path.join(root,'cap-ieca-jobs.v8journal'),environment:PREPROD});
    const semantic=sha(candidates.map(c=>({registry_id:c.registry_id,company_name:c.company_name,lead_key:c.lead_key})));
    const enqueue=queue.enqueue({name:'CAP-001_IECA_CORDOBA_DISCOVERY',context:ctx,payload:{candidates},idempotency_key:`cap-ieca-cordoba:${semantic.slice(0,32)}`});
    if(!enqueue.accepted)throw new Error('CAP IECA durable job enqueue failed');
    const claim=queue.claimContext(ctx);if(!claim)throw new Error('CAP IECA durable job claim failed');

    const definition=buildIcpDefinition({context:undefined,...ctx,criteria:{sectors:['real_estate_business_candidate'],locations:['cordoba'],required_signals:['official_ieca_establishment','real_estate_name_match']}});
    if(definition.status!=='ICP_DEFINED')throw new Error('CAP IECA ICP definition failed');
    const scored=claim.payload.candidates.map(candidate=>({candidate,score:scoreCompanyAgainstIcp({definition,candidate})}));
    if(scored.some(x=>x.score.status!=='SCORED'||x.score.score<80))throw new Error('CAP IECA candidate scoring failed');
    const result={candidate_count:scored.length,strong_match_count:scored.filter(x=>x.score.classification==='ICP_STRONG_MATCH').length,candidate_set_sha256:semantic,candidate_refs:scored.map(x=>({registry_id:x.candidate.registry_id,lead_key:x.candidate.lead_key,score:x.score.score,classification:x.score.classification}))};
    const complete=queue.completeContext(claim.job_id,ctx,result);if(complete.status!=='SUCCEEDED')throw new Error('CAP IECA durable job completion failed');

    return Object.freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_CAP_IECA_CORDOBA_V0',company_id:'fenix',engine_id:'CAP-001',environment:PREPROD,version:'v0',status:'REAL_OFFICIAL_COMPANY_DISCOVERY_GREEN',observed_at:at.toISOString(),
      source:{publisher:'Instituto de Estadística y Cartografía de Andalucía',dataset:'ESPAND directorio_establecimientos',license:'CC-BY-4.0',method:'GET_ONLY',endpoint:ENDPOINT,http_status:source.http_status,content_type:source.content_type,body_bytes:source.body_bytes,body_sha256:source.body_sha256,broad_feature_count:source.feature_count,provider_writes:0},
      route:{selected_route:route.selected_route,write_mode:'NONE'},
      job:{job_id:claim.job_id,status:complete.status,idempotency_key:`cap-ieca-cordoba:${semantic.slice(0,32)}`},
      result,
      personal_contacts_generated:0,outreach_actions:0,crm_writes:0,customer_data_used:false,personal_data_enriched:false,raw_source_body_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
      next_gate:'THREE_GENUINE_SCHEDULED_PREPROD_RUNS_GREEN'
    });
  } finally {if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--out')out.out=argv[++i];else if(argv[i]==='--observed-at')out.observed_at=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runCapIecaCordobaV0(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);}).catch(error=>{process.stderr.write(JSON.stringify({status:'CAP_IECA_CORDOBA_RED',error:String(error?.stack??error),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
