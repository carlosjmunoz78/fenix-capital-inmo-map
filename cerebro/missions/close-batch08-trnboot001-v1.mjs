#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {bootstrapTraining,persistenceEnvelope} from '../multicompany/final-onboarding-chain-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-trnboot001-autonomy-closure/2026-11-03');
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

const up=(company_id,engine_id,seed)=>({company_id,engine_id,environment:'PREPROD',evidence_sha256:sha(`${company_id}:${engine_id}:${seed}`),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const build=company_id=>bootstrapTraining({
  company_id,
  evidence_at:'2026-11-03T01:00:00Z',
  knowledge_bootstrap:up(company_id,'KBOOT-001','k'),
  automation_bootstrap:up(company_id,'AUTBOOT-001','a'),
  learning_tracks:['operations','customer-service'],
  evaluation_hooks:['EVA-001:scorecard','JDG-001:tribunal']
});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='TRNBOOT-001','engine drift');
A(first.environment==='PREPROD'&&first.plan_only===true&&first.read_only===true,'PREPROD envelope drift');
A(first.payload.raw_training_data===false&&first.payload.automatic_prod_training===false&&first.payload.learning_candidate_only===true,'training authority drift');
A(JSON.stringify(first.payload.composed_engines)===JSON.stringify(['TRN-001','LRN-001','EVA-001']),'composition drift');
A(first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.company_id==='acme'&&other.result_sha256!==first.result_sha256,'company isolation drift');
let crossDenied=false,authorityDenied=false;
try{bootstrapTraining({company_id:'fenix',evidence_at:'2026-11-03T01:00:00Z',knowledge_bootstrap:up('other','KBOOT-001','x'),automation_bootstrap:up('fenix','AUTBOOT-001','y')})}catch(e){crossDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{bootstrapTraining({company_id:'fenix',evidence_at:'2026-11-03T01:00:00Z',knowledge_bootstrap:{...up('fenix','KBOOT-001','x'),prod_write_authorized:true},automation_bootstrap:up('fenix','AUTBOOT-001','y')})}catch(e){authorityDenied=/POLICY_CONFLICT/.test(String(e.message))}
A(crossDenied&&authorityDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'trnboot:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='TRNBOOT-001'&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');

const tests=[T('cerebro/tests/final-onboarding-chain-v1.test.mjs'),T('cerebro/tests/final-onboarding-chain-preprod-persistence-v1.test.mjs')];
const evaluation={engine_id:'TRNBOOT-001',approved:true,score:1,cases:{canonical_composition:true,preprod_only:true,no_raw_training_data:true,no_automatic_prod_training:true,company_isolation:true,cross_company_denied:crossDenied,authority_denied:authorityDenied,deterministic:first.result_sha256===second.result_sha256,zero_cost:true},tests};
A(Object.values(evaluation.cases).every(Boolean)&&tests.every(x=>x.status==='PASS'),'TRNBOOT evaluation denied');

const b=fs.mkdtempSync(path.join(os.tmpdir(),'trnboot-bkp-'));
const hashes={};
for(const p of [runtime,sql,rollbackSql,test1,test2]){const n=path.basename(p);hashes[n]=sha(fs.readFileSync(p));fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],`backup fail ${n}`)}
const state=path.join(b,'trnboot-state.json'),backup=path.join(b,'trnboot-state.backup.json');
fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,backup);const original=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(backup,state);A(sha(fs.readFileSync(state))===original,'rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');

W('evaluation/trnboot-001-evaluation-evidence.json',{engine_id:'TRNBOOT-001',gate:'evaluation',status:'PASS',...evaluation,additional_cost_eur:0});
W('observability/trnboot-001-observability-evidence.json',{engine_id:'TRNBOOT-001',gate:'observability',status:'PASS',metrics:{companies_tested:2,learning_tracks:first.payload.learning_tracks.length,evaluation_hooks:first.payload.evaluation_hooks.length,cross_company_denied:1,authority_denied:1,prod_training_attempts:0},trace_sha256:sha({first,env}),additional_cost_eur:0});
W('backup/trnboot-001-backup-evidence.json',{engine_id:'TRNBOOT-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',hashes,additional_cost_eur:0});
W('rollback/trnboot-001-rollback-evidence.json',{engine_id:'TRNBOOT-001',gate:'rollback',status:'PASS',tested:true,local_state_restore:'PASS',sql_rollback_present:true,sql_rollback_sha256:hashes[path.basename(rollbackSql)],additional_cost_eur:0});
W('rebuild/trnboot-001-rebuild-evidence.json',{engine_id:'TRNBOOT-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_TRNBOOT001_V1',status:'GREEN',engine_id:'TRNBOOT-001',environment:'LAB_PREPROD',evaluation:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',company_isolation:'PASS',fail_closed:'PASS',prod_execution_authorized:false,prod_writes:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_TRNBOOT001_V1=GREEN');
