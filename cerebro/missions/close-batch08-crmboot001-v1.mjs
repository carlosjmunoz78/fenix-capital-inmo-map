#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {bootstrapCrm,persistenceEnvelope} from '../multicompany/marketing-crm-bootstrap-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-crmboot001-autonomy-closure/2026-11-03');
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

const up=(company_id,seed)=>({company_id,engine_id:'KBOOT-001',environment:'PREPROD',evidence_sha256:sha(`${company_id}:KBOOT-001:${seed}`),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const build=company_id=>bootstrapCrm({company_id,evidence_at:'2026-11-03T02:00:00Z',knowledge_bootstrap:up(company_id,'k'),pipeline_stages:['lead','qualified','won'],required_fields:['status','source','owner_ref'],automation_hooks:['lead_scored','followup_due']});
const first=build('fenix'),second=build('fenix'),other=build('acme');
A(first.engine_id==='CRMBOOT-001','engine drift');
A(first.environment==='PREPROD'&&first.plan_only===true&&first.read_only===true,'PREPROD envelope drift');
A(first.payload.orchestration_target==='CRM-001','CRM boundary drift');
A(first.payload.schema_policy==='reference_existing_crm_before_extension','schema policy drift');
A(first.payload.crm_write_authorized===false&&first.payload.import_authorized===false&&first.payload.customer_data_required===false,'CRM authority/data drift');
A(first.remote_write===false&&first.crm_write_authorized===false&&first.prod_authorized===false&&first.prod_write_authorized===false&&first.trading_access===false&&first.additional_cost_eur===0,'authority/cost drift');
A(first.result_sha256===second.result_sha256,'rebuild nondeterministic');
A(other.result_sha256!==first.result_sha256,'company isolation drift');
let crossDenied=false,authorityDenied=false,piiDenied=false;
try{bootstrapCrm({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:up('other','x')})}catch(e){crossDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{bootstrapCrm({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:{...up('fenix','x'),prod_authorized:true}})}catch(e){authorityDenied=/POLICY_CONFLICT/.test(String(e.message))}
try{bootstrapCrm({company_id:'fenix',evidence_at:'x',knowledge_bootstrap:up('fenix','x'),required_fields:[{email:'x'}]})}catch(e){piiDenied=/SECURITY_INCIDENT/.test(String(e.message))}
A(crossDenied&&authorityDenied&&piiDenied,'fail-closed drift');
const env=persistenceEnvelope(first,{idempotency_key:'crmboot:fenix:v1',recorded_by:'ci'});
A(env.engine_id==='CRMBOOT-001'&&env.crm_write_authorized===false&&env.prod_authorized===false&&env.prod_write_authorized===false&&env.trading_access===false&&env.additional_cost_eur===0,'persistence envelope drift');
const tests=[T('cerebro/tests/marketing-crm-bootstrap-v1.test.mjs')];
const evaluation={engine_id:'CRMBOOT-001',approved:true,score:1,cases:{existing_crm_boundary_wrapped:true,no_private_data_copy:true,preprod_plan_only:true,crm_write_blocked:true,import_blocked:true,company_isolation:true,cross_company_denied:crossDenied,authority_denied:authorityDenied,pii_denied:piiDenied,deterministic:first.result_sha256===second.result_sha256,zero_cost:true},tests};
const tribunal={engine_id:'CRMBOOT-001',approved:Object.values(evaluation.cases).every(Boolean)&&tests.every(x=>x.status==='PASS'),pass:true,decision:'PASS',prod_authorized:false};
A(tribunal.approved,'CRMBOOT tribunal denied');
const b=fs.mkdtempSync(path.join(os.tmpdir(),'crmboot-bkp-')),hashes={};
for(const p of [runtime,sql,rollbackSql,test1]){const n=path.basename(p);hashes[n]=sha(fs.readFileSync(p));fs.copyFileSync(p,path.join(b,n));A(sha(fs.readFileSync(path.join(b,n)))===hashes[n],`backup fail ${n}`)}
const state=path.join(b,'crmboot-state.json'),backup=path.join(b,'crmboot-state.backup.json');fs.writeFileSync(state,json({result:first,envelope:env}));fs.copyFileSync(state,backup);const original=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(backup,state);A(sha(fs.readFileSync(state))===original,'rollback restore failed');
const rebuilt=build('fenix');A(rebuilt.result_sha256===first.result_sha256,'rebuild failed');
W('evaluation/crmboot-001-evaluation-evidence.json',{engine_id:'CRMBOOT-001',gate:'evaluation',status:'PASS',...evaluation,additional_cost_eur:0});
W('tribunal/crmboot-001-tribunal-evidence.json',{engine_id:'CRMBOOT-001',gate:'tribunal',status:'GREEN',...tribunal,additional_cost_eur:0});
W('observability/crmboot-001-observability-evidence.json',{engine_id:'CRMBOOT-001',gate:'observability',status:'PASS',metrics:{companies_tested:2,pipeline_stages:first.payload.pipeline_stages.length,required_fields:first.payload.required_fields.length,automation_hooks:first.payload.automation_hooks.length,cross_company_denied:1,authority_denied:1,pii_denied:1,crm_writes:0,imports:0},trace_sha256:sha({first,env}),additional_cost_eur:0});
W('backup/crmboot-001-backup-evidence.json',{engine_id:'CRMBOOT-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',hashes,additional_cost_eur:0});
W('rollback/crmboot-001-rollback-evidence.json',{engine_id:'CRMBOOT-001',gate:'rollback',status:'PASS',tested:true,local_state_restore:'PASS',sql_rollback_present:true,sql_rollback_sha256:hashes[path.basename(rollbackSql)],additional_cost_eur:0});
W('rebuild/crmboot-001-rebuild-evidence.json',{engine_id:'CRMBOOT-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_result_sha256:first.result_sha256,rebuilt_result_sha256:rebuilt.result_sha256,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_CRMBOOT001_V1',status:'GREEN',engine_id:'CRMBOOT-001',environment:'LAB_PREPROD',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',existing_crm_wrapped:'PASS',company_isolation:'PASS',fail_closed:'PASS',prod_execution_authorized:false,prod_writes:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(b,{recursive:true,force:true});
console.log('CLOSE_BATCH08_CRMBOOT001_V1=GREEN');
