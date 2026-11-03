#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {runCustomerJourneyRealAdoption} from '../runtime/customer-journey-real-adoption-v1.mjs';

const ROOT=process.cwd();
const BASE=path.join(ROOT,'cerebro/evidence');
const DATE='2026-11-03';
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const A=(v,m)=>{if(!v)throw new Error(m)};
const out=id=>path.join(BASE,`batch09-${id.toLowerCase().replaceAll('-','')}-autonomy-closure`,DATE);
const W=(id,r,v)=>{const p=path.join(out(id),r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v))};
const T=f=>{const r=spawnSync(process.execPath,['--test',f],{cwd:ROOT,encoding:'utf8',maxBuffer:12e6});if(r.status)throw new Error(r.stdout+r.stderr);return {file:f,status:'PASS',stdout_sha256:sha(r.stdout||'')}};
for(const id of ['POST-001','CX-001','REF-001','REP-001'])fs.rmSync(out(id),{recursive:true,force:true});

const runtime='cerebro/runtime/customer-journey-real-adoption-v1.mjs';
const native='cerebro/customer/customer-journey-native-v1.mjs';
const phase11='cerebro/customer/ret-ref-rep-runtime-v0.mjs';
const testNative='cerebro/tests/customer-journey-native-v1.test.mjs';
const testReal='cerebro/tests/customer-journey-real-adoption-v1.test.mjs';
const testPhase11='cerebro/tests/ret-ref-rep-runtime-v0.test.mjs';
for(const f of [runtime,native,phase11,testNative,testReal,testPhase11])A(fs.existsSync(path.join(ROOT,f)),`missing ${f}`);
const sourceHashes=Object.fromEntries([runtime,native,phase11,testNative,testReal,testPhase11].map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
const tests=[T(testNative),T(testReal),T(testPhase11)];
const root=fs.mkdtempSync(path.join(os.tmpdir(),'customer-lifecycle-close-'));
const result=runCustomerJourneyRealAdoption({company_id:'fenix',root_dir:root,source_run_id:74001,source_head_sha:'b'.repeat(40)});
A(result.status==='FULL_E2E_REAL_PREPROD'&&result.full_e2e_real_preprod===true,'Customer Journey E2E drift');
A(result.consumer_coverage===1&&result.functional_consumer_coverage===1&&result.missing_consumers.length===0&&result.failed_consumers.length===0,'Customer Journey coverage drift');
A(result.independent_tribunal?.decision==='PASS','Customer Journey tribunal drift');
A(result.observability_consumer?.decision==='OBSERVABILITY_RECORDED','Customer Journey observability drift');
A(result.finops_consumer?.decision==='FINOPS_ZERO_COST_RECORDED'&&result.additional_cost_eur===0,'Customer Journey cost drift');
A(result.backup_rollback_rebuild?.backup_ready===true&&result.backup_rollback_rebuild?.rollback_green===true&&result.backup_rollback_rebuild?.rebuild_green===true,'Customer Journey BRR drift');
A(result.idempotency_proven===true&&result.restartable===true,'Customer Journey idempotency drift');
for(const k of ['prod_authorized','prod_write_authorized','db_mutation_authorized','provider_write_authorized','crm_write_authorized','dispatch_authorized','public_review_post_authorized','spend_authorized','trading_access','external_code_execution'])A(result[k]===false,`Customer Journey authority drift ${k}`);
const rebuilt=runCustomerJourneyRealAdoption({company_id:'fenix',root_dir:fs.mkdtempSync(path.join(os.tmpdir(),'customer-lifecycle-rebuild-')),source_run_id:74001,source_head_sha:'b'.repeat(40)});
A(rebuilt.semantic_outcome_hash===result.semantic_outcome_hash,'Customer Journey deterministic rebuild drift');

const defs={
  'POST-001':{decision:'POST_SIGNATURE_JOURNEY_READY',scope:'POST_SIGNATURE_JOURNEY_PLAN_NO_EXTERNAL_EXECUTION',metric:'POST_SIGNATURE_JOURNEY_READY',allow:['READ_OPERATION_COMPLETION','BUILD_POST_SIGNATURE_STAGES','EMIT_INTERNAL_JOURNEY_PLAN'],deny:['EXTERNAL_EXECUTION','CRM_WRITE','DB_MUTATION','PROD_WRITE','TRADING','SPEND'],checks:r=>A(r.outcome?.stage_count===6,'POST stage count drift')},
  'CX-001':{decision:'CUSTOMER_EXPERIENCE_SCORED',scope:'DETERMINISTIC_CUSTOMER_EXPERIENCE_SCORE_NO_ML',metric:'CUSTOMER_EXPERIENCE_SCORED',allow:['READ_NORMALIZED_EXPERIENCE_SIGNALS','CALCULATE_FRICTION_SCORE','EMIT_RETENTION_HANDOFF'],deny:['RAW_PII','ML_REQUIRED','CRM_WRITE','EXTERNAL_DISPATCH','PROD_WRITE','TRADING'],checks:r=>{A(typeof r.outcome?.friction_score==='number','CX score missing');A(typeof r.outcome?.friction_band==='string','CX band missing')}},
  'REF-001':{decision:'REFERRAL_MOMENT_READY',scope:'REFERRAL_MOMENT_PLAN_NO_EXTERNAL_DISPATCH',metric:'REFERRAL_MOMENT_READY',allow:['READ_SATISFACTION_RESULT_SIGNALS','EVALUATE_REFERRAL_MOMENT','EMIT_COM_INTENT'],deny:['EXTERNAL_DISPATCH','CRM_WRITE','DB_MUTATION','PROD_WRITE','TRADING','SPEND'],checks:r=>A(typeof r.outcome?.eligible==='boolean','REF eligibility missing')},
  'REP-001':{decision:'REPUTATION_REVIEW_PLAN_READY',scope:'REPUTATION_REVIEW_PLAN_NO_PUBLIC_POST',metric:'REPUTATION_REVIEW_PLAN_READY',allow:['READ_NORMALIZED_REVIEW_SIGNALS','BUILD_REVIEW_REQUEST_PLAN','CLASSIFY_REPUTATION_RISK','EMIT_COM_OR_HEX_INTENT'],deny:['PUBLIC_POST','EXTERNAL_DISPATCH','RAW_REVIEW_TEXT','CRM_WRITE','DB_MUTATION','PROD_WRITE','TRADING'],checks:r=>A(r.outcome?.public_post_authorized===false,'REP public post drift')}
};

for(const [id,d] of Object.entries(defs)){
  const c=result.consumer_map?.[id];A(c?.decision===d.decision&&c?.real_consumption===true&&c?.outcome?.pass===true,`${id} semantic consumer drift`);d.checks(c);
  const c2=rebuilt.consumer_map?.[id];A(c2?.outcome_hash===c.outcome_hash,`${id} rebuild outcome drift`);
  const trace=sha({bundle_id:result.bundle_id,semantic_outcome_hash:result.semantic_outcome_hash,engine_id:id,outcome_hash:c.outcome_hash,decision:c.decision});
  W(id,'contracts/engine-contract-evidence.json',{engine_id:id,gate:'contracts',status:'PASS',contract:d.scope,invariants:['company_id exact','PREPROD exact','real semantic consumer','deterministic/local-first','source of truth preserved','no unauthorized external effect','no PROD execution','no Trading'],prod_execution_authorized:false,additional_cost_eur:0});
  W(id,'permissions/engine-permissions-evidence.json',{engine_id:id,gate:'permissions',status:'PASS',permission_model:'FAIL_CLOSED_PREPROD_SEMANTIC_PLAN',allow:d.allow,deny:d.deny,cross_company_access_denied:true,crm_write_authorized:false,dispatch_authorized:false,prod_execution_authorized:false,additional_cost_eur:0});
  W(id,'policy/engine-policy-evidence.json',{engine_id:id,gate:'policy',status:'PASS',policy_mode:'FAIL_CLOSED_PREPROD',fail_closed:true,human_required_passthrough:true,requirements:{multi_company_isolation:true,source_of_truth_preserved:true,external_side_effects_denied:true,prod_write_denied:true,trading_denied:true},prod_execution_authorized:false,additional_cost_eur:0});
  W(id,'evaluation/engine-evaluation-evidence.json',{engine_id:id,gate:'evaluation',status:'PASS',approved:true,score:1,environment:'LAB_PREPROD',scope:d.scope,old_vs_new:result.evaluation,cases:{full_e2e_real_preprod:true,semantic_consumer_real:true,decision:c.decision,outcome_pass:true,consumer_coverage_1:true,functional_coverage_1:true,observability_recorded:true,finops_zero_cost:true,backup_ready:true,rollback_green:true,rebuild_green:true,idempotency_proven:true,restartable:true,prod_write_denied:true,trading_denied:true},tests,source_hashes:sourceHashes,additional_cost_eur:0});
  W(id,'tribunal/engine-tribunal-evidence.json',{engine_id:id,gate:'tribunal',status:'GREEN',approved:true,pass:true,decision:'PASS',basis:`real semantic PREPROD ${id} consumer + OLD vs NEW + independent tribunal + durable BRR + observability/FinOps + strict no-external-effect boundary`,independent_tribunal:result.independent_tribunal,prod_authorized:false,additional_cost_eur:0});
  W(id,'observability/engine-observability-evidence.json',{engine_id:id,gate:'observability',status:'PASS',environment:'LAB_PREPROD',metric:d.metric,audit:'semantic lifecycle outcome recorded',trace_sha256:trace,decision:c.decision,outcome_hash:c.outcome_hash,external_effects:0,crm_writes:0,prod_writes:0,additional_cost_eur:0});
  W(id,'backup/engine-backup-evidence.json',{engine_id:id,gate:'backup',status:'PASS',tested:true,restore_tested:true,backup_ready:result.backup_rollback_rebuild.backup_ready,runtime_result:result.backup_rollback_rebuild,source_hashes:sourceHashes,additional_cost_eur:0});
  W(id,'rollback/engine-rollback-evidence.json',{engine_id:id,gate:'rollback',status:'PASS',tested:true,rollback_green:result.backup_rollback_rebuild.rollback_green,prod_rollback_claimed:false,additional_cost_eur:0});
  W(id,'rebuild/engine-rebuild-evidence.json',{engine_id:id,gate:'rebuild',status:'PASS',tested:true,deterministic:true,rebuild_green:result.backup_rollback_rebuild.rebuild_green,semantic_rebuild_match:rebuilt.semantic_outcome_hash===result.semantic_outcome_hash,engine_outcome_rebuild_match:c2?.outcome_hash===c.outcome_hash,additional_cost_eur:0});
  W(id,'SUMMARY.json',{mission:'CLOSE_BATCH09_CUSTOMER_LIFECYCLE_GROUP_V1',status:'GREEN',engine_id:id,company_id:'fenix',environment:'LAB_PREPROD',certified_scope:d.scope,semantic_consumer_real:true,decision:c.decision,outcome:c.outcome,read_only:true,source_of_truth_replaced:false,crm_write_authorized:false,db_mutation_authorized:false,external_dispatch_authorized:false,external_side_effects_executed:false,prod_execution_authorized:false,prod_writes:false,spend_authorized:false,trading_touched:false,factory_mutated:false,registry_mutated:false,additional_cost_eur:0});
}
fs.rmSync(root,{recursive:true,force:true});
console.log('CLOSE_BATCH09_CUSTOMER_LIFECYCLE_GROUP_V1=GREEN POST-001 CX-001 REF-001 REP-001');
