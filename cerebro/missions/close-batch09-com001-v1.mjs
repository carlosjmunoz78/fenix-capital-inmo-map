#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runLote3ComNotifC360} from '../runtime/lote3-com-notif-c360-real-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch09-com001-autonomy-closure/2026-11-03');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const W=(r,v)=>{const p=path.join(OUT,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:12e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
fs.rmSync(OUT,{recursive:true,force:true});

const runtime='cerebro/runtime/lote3-com-notif-c360-real-v1.mjs';
const router='cerebro/communication/com-delivery-router-v1.mjs';
const testRouter='cerebro/tests/com-delivery-router-v1.test.mjs';
const testLote3='cerebro/tests/lote3-com-notif-c360-real-v1.test.mjs';
for(const f of [runtime,router,testRouter,testLote3])A(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);
const sourceHashes=Object.fromEntries([runtime,router,testRouter,testLote3].map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
const tests=[T(testRouter),T(testLote3)];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'com001-close-'));
const result=runLote3ComNotifC360({company_id:'fenix',root_dir:root,source_run_id:66001,source_head_sha:'6'.repeat(40)});
A(result.status==='FULL_E2E_REAL_PREPROD'&&result.full_e2e_real_preprod===true,'COM E2E drift');
A(result.consumer_coverage===1&&result.functional_consumer_coverage===1&&result.missing_consumers.length===0&&result.failed_consumers.length===0,'COM consumer coverage drift');
const com=result.consumer_map?.['COM-001'];
A(com?.decision==='COM_ROUTE_READY'&&com?.real_consumption===true&&com?.outcome?.pass===true,'COM semantic consumer drift');
A(result.com_route?.route_status==='READY_FOR_ADAPTER_GATE','COM route gate drift');
A(result.com_route?.adapter_gate_required===true&&result.com_route?.adapter_dispatch_authorized===false&&result.com_route?.dispatch_authorized===false,'COM adapter authority drift');
A(result.com_route?.external_side_effect_executed===false&&result.com_route?.raw_contact_data_present===false,'COM side-effect/privacy drift');
A(result.independent_tribunal?.decision==='PASS','COM tribunal drift');
A(result.observability_consumer?.decision==='OBSERVABILITY_RECORDED','COM observability drift');
A(result.finops_consumer?.decision==='FINOPS_ZERO_COST_RECORDED'&&result.additional_cost_eur===0,'COM cost drift');
A(result.backup_rollback_rebuild?.backup_ready===true&&result.backup_rollback_rebuild?.rollback_green===true&&result.backup_rollback_rebuild?.rebuild_green===true,'COM BRR drift');
A(result.idempotency_proven===true&&result.restartable===true,'COM idempotency/restart drift');
for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','dispatch_authorized','spend_authorized','trading_access','android_touched','external_code_execution'])A(result[k]===false,`COM authority drift ${k}`);

const rebuilt=runLote3ComNotifC360({company_id:'fenix',root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'com001-rebuild-')),source_run_id:66001,source_head_sha:'6'.repeat(40)});
A(rebuilt.semantic_outcome_hash===result.semantic_outcome_hash&&rebuilt.full_e2e_real_preprod===true,'COM deterministic rebuild drift');

W('contracts/com-001-contract-evidence.json',{engine_id:'COM-001',gate:'contracts',status:'PASS',contract:'GOVERNED_PREPROD_CUSTOMER_DELIVERY_ROUTER',invariants:['company_id exact','PREPROD exact','raw PII/secrets/message denied','contact permission fail-closed','quiet-hours defer','dedupe','authorized customer binding only','adapter gate mandatory','direct dispatch denied','prod writes denied','trading denied'],adapter_dispatch_authorized:false,external_delivery_evidence:false,prod_execution_authorized:false,additional_cost_eur:0});
W('permissions/com-001-permissions-evidence.json',{engine_id:'COM-001',gate:'permissions',status:'PASS',permission_model:'EXACT_COMPANY_PREPROD_CUSTOMER_OPERATIONAL',allow:['PREPROD_ROUTE_PLANNING','AUTHORIZED_BINDING_SELECTION','QUIET_HOURS_DEFER','DEDUPLICATION'],deny:['DIRECT_ADAPTER_DISPATCH','RAW_PII','RAW_SECRETS','RAW_MESSAGE_TEXT','CROSS_COMPANY_BINDING','PROD_WRITE','PROVIDER_WRITE','SPEND','TRADING'],adapter_dispatch_authorized:false,prod_execution_authorized:false,additional_cost_eur:0});
W('policy/com-001-policy-evidence.json',{engine_id:'COM-001',gate:'policy',status:'PASS',policy_mode:'FAIL_CLOSED_PREPROD',fail_closed:true,requirements:{contact_permission_required:true,opt_out_suppression:true,unknown_permission_blocks:true,quiet_hours_supported:true,dedupe_required:true,exact_company_binding:true,adapter_gate_required:true,external_side_effects_denied:true},prod_execution_authorized:false,additional_cost_eur:0});
W('evaluation/com-001-evaluation-evidence.json',{engine_id:'COM-001',gate:'evaluation',status:'PASS',approved:true,score:1,environment:'LAB_PREPROD',scope:'GOVERNED_ROUTING_TO_ADAPTER_GATE_NO_EXTERNAL_DISPATCH',old_vs_new:result.evaluation,cases:{full_e2e_real_preprod:true,semantic_consumer_real:true,consumer_coverage_1:true,functional_coverage_1:true,adapter_gate_ready:true,adapter_dispatch_denied:true,observability_recorded:true,finops_zero_cost:true,backup_ready:true,rollback_green:true,rebuild_green:true,idempotency_proven:true,restartable:true,prod_write_denied:true,trading_denied:true},tests,source_hashes:sourceHashes,external_delivery_evidence:false,additional_cost_eur:0});
W('tribunal/com-001-tribunal-evidence.json',{engine_id:'COM-001',gate:'tribunal',status:'GREEN',approved:true,pass:true,decision:'PASS',basis:'real semantic PREPROD customer-delivery routing + OLD vs NEW + independent tribunal + durable BRR + observability/FinOps + strict adapter-dispatch denial',independent_tribunal:result.independent_tribunal,external_delivery_approved:false,prod_authorized:false,additional_cost_eur:0});
W('observability/com-001-observability-evidence.json',{engine_id:'COM-001',gate:'observability',status:'PASS',environment:'LAB_PREPROD',metric:'COM_ROUTE_READY',audit:'semantic route outcome recorded',trace_sha256:sha({bundle_id:result.bundle_id,semantic_outcome_hash:result.semantic_outcome_hash,com_outcome_hash:com.outcome_hash}),observability_decision:result.observability_consumer.decision,finops_decision:result.finops_consumer.decision,route_status:result.com_route.route_status,adapter_dispatch_authorized:false,external_dispatches:0,prod_writes:0,additional_cost_eur:0});
W('backup/com-001-backup-evidence.json',{engine_id:'COM-001',gate:'backup',status:'PASS',tested:true,backup_ready:result.backup_rollback_rebuild.backup_ready,runtime_result:result.backup_rollback_rebuild,source_hashes:sourceHashes,additional_cost_eur:0});
W('rollback/com-001-rollback-evidence.json',{engine_id:'COM-001',gate:'rollback',status:'PASS',tested:true,rollback_green:result.backup_rollback_rebuild.rollback_green,prod_rollback_claimed:false,external_delivery_rollback_claimed:false,additional_cost_eur:0});
W('rebuild/com-001-rebuild-evidence.json',{engine_id:'COM-001',gate:'rebuild',status:'PASS',tested:true,rebuild_green:result.backup_rollback_rebuild.rebuild_green,semantic_rebuild_match:rebuilt.semantic_outcome_hash===result.semantic_outcome_hash,additional_cost_eur:0});
W('SUMMARY.json',{mission:'CLOSE_BATCH09_COM001_V1',status:'GREEN',engine_id:'COM-001',company_id:'fenix',environment:'LAB_PREPROD',certified_scope:'GOVERNED_ROUTING_TO_ADAPTER_GATE_NO_EXTERNAL_DISPATCH',full_e2e_real_preprod:true,semantic_consumer_real:true,adapter_gate_ready:true,adapter_dispatch_authorized:false,external_delivery_evidence:false,external_side_effects_executed:false,prod_execution_authorized:false,prod_writes:false,provider_writes:false,crm_writes:false,spend_authorized:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0,holds:['REAL_CUSTOMER_ADAPTER_DISPATCH','WHATSAPP_REAL_SEND','PHONE_REAL_CALL','PROD_EXECUTION']});
fs.rmSync(root,{recursive:true,force:true});
console.log('CLOSE_BATCH09_COM001_V1=GREEN');
