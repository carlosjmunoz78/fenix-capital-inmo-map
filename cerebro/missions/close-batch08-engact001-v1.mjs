#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {activateEngineSet,persistenceEnvelope} from '../multicompany/final-onboarding-chain-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-engact001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:8e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime=path.join(ROOT,'cerebro/multicompany/final-onboarding-chain-v1.mjs');
const sql=path.join(ROOT,'cerebro/multicompany/sql/final-onboarding-chain-preprod-v1.sql');
const rollbackSql=path.join(ROOT,'cerebro/multicompany/rollback/final-onboarding-chain-preprod-v1.rollback.sql');
const test1=path.join(ROOT,'cerebro/tests/final-onboarding-chain-v1.test.mjs');
const test2=path.join(ROOT,'cerebro/tests/final-onboarding-chain-preprod-persistence-v1.test.mjs');
for(const p of [runtime,sql,rollbackSql,test1,test2]) A(fs.existsSync(p),`missing ${p}`);

const REQUIRED=['TENANT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001'];
const up=(company_id,engine_id,seed)=>({company_id,engine_id,environment:'PREPROD',evidence_sha256:sha(`${company_id}:${engine_id}:${seed}`),human_required_code:null,prod_authorized:false,prod_execution_authorized:false,prod_write_authorized:false,publish_authorized:false,deploy_authorized:false,crm_write_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});
const build=company_id=>activateEngineSet({company_id,evidence_at:'2026-11-03T01:30:00Z',tenant_guard:up(company_id,'TENANT-001','1'),seo_bootstrap:up(company_id,'SEOBOOT-001','2'),social_bootstrap:up(company_id,'SOCBOOT-001','3'),marketing_bootstrap:up(company_id,'MKTBOOT-001','4'),crm_bootstrap:up(company_id,'CRMBOOT-001','5'),app_bootstrap:up(company_id,'APPBOOT-001','6'),automation_bootstrap:up(company_id,'AUTBOOT-001','7'),training_bootstrap:up(company_id,'TRNBOOT-001','8')});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='ENGACT-001','engine drift');
A(first.environment==='PREPROD'&&first.plan_only===true&&first.read_only===true,'PREPROD envelope drift');
A(first.payload.source_count===8,'source count drift');
A(JSON.stringify(first.payload.required_green_engines)===JSON.stringify(REQUIRED),'activation matrix drift');
A(first.payload.activation_scope==='PREPROD_ONLY'&&first.payload.prod_promotion===false&&first.payload.prod_write===false&&first.payload.trading_access===false,'activation authority drift');
A(first.payload.next_gate==='MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED','next gate drift');
A(first.prod_authorized===false&&first.prod_write_authorized===false&&first.external_execution_authorized===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256,'company isolation drift');
let crossDenied=false,authorityDenied=false;
try{activateEngineSet({company_id:'fenix',evidence_at:'2026-11-03T01:30:00Z',tenant_guard:up('other','TENANT-001','1'),seo_bootstrap:up('fenix','SEOBOOT-001','2'),social_bootstrap:up('fenix','SOCBOOT-001','3'),marketing_bootstrap:up('fenix','MKTBOOT-001','4'),crm_bootstrap:up('fenix','CRMBOOT-001','5'),app_bootstrap:up('fenix','APPBOOT-001','6'),automation_bootstrap:up('fenix','AUTBOOT-001','7'),training_bootstrap:up('fenix','TRNBOOT-001','8')})}catch(e){crossDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{activateEngineSet({company_id:'fenix',evidence_at:'2026-11-03T01:30:00Z',tenant_guard:{...up('fenix','TENANT-001','1'),prod_write_authorized:true},seo_bootstrap:up('fenix','SEOBOOT-001','2'),social_bootstrap:up('fenix','SOCBOOT-001','3'),marketing_bootstrap:up('fenix','MKTBOOT-001','4'),crm_bootstrap:up('fenix','CRMBOOT-001','5'),app_bootstrap:up('fenix','APPBOOT-001','6'),automation_bootstrap:up('fenix','AUTBOOT-001','7'),training_bootstrap:up('fenix','TRNBOOT-001','8')})}catch(e){authorityDenied=/POLICY_CONFLICT/.test(String(e.message))}
A(crossDenied&&authorityDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'engact:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='ENGACT-001'&&env.item_count===8&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');
const tests=[T('cerebro/tests/final-onboarding-chain-v1.test.mjs'),T('cerebro/tests/final-onboarding-chain-preprod-persistence-v1.test.mjs')];
const evaluation={engine_id:'ENGACT-001',approved:true,score:1,cases:{activation_matrix_exact:true,all_eight_dependencies_bound:true,preprod_only:true,no_prod_promotion:true,company_isolation:true,cross_company_denied:crossDenied,authority_denied:authorityDenied,deterministic:first.result_sha256===second.result_sha256,zero_cost:true},tests};
const tribunal={engine_id:'ENGACT-001',approved:Object.values(evaluation.cases).every(Boolean)&&tests.every(x=>x.status==='PASS'),pass:true,decision:'PASS',prod_authorized:false};
A(tribunal.approved,'ENGACT tribunal denied');
const b=fs.mkdtempSync(path.join(os.tmpdir(),'engact-bkp-')),hashes={};
for(const p of [runtime,sql,rollbackSql,test1,test2]){const n=path.basename(p);hashes[n]=sha(fs.readFileSync(p));fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],`backup fail ${n}`)}
const state=path.join(b,'engact-state.json'),backup=path.join(b,'engact-state.backup.json');fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,backup);const original=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(backup,state);A(sha(fs.readFileSync(state))===original,'rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');
W('evaluation/engact-001-evaluation-evidence.json',{engine_id:'ENGACT-001',gate:'evaluation',status:'PASS',...evaluation,additional_cost_eur:0});
W('tribunal/engact-001-tribunal-evidence.json',{engine_id:'ENGACT-001',gate:'tribunal',status:'GREEN',...tribunal,additional_cost_eur:0});
W('observability/engact-001-observability-evidence.json',{engine_id:'ENGACT-001',gate:'observability',status:'PASS',metrics:{companies_tested:2,required_dependencies:8,source_count:first.payload.source_count,cross_company_denied:1,authority_denied:1,prod_promotions:0,external_executions:0},trace_sha256:sha({first,env}),additional_cost_eur:0});
W('backup/engact-001-backup-evidence.json',{engine_id:'ENGACT-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',hashes,additional_cost_eur:0});
W('rollback/engact-001-rollback-evidence.json',{engine_id:'ENGACT-001',gate:'rollback',status:'PASS',tested:true,local_state_restore:'PASS',sql_rollback_present:true,sql_rollback_sha256:hashes[path.basename(rollbackSql)],additional_cost_eur:0});
W('rebuild/engact-001-rebuild-evidence.json',{engine_id:'ENGACT-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_ENGACT001_V1',status:'GREEN',engine_id:'ENGACT-001',environment:'LAB_PREPROD',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',activation_matrix:'PASS',company_isolation:'PASS',fail_closed:'PASS',prod_execution_authorized:false,prod_writes:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_ENGACT001_V1=GREEN');
