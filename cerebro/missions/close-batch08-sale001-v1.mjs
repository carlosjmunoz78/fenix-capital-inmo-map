#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runSaleRealConsumerAdoption} from '../runtime/sale-real-consumer-adoption-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch08-sale001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:12e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime='cerebro/runtime/sale-real-consumer-adoption-v1.mjs';
const native='cerebro/runtime/sale-native-v1.mjs';
const test='cerebro/tests/sale-real-consumer-adoption-v1.test.mjs';
for(const f of [runtime,native,test])A(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);
const hashes=Object.fromEntries([runtime,native,test].map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
const tests=[T(test)];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sale001-close-'));
const result=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:root,source_run_id:64001,source_head_sha:'6'.repeat(40)});
A(result.engine_id==='SALE-001'&&result.status==='FULL_E2E_REAL_PREPROD'&&result.full_e2e_real_preprod===true,'SALE E2E drift');
A(result.consumer_coverage===1&&result.functional_consumer_coverage===1&&result.missing_consumers.length===0&&result.failed_consumers.length===0,'SALE consumer coverage drift');
A(result.independent_tribunal?.decision==='PASS','SALE tribunal drift');
A(result.observability_consumer?.decision==='OBSERVABILITY_RECORDED','SALE observability drift');
A(result.finops_consumer?.decision==='FINOPS_ZERO_COST_RECORDED'&&result.additional_cost_eur===0,'SALE cost drift');
A(result.backup_rollback_rebuild?.backup_ready===true&&result.backup_rollback_rebuild?.rollback_green===true&&result.backup_rollback_rebuild?.rebuild_green===true,'SALE BRR drift');
A(result.idempotency_proven===true,'SALE idempotency drift');
A(result.com_route?.route_status==='READY_FOR_ADAPTER_GATE'&&result.com_route?.adapter_dispatch_authorized===false,'SALE dispatch authority drift');
for(const k of ['prod_authorized','prod_write_authorized','crm_write_authorized','provider_write_authorized','trading_access','external_code_execution'])A(result[k]===false,`SALE authority drift ${k}`);
const crm=result.consumer_map?.['CRM-001'];
A(crm?.decision==='CRM_SALES_PROJECTION_READY'&&crm?.outcome?.crm_write_authorized===false,'SALE CRM projection drift');

const contract={schema_version:'1.0.0',engine_id:'SALE-001',company_id:'fenix',environment:'LAB_PREPROD',version:'1.0.0',mode:'FULL_E2E_REAL_PREPROD_NO_EXTERNAL_DISPATCH',adapter_dispatch_authorized:false,prod_execution_authorized:false,prod_write_authorized:false,crm_write_authorized:false,provider_write_authorized:false,trading_access:false,external_code_execution:false,additional_cost_eur:0};
const permissions={engine_id:'SALE-001',gate:'permissions',status:'PASS',allowed:['PREPROD_LOCAL_QUALIFICATION','PREPROD_LOCAL_NEXT_ACTION','PREPROD_LOCAL_CADENCE','PREPROD_SEMANTIC_CONSUMPTION'],denied:['PROD_WRITE','CRM_WRITE','PROVIDER_WRITE','ADAPTER_DISPATCH','TRADING','EXTERNAL_CODE_EXECUTION'],adapter_dispatch_authorized:false,prod_execution_authorized:false};
const policy={engine_id:'SALE-001',gate:'policy',status:'PASS',policy_mode:'FAIL_CLOSED_PREPROD',requirements:{preprod_only:true,zero_cost:true,independent_tribunal:true,consumer_coverage_1:true,external_side_effects_denied:true,adapter_gate_required:true},prod_execution_authorized:false};
const evaluation={engine_id:'SALE-001',approved:true,score:1,cases:{full_e2e_real_preprod:true,consumer_coverage_1:true,functional_coverage_1:true,independent_tribunal_pass:true,observability_recorded:true,finops_zero_cost:true,backup_ready:true,rollback_green:true,rebuild_green:true,idempotency_proven:true,adapter_dispatch_denied:true,crm_write_denied:true,prod_write_denied:true,trading_denied:true},tests,source_hashes:hashes};
const tribunal={engine_id:'SALE-001',approved:true,pass:true,decision:'PASS',basis:'existing SALE-NATIVE real semantic consumers + independent tribunal + durable BRR + zero-cost observability/FinOps + side-effect denial',prod_authorized:false};
const rebuilt=runSaleRealConsumerAdoption({company_id:'fenix',root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'sale001-rebuild-')),source_run_id:64001,source_head_sha:'6'.repeat(40)});
A(rebuilt.semantic_outcome_hash===result.semantic_outcome_hash&&rebuilt.full_e2e_real_preprod===true,'SALE deterministic rebuild drift');

W('contracts/sale-001-contract-evidence.json',{gate:'contracts',status:'PASS',...contract});
W('permissions/sale-001-permissions-evidence.json',permissions);
W('policy/sale-001-policy-evidence.json',policy);
W('evaluation/sale-001-evaluation-evidence.json',{gate:'evaluation',status:'PASS',environment:'LAB_PREPROD',...evaluation,additional_cost_eur:0});
W('tribunal/sale-001-tribunal-evidence.json',{gate:'tribunal',status:'GREEN',environment:'LAB_PREPROD',...tribunal,additional_cost_eur:0});
W('observability/sale-001-observability-evidence.json',{engine_id:'SALE-001',gate:'observability',status:'PASS',environment:'LAB_PREPROD',metrics:{consumer_coverage:result.consumer_coverage,functional_consumer_coverage:result.functional_consumer_coverage,external_dispatches:0,prod_writes:0,additional_cost_eur:0},trace_sha256:sha({semantic_outcome_hash:result.semantic_outcome_hash,observability_decision:result.observability_consumer.decision,finops_decision:result.finops_consumer.decision}),observability_decision:result.observability_consumer.decision,finops_decision:result.finops_consumer.decision,semantic_outcome_hash:result.semantic_outcome_hash,external_dispatches:0,prod_writes:0,additional_cost_eur:0});
W('backup/sale-001-backup-evidence.json',{engine_id:'SALE-001',gate:'backup',status:'PASS',tested:true,runtime_result:result.backup_rollback_rebuild,source_hashes:hashes,additional_cost_eur:0});
W('rollback/sale-001-rollback-evidence.json',{engine_id:'SALE-001',gate:'rollback',status:'PASS',tested:true,rollback_green:result.backup_rollback_rebuild.rollback_green,prod_rollback_claimed:false,additional_cost_eur:0});
W('rebuild/sale-001-rebuild-evidence.json',{engine_id:'SALE-001',gate:'rebuild',status:'PASS',tested:true,rebuild_green:result.backup_rollback_rebuild.rebuild_green,semantic_rebuild_match:rebuilt.semantic_outcome_hash===result.semantic_outcome_hash,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH08_SALE001_V1',status:'GREEN',engine_id:'SALE-001',company_id:'fenix',environment:'LAB_PREPROD',full_e2e_real_preprod:true,adapter_dispatch_authorized:false,external_side_effects_executed:false,prod_execution_authorized:false,prod_writes:false,crm_writes:false,provider_writes:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
fs.rmSync(root,{recursive:true,force:true});
console.log('CLOSE_BATCH08_SALE001_V1=GREEN');
