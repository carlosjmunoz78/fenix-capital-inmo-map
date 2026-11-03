#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {scanDigitalFootprint,scan001PersistenceEnvelope,Scan001Error} from '../multicompany/digital-footprint-scanner-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-scan001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime=path.join(ROOT,'cerebro/multicompany/digital-footprint-scanner-v1.mjs');
A(fs.existsSync(runtime),`missing ${runtime}`);
const runtimeSha=sha(fs.readFileSync(runtime));
const fixtureHtml=`<!doctype html><html><head><title>Fenix Fixture</title><meta property="og:url" content="https://example.com/"><meta name="generator" content="WordPress"></head><body><a href="/servicios">Servicios</a><a href="https://instagram.com/fenixfixture">Instagram</a><a href="https://external.example.org/ref">Ref</a><script src="/wp-content/a.js"></script></body></html>`;
const fixture=async url=>{
  if(url==='https://example.com/') return {url,status:200,headers:{server:'cloudflare','cf-ray':'fixture'},body:fixtureHtml};
  if(url==='https://example.com/robots.txt') return {url,status:200,headers:{},body:'User-agent: *\nAllow: /'};
  if(url==='https://example.com/sitemap.xml') return {url,status:200,headers:{},body:'<urlset><url><loc>https://example.com/</loc></url></urlset>'};
  throw new Error(`unexpected fixture URL ${url}`);
};
const build=(company_id='fenix')=>scanDigitalFootprint({company_id,domain:'example.com',evidence_at:'2026-11-03T03:30:00Z',fetcher:fixture,environment:'PREPROD'});
const first=await build('fenix');
const second=await build('fenix');
const other=await build('acme');
A(first.engine_id==='SCAN-001'&&first.version==='1.0.0','engine/version drift');
A(first.company_id==='fenix'&&first.environment==='PREPROD','company/environment drift');
A(first.read_only===true&&first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false,'authority drift');
A(first.external_cost_eur===0,'cost drift');
A(first.root.status===200&&first.root.title==='Fenix Fixture','root extraction drift');
A(first.indexation.robots.available===true&&first.indexation.sitemap.available===true,'indexation scan drift');
A(first.technologies.includes('wordpress')&&first.technologies.includes('cloudflare'),'technology scan drift');
A(Array.isArray(first.social_profiles.instagram)&&first.social_profiles.instagram.length===1,'social discovery drift');
A(first.internal_links.length===1&&first.external_links.length===2,'link classification drift');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256&&other.company_id==='acme','company isolation drift');
const env=scan001PersistenceEnvelope(first,{idempotency_key:'scan001:fenix:fixture:v1',recorded_by:'ci'});
A(env.company_id==='fenix'&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');
let prodDenied=false,missingEvidenceDenied=false,localDenied=false,badFetcherDenied=false;
try{await scanDigitalFootprint({company_id:'fenix',domain:'example.com',evidence_at:'x',fetcher:fixture,environment:'PROD'})}catch(e){prodDenied=e instanceof Scan001Error&&e.code==='SCAN_POLICY_DENY'}
try{await scanDigitalFootprint({company_id:'fenix',domain:'example.com',evidence_at:'',fetcher:fixture,environment:'PREPROD'})}catch(e){missingEvidenceDenied=e instanceof Scan001Error&&e.code==='SCAN_INVALID_INPUT'}
try{await scanDigitalFootprint({company_id:'fenix',domain:'localhost',evidence_at:'x',fetcher:fixture,environment:'PREPROD'})}catch(e){localDenied=e instanceof Scan001Error&&e.code==='SCAN_POLICY_DENY'}
try{await scanDigitalFootprint({company_id:'fenix',domain:'example.com',evidence_at:'x',fetcher:null,environment:'PREPROD'})}catch(e){badFetcherDenied=e instanceof Scan001Error&&e.code==='SCAN_INVALID_INPUT'}
A(prodDenied&&missingEvidenceDenied&&localDenied&&badFetcherDenied,'fail-closed drift');

const evaluationCases={runtime_physical:true,fixture_only_no_live_claim:true,root_extraction:true,indexation_scan:true,technology_scan:true,social_discovery:true,link_classification:true,company_isolation:true,prod_denied:prodDenied,missing_evidence_denied:missingEvidenceDenied,local_target_denied:localDenied,bad_fetcher_denied:badFetcherDenied,deterministic:first.result_sha256===second.result_sha256,zero_cost:first.external_cost_eur===0};
const evaluation={engine_id:'SCAN-001',approved:Object.values(evaluationCases).every(Boolean),score:Object.values(evaluationCases).every(Boolean)?1:0,cases:evaluationCases,runtime_sha256:runtimeSha};
const tribunal={engine_id:'SCAN-001',approved:evaluation.approved,pass:evaluation.approved,decision:evaluation.approved?'PASS':'DENY',basis:'physical PREPROD runtime + deterministic injected public-evidence fixture + fail-closed policy checks',prod_authorized:false};
A(tribunal.approved,'SCAN-001 tribunal denied');

const b=fs.mkdtempSync(path.join(os.tmpdir(),'scan001-bkp-'));
const runtimeBackup=path.join(b,path.basename(runtime));
fs.copyFileSync(runtime,runtimeBackup);
A(sha(fs.readFileSync(runtimeBackup))===runtimeSha,'runtime backup hash mismatch');
const state=path.join(b,'scan001-state.json'),stateBackup=path.join(b,'scan001-state.backup.json');
fs.writeFileSync(state,json({result:first,envelope:env}));
fs.copyFileSync(state,stateBackup);
const originalStateSha=sha(fs.readFileSync(state));
fs.writeFileSync(state,'{}\n');
fs.copyFileSync(stateBackup,state);
A(sha(fs.readFileSync(state))===originalStateSha,'local rollback restore failed');
const rebuilt=await build('fenix');
A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');

W('evaluation/scan-001-evaluation-evidence.json',{engine_id:'SCAN-001',gate:'evaluation',status:'PASS',environment:'LAB_PREPROD',...evaluation,additional_cost_eur:0});
W('tribunal/scan-001-tribunal-evidence.json',{engine_id:'SCAN-001',gate:'tribunal',status:'GREEN',environment:'LAB_PREPROD',...tribunal,additional_cost_eur:0});
W('observability/scan-001-observability-evidence.json',{engine_id:'SCAN-001',gate:'observability',status:'PASS',environment:'LAB_PREPROD',telemetry_scope:'LOCAL_DETERMINISTIC_FIXTURE_ONLY',live_network_telemetry_claimed:false,metrics:{companies_tested:2,root_status:first.root.status,technologies:first.technologies.length,social_networks:Object.keys(first.social_profiles).length,internal_links:first.internal_links.length,external_links:first.external_links.length,prod_denials:prodDenied?1:0,local_target_denials:localDenied?1:0,prod_writes:0,trading_touched:0},trace_sha256:sha({first,env}),additional_cost_eur:0});
W('backup/scan-001-backup-evidence.json',{engine_id:'SCAN-001',gate:'backup',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'runtime local copy',source_runtime_sha256:runtimeSha,backup_runtime_sha256:sha(fs.readFileSync(runtimeBackup)),restore:'PASS',additional_cost_eur:0});
W('rollback/scan-001-rollback-evidence.json',{engine_id:'SCAN-001',gate:'rollback',status:'PASS',environment:'LAB_PREPROD',tested:true,scope:'isolated local state only',prod_rollback_claimed:false,local_state_restore:'PASS',original_state_sha256:originalStateSha,restored_state_sha256:sha(fs.readFileSync(state)),additional_cost_eur:0});
W('rebuild/scan-001-rebuild-evidence.json',{engine_id:'SCAN-001',gate:'rebuild',status:'PASS',environment:'LAB_PREPROD',tested:true,deterministic:true,fixture_only:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_SCAN001_V1',status:'GREEN',engine_id:'SCAN-001',company_id:'fenix',environment:'LAB_PREPROD',version:'1.0.0',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',live_network_telemetry_claimed:false,prod_execution_authorized:false,prod_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_SCAN001_V1=GREEN');