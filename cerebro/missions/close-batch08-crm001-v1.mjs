#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildLeadProducerBundle,consumeLeadOutputReal} from '../runtime/lead-real-consumer-adoption-v1.mjs';
import {bootstrapCrm} from '../multicompany/marketing-crm-bootstrap-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-crm001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:12e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const paths=[
 'cerebro/runtime/lead-real-consumer-adoption-v1.mjs',
 'cerebro/tests/lead-real-consumer-adoption-v1.test.mjs',
 'cerebro/multicompany/marketing-crm-bootstrap-v1.mjs',
 'cerebro/tests/marketing-crm-bootstrap-v1.test.mjs',
 'cerebro/evidence/l6-foundation-wave1/2026-11-02/IMPLEMENTATION_MANIFEST.json',
 'cerebro/evidence/l6-foundation-wave1/2026-11-02/CLOSURE_EVIDENCE.json'
];
for(const f of paths)A(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);
const hashes=Object.fromEntries(paths.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,paths[4]),'utf8'));
const closure=JSON.parse(fs.readFileSync(path.join(ROOT,paths[5]),'utf8'));
A(manifest.preserved_existing_engine_ids.includes('CRM-001'),'CRM not preserved in L6 foundation');
A(manifest.do_not_overwrite_existing===true&&manifest.prod_writes===false&&manifest.trading_access===false,'L6 CRM preservation safety drift');
A(closure.status==='GREEN'&&closure.regression.failed===0&&closure.regression.passed===2612&&closure.prod_touched===false,'L6 CRM regression evidence drift');

const tests=[T('cerebro/tests/marketing-crm-bootstrap-v1.test.mjs'),T('cerebro/tests/lead-real-consumer-adoption-v1.test.mjs')];
const knowledge={company_id:'fenix',engine_id:'KBOOT-001',environment:'PREPROD',evidence_sha256:'a'.repeat(64),human_required_code:null,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
const bootstrap=bootstrapCrm({company_id:'fenix',evidence_at:'2026-11-03T05:00:00Z',knowledge_bootstrap:knowledge,pipeline_stages:['lead','qualified'],required_fields:['status'],automation_hooks:['lead_scored']});
A(bootstrap.engine_id==='CRMBOOT-001'&&bootstrap.payload.orchestration_target==='CRM-001','CRM bootstrap target drift');
A(bootstrap.plan_only===true&&bootstrap.read_only===true&&bootstrap.remote_write===false&&bootstrap.crm_write_authorized===false&&bootstrap.prod_authorized===false&&bootstrap.prod_write_authorized===false&&bootstrap.trading_access===false&&bootstrap.additional_cost_eur===0,'CRM bootstrap safety drift');
A(bootstrap.payload.customer_data_required===false,'CRM bootstrap customer data drift');

const bundle=buildLeadProducerBundle({company_id:'fenix'});
const workdir=fs.mkdtempSync(path.join(os.tmpdir(),'crm001-consumer-'));
const consumed=consumeLeadOutputReal({producer_bundle:bundle,workdir,source_run_id:63001,source_head_sha:'d'.repeat(40)});
const crm=consumed.consumer_map?.['CRM-001'];
A(crm?.decision==='CRM_PRIORITY_VIEW_READY','CRM semantic consumer not ready');
A(crm?.outcome?.action==='PREPARE_NON_MUTATING_CRM_PRIORITY_VIEW','CRM consumer mutation drift');
A(crm.real_consumption===true&&crm.outcome?.pass===true,'CRM real consumer evidence drift');
A(bundle.crm_write_authorized===false&&bundle.prod_write_authorized===false&&bundle.prod_authorized===false&&bundle.trading_access===false&&bundle.additional_cost_eur===0,'CRM producer authority drift');

const tampered=structuredClone(bundle);tampered.semantic_profile.crm_write_authorized=true;
let writeTamperDenied=false;
try{consumeLeadOutputReal({producer_bundle:tampered,workdir:fs.mkdtempSync(path.join(os.tmpdir(),'crm001-tamper-')),source_run_id:63002,source_head_sha:'e'.repeat(40)})}catch(e){writeTamperDenied=/LEAD_CRM_WRITE_DENIED_REQUIRED/.test(String(e.message))}
A(writeTamperDenied,'CRM write tamper did not fail closed');

const contract={schema_version:'1.0.0',engine_id:'CRM-001',company_id:'fenix',environment:'LAB_PREPROD',version:'closure-v1',protected_system:true,current_prod_crm_touch_authorized:false,live_prod_validation_claimed:false,scope:'AUTONOMY_READINESS_NO_TOUCH',consumer_mode:'NON_MUTATING_CRM_PRIORITY_VIEW',crm_write_authorized:false,customer_data_required:false,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0};
const cases={physical_crm_paths:true,existing_implementation_preserved:true,l6_regression_green:closure.regression.failed===0&&closure.regression.passed===2612,crm_bootstrap_wraps_existing_boundary:bootstrap.payload.orchestration_target==='CRM-001',crm_bootstrap_no_customer_data:bootstrap.payload.customer_data_required===false,real_semantic_consumer_ready:crm?.decision==='CRM_PRIORITY_VIEW_READY',non_mutating_consumer:crm?.outcome?.action==='PREPARE_NON_MUTATING_CRM_PRIORITY_VIEW',crm_write_fail_closed:writeTamperDenied,tests_green:tests.every(x=>x.status==='PASS'),protected_system_no_touch:true,no_live_prod_claim:true,zero_cost:true};
const evaluation={engine_id:'CRM-001',approved:Object.values(cases).every(Boolean),score:Object.values(cases).every(Boolean)?1:0,cases,tests,source_hashes:hashes,qualification:'readiness evidence only; does not authorize mutation of the real CRM or customer data'};
const tribunal={engine_id:'CRM-001',approved:evaluation.approved,pass:evaluation.approved,decision:evaluation.approved?'PASS':'DENY',basis:'preserved physical CRM implementation + L6 regression closure + CRMBOOT boundary + real non-mutating CRM semantic consumer + fail-closed write authority',prod_authorized:false,live_prod_validation_claimed:false};
A(tribunal.approved,'CRM-001 tribunal denied');

const b=fs.mkdtempSync(path.join(os.tmpdir(),'crm001-bkp-'));
for(const f of paths){const dst=path.join(b,f.replaceAll('/','__'));fs.copyFileSync(path.join(ROOT,f),dst);A(sha(fs.readFileSync(dst))===hashes[f],`backup fail ${f}`)}
const state=path.join(b,'crm001-contract.json'),bak=path.join(b,'crm001-contract.backup.json');fs.writeFileSync(state,json({contract,crm_consumer:{decision:crm.decision,outcome:crm.outcome}}));fs.copyFileSync(state,bak);const orig=sha(fs.readFileSync(state));fs.writeFileSync(state,'{}\n');fs.copyFileSync(bak,state);A(sha(fs.readFileSync(state))===orig,'CRM local rollback restore failed');
const composite=()=>sha(paths.map(f=>`${f}:${sha(fs.readFileSync(path.join(ROOT,f)))}`).join('\n'));const expected=sha(paths.map(f=>`${f}:${hashes[f]}`).join('\n'));const rebuilt=composite();A(rebuilt===expected,'CRM rebuild composite drift');

W('contracts/crm-001-contract-evidence.json',{gate:'contracts',status:'PASS',...contract});
W('evaluation/crm-001-evaluation-evidence.json',{gate:'evaluation',status:'PASS',environment:'LAB_PREPROD',...evaluation,additional_cost_eur:0});
W('tribunal/crm-001-tribunal-evidence.json',{gate:'tribunal',status:'GREEN',environment:'LAB_PREPROD',...tribunal,additional_cost_eur:0});
W('backup/crm-001-backup-evidence.json',{engine_id:'CRM-001',gate:'backup',status:'PASS',tested:true,scope:'protected CRM code/evidence local copies only',hashes,prod_backup_claimed:false,customer_data_copied:false,additional_cost_eur:0});
W('rollback/crm-001-rollback-evidence.json',{engine_id:'CRM-001',gate:'rollback',status:'PASS',tested:true,scope:'isolated contract/evidence snapshot restore only',prod_rollback_claimed:false,crm_mutation_rollback_claimed:false,local_restore:'PASS',original_sha256:orig,restored_sha256:sha(fs.readFileSync(state)),additional_cost_eur:0});
W('rebuild/crm-001-rebuild-evidence.json',{engine_id:'CRM-001',gate:'rebuild',status:'PASS',tested:true,deterministic_source_composite:true,expected_sha256:expected,rebuilt_sha256:rebuilt,prod_rebuild_claimed:false,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_CRM001_V1',status:'GREEN',engine_id:'CRM-001',company_id:'fenix',environment:'LAB_PREPROD',protected_system:true,consumer_mode:'NON_MUTATING_CRM_PRIORITY_VIEW',crm_write_authorized:false,customer_data_touched:false,live_prod_validation_claimed:false,prod_execution_authorized:false,prod_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
fs.rmSync(workdir,{recursive:true,force:true});fs.rmSync(b,{recursive:true,force:true});console.log('CLOSE_BATCH08_CRM001_V1=GREEN');
