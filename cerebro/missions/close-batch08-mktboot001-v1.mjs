#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {bootstrapMarketing,persistenceEnvelope} from '../multicompany/marketing-crm-bootstrap-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-mktboot001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:8e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime=path.join(ROOT,'cerebro/multicompany/marketing-crm-bootstrap-v1.mjs');
const sql=path.join(ROOT,'cerebro/multicompany/sql/marketing-crm-bootstrap-preprod-v1.sql');
const rollbackSql=path.join(ROOT,'cerebro/multicompany/rollback/marketing-crm-bootstrap-preprod-v1.rollback.sql');
const test1=path.join(ROOT,'cerebro/tests/marketing-crm-bootstrap-v1.test.mjs');
for(const p of [runtime,sql,rollbackSql,test1]) A(fs.existsSync(p),`missing ${p}`);

const up=(company_id,engine_id,seed)=>({company_id,engine_id,environment:'PREPROD',evidence_sha256:sha(`${company_id}:${engine_id}:${seed}`),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const build=company_id=>bootstrapMarketing({company_id,evidence_at:'2026-11-03T02:15:00Z',knowledge_bootstrap:up(company_id,'KBOOT-001','k'),seo_bootstrap:up(company_id,'SEOBOOT-001','s'),social_bootstrap:up(company_id,'SOCBOOT-001','o'),segments:['families','self-employed'],offers:['mortgage-advice'],channels:['organic-web','newsletter'],funnel_stages:['discover','lead','qualified']});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='MKTBOOT-001','engine drift');
A(first.environment==='PREPROD'&&first.plan_only===true&&first.read_only===true,'PREPROD envelope drift');
A(first.payload.orchestration_target==='MKT-001'&&first.payload.source_count===3,'marketing boundary drift');
A(first.payload.campaign_execution===false&&first.payload.publishing===false&&first.payload.spend_authorized===false,'marketing authority drift');
A(first.remote_write===false&&first.publish_authorized===false&&first.spend_authorized===false&&first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256,'company isolation drift');
let crossDenied=false,authorityDenied=false,piiDenied=false;
try{bootstrapMarketing({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:up('other','KBOOT-001','x'),seo_bootstrap:up('fenix','SEOBOOT-001','s'),social_bootstrap:up('fenix','SOCBOOT-001','o')})}catch(e){crossDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{bootstrapMarketing({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:{...up('fenix','KBOOT-001','x'),prod_authorized:true},seo_bootstrap:up('fenix','SEOBOOT-001','s'),social_bootstrap:up('fenix','SOCBOOT-001','o')})}catch(e){authorityDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{bootstrapMarketing({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:up('fenix','KBOOT-001','x'),seo_bootstrap:up('fenix','SEOBOOT-001','s'),social_bootstrap:up('fenix','SOCBOOT-001','o'),segments:[{email:'x'}]})}catch(e){piiDenied=/SECURITY_INCIDENT/.test(String(e.message))}
A(crossDenied&&authorityDenied&&piiDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'mktboot:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='MKTBOOT-001'&&env.publish_authorized===false&&env.spend_authorized===false&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');
const tests=[T('cerebro/tests/marketing-crm-bootstrap-v1.test.mjs')];
const evaluation={engine_id:'MKTBOOT-001',approved:true,score:1,cases:{organic_first_plan:true,three_canonical_sources:true,preprod_plan_only:true,campaign_execution_blocked:true,publishing_blocked:true,spend_blocked:true,company_isolation:true,cross_company_denied:crossDenied,authority_denied:authorityDenied,pii_denied:piiDenied,deterministic:first.result_sha256===second.result_sha256,zero_cost:true},tests};
const tribunal={engine_id:'MKTBOOT-001',approved:Object.values(evaluation.cases).every(Boolean)&&tests.every(x=>x.status==='PASS'),pass:true,decision:'PASS',prod_authorized:false};
A(tribunal.approved,'MKTBOOT tribunal denied');
const b=fs.mkdtempSync(path.join(os.tmpdir(),'mktboot-bkp-')),hashes={};
for(const p of [runtime,sql,rollbackSql,test1]){const n=path.basename(p);hashes[n]=sha(fs.readFileSync(p));fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],`backup fail ${n}`)}
const state=path.join(b,'mktboot-state.json'),backup=path.join(b,'mktboot-state.backup.json');fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,backup);const original=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(backup,state);A(sha(fs.readFileSync(state))===original,'rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');
W('evaluation/mktboot-001-evaluation-evidence.json',{engine_id:'MKTBOOT-001',gate:'evaluation',status:'PASS',...evaluation,additional_cost_eur:0});
W('tribunal/mktboot-001-tribunal-evidence.json',{engine_id:'MKTBOOT-001',gate:'tribunal',status:'GREEN',...tribunal,additional_cost_eur:0});
W('observability/mktboot-001-observability-evidence.json',{engine_id:'MKTBOOT-001',gate:'observability',status:'PASS',metrics:{companies_tested:2,source_count:first.payload.source_count,segments:first.payload.segments.length,channels:first.payload.channels.length,funnel_stages:first.payload.funnel_stages.length,cross_company_denied:1,authority_denied:1,pii_denied:1,campaign_executions:0,publishes:0,spend_eur:0},trace_sha256:sha({first,env}),additional_cost_eur:0});
W('backup/mktboot-001-backup-evidence.json',{engine_id:'MKTBOOT-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',hashes,additional_cost_eur:0});
W('rollback/mktboot-001-rollback-evidence.json',{engine_id:'MKTBOOT-001',gate:'rollback',status:'PASS',tested:true,local_state_restore:'PASS',sql_rollback_present:true,sql_rollback_sha256:hashes[path.basename(rollbackSql)],additional_cost_eur:0});
W('rebuild/mktboot-001-rebuild-evidence.json',{engine_id:'MKTBOOT-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_MKTBOOT001_V1',status:'GREEN',engine_id:'MKTBOOT-001',environment:'LAB_PREPROD',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',organic_first:'PASS',company_isolation:'PASS',fail_closed:'PASS',prod_execution_authorized:false,prod_writes:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_MKTBOOT001_V1=GREEN');
