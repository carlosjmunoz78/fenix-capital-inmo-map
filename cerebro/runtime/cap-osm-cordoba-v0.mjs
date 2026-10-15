#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PersistentJobQueue } from './persistent-runtime.mjs';
import { runCapDiscoveryV0 } from './fact001-gap-capabilities-v0.mjs';

const PREPROD='PREPROD';
const ENDPOINTS=Object.freeze([
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter'
]);
const BBOX='37.79,-4.93,37.96,-4.65';
const USER_AGENT='CEREBRO-PREPROD-CAP/0.2 (company discovery; Fenix Capital)';
const SOCIAL_HOSTS=new Set(['facebook.com','instagram.com','linkedin.com','twitter.com','x.com','youtube.com','tiktok.com']);
const QUERY=`[out:json][timeout:10];(nwr["office"="estate_agent"](${BBOX});nwr["shop"="estate_agent"](${BBOX}););out tags;`;

function sha(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
function domainFromWebsite(value){if(typeof value!=='string'||!value.trim())return null;let raw=value.trim();if(!/^https?:\/\//i.test(raw))raw=`https://${raw}`;let u;try{u=new URL(raw);}catch{return null;}let host=u.hostname.toLowerCase().replace(/^www\./,'');if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host))return null;if(SOCIAL_HOSTS.has(host)||[...SOCIAL_HOSTS].some(x=>host.endsWith(`.${x}`)))return null;return host;}
function osmElementUrl(type,id){if(!['node','way','relation'].includes(type)||!Number.isSafeInteger(Number(id)))throw new Error('OSM element identity invalid');return `https://www.openstreetmap.org/${type}/${Number(id)}`;}

export function extractCompanyRecordsFromOverpassV0(payload,{observed_at='2026-10-15T00:00:00Z'}={}){
  if(!payload||typeof payload!=='object'||!Array.isArray(payload.elements))throw new TypeError('Overpass JSON elements required');
  const at=new Date(observed_at);if(Number.isNaN(at.valueOf()))throw new TypeError('observed_at invalid');
  const records=[];let missingDomain=0,missingName=0,socialOnly=0;
  for(const element of payload.elements){
    if(!element||typeof element!=='object')continue;
    const tags=element.tags&&typeof element.tags==='object'?element.tags:{};
    const name=typeof tags.name==='string'?tags.name.trim():'';
    if(!name){missingName++;continue;}
    const candidates=[tags.website,tags['contact:website'],tags.url].filter(x=>typeof x==='string'&&x.trim());
    const domains=candidates.map(domainFromWebsite).filter(Boolean);
    if(!domains.length){if(candidates.length)socialOnly++;else missingDomain++;continue;}
    const domain=[...new Set(domains)].sort()[0];
    records.push({company_name:name,domain,sector:'real_estate_agency',geography:'cordoba',employee_count:null,signals:['public_osm_estate_agent','website_present'],source_url:osmElementUrl(element.type,element.id),source_access:'PUBLIC',evidence_at:at.toISOString()});
  }
  records.sort((a,b)=>a.domain.localeCompare(b.domain)||a.company_name.localeCompare(b.company_name));
  return Object.freeze({records:Object.freeze(records),stats:Object.freeze({raw_elements:payload.elements.length,eligible_records:records.length,dropped_missing_domain:missingDomain,dropped_missing_name:missingName,dropped_social_only:socialOnly})});
}

async function fetchOne(endpoint,{observed_at,timeout_ms,max_bytes}){
  const url=`${endpoint}?data=${encodeURIComponent(QUERY)}`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout_ms);
  let response;try{response=await fetch(url,{method:'GET',redirect:'error',headers:{accept:'application/json','user-agent':USER_AGENT},signal:controller.signal});}finally{clearTimeout(timer);}
  if(response.status!==200)throw new Error(`HTTP_${response.status}`);
  const contentType=(response.headers.get('content-type')??'').toLowerCase();if(!contentType.includes('json'))throw new Error('CONTENT_TYPE_DENIED');
  const declared=Number(response.headers.get('content-length')??0);if(Number.isFinite(declared)&&declared>max_bytes)throw new Error('BODY_TOO_LARGE');
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>max_bytes)throw new Error('BODY_TOO_LARGE');
  let payload;try{payload=JSON.parse(bytes.toString('utf8'));}catch{throw new Error('JSON_INVALID');}
  const extracted=extractCompanyRecordsFromOverpassV0(payload,{observed_at});
  return Object.freeze({endpoint,query_sha256:sha(QUERY),body_sha256:sha(bytes),body_bytes:bytes.length,http_status:response.status,read_only:true,provider_writes:0,raw_body_persisted:false,...extracted});
}

export async function fetchOverpassCompanyRecordsV0({observed_at='2026-10-15T00:00:00Z',timeout_ms=12000,max_bytes=2_000_000}={}){
  if(!Number.isSafeInteger(timeout_ms)||timeout_ms<1000||timeout_ms>15000)throw new TypeError('timeout_ms invalid');
  if(!Number.isSafeInteger(max_bytes)||max_bytes<1||max_bytes>5_000_000)throw new TypeError('max_bytes invalid');
  const failures=[];
  for(const endpoint of ENDPOINTS){
    try{return await fetchOne(endpoint,{observed_at,timeout_ms,max_bytes});}
    catch(error){failures.push({endpoint,error_class:error?.name==='AbortError'?'TIMEOUT':String(error?.message??'ERROR').slice(0,80)});}
  }
  const err=new Error('OVERPASS_PUBLIC_ENDPOINTS_UNAVAILABLE');err.failures=failures;throw err;
}

export async function runCapOsmCordobaV0({observed_at='2026-10-15T00:00:00Z',workdir}={}){
  const at=new Date(observed_at);if(Number.isNaN(at.valueOf()))throw new TypeError('observed_at invalid');
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-cap-osm-'));
  const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try{
    const source=await fetchOverpassCompanyRecordsV0({observed_at:at.toISOString()});
    if(source.records.length<1)throw new Error('CAP OSM source returned zero eligible company-domain records');
    const context={company_id:'fenix',engine_id:'CAP-001',environment:PREPROD,version:'v0'};
    const payload={source_records:source.records,icp:{sectors:['real_estate_agency'],geographies:['cordoba'],signals:['public_osm_estate_agent']}};
    const semanticHash=sha(source.records.map(r=>({company_name:r.company_name,domain:r.domain,source_url:r.source_url})));
    const queuePath=path.join(root,'cap-osm-jobs.v8journal');
    const queue=new PersistentJobQueue({file_path:queuePath,environment:PREPROD});
    const enqueue=queue.enqueue({name:'CAP-001_OSM_CORDOBA_DISCOVERY',context,payload,idempotency_key:`cap-osm-cordoba:${semanticHash.slice(0,32)}`});
    if(!enqueue.accepted)throw new Error('CAP OSM job enqueue failed');
    const claim=queue.claimContext(context);if(!claim)throw new Error('CAP OSM job claim failed');
    const result=runCapDiscoveryV0({context,...claim.payload});
    const complete=queue.completeContext(claim.job_id,context,result);
    if(complete.status!=='SUCCEEDED'||result.company_count<1)throw new Error('CAP OSM discovery failed');
    if(result.personal_contacts_generated!==0||result.outreach_actions!==0||result.crm_writes!==0)throw new Error('CAP side-effect boundary violated');
    return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_CAP_OSM_CORDOBA_V0',company_id:'fenix',engine_id:'CAP-001',environment:PREPROD,status:'REAL_PUBLIC_COMPANY_DISCOVERY_GREEN',observed_at:at.toISOString(),source:{provider:'OpenStreetMap Overpass API',endpoint:source.endpoint,attribution:'© OpenStreetMap contributors, ODbL',query_sha256:source.query_sha256,body_sha256:source.body_sha256,body_bytes:source.body_bytes,http_status:source.http_status,read_only:true,provider_writes:0,raw_body_persisted:false},stats:source.stats,company_count:result.company_count,semantic_company_set_sha256:semanticHash,job_id:claim.job_id,job_status:complete.status,personal_contacts_generated:result.personal_contacts_generated,outreach_actions:result.outreach_actions,crm_writes:result.crm_writes,customer_data_used:false,personal_data_persisted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,next_gate:'THREE_SCHEDULED_REAL_CAP_RUNS_GREEN'});
  }finally{if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

export const CAP_OSM_CORDOBA_V0_CONTRACT=Object.freeze({environment:PREPROD,company_id:'fenix',engine_id:'CAP-001',source:'OPENSTREETMAP_OVERPASS_PUBLIC',method:'GET_ONLY',endpoint_strategy:'BOUNDED_FAILOVER_NO_REPEAT',endpoints:ENDPOINTS,cadence_hours:24,raw_body_persisted:false,personal_contacts_generated:false,outreach:false,crm_writes:false,prod_authorized:false,trading_access:false,additional_cost_eur:0});

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--out')out.out=argv[++i];else if(argv[i]==='--observed-at')out.observed_at=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runCapOsmCordobaV0(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);}).catch(error=>{process.stderr.write(JSON.stringify({status:'CAP_OSM_CORDOBA_RED',error_class:error?.message??'ERROR',endpoint_failures:Array.isArray(error?.failures)?error.failures:[],prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
