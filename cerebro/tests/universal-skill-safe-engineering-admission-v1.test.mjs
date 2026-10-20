import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSkillSourceQueueReport,applySafeEngineeringAdmissions} from '../runtime/universal-skill-safe-engineering-admission-v1.mjs';

function baseState(){return {
  schema_version:'0.1.0',state_type:'CEREBRO_SKILL_AUTOLOOP_SAFE_STATE',company_id:'GLOBAL',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',enabled:true,mode:'SAFE_AUTONOMY_V0',
  safe_autonomy:{discovery:true,license_evidence:true,risk_and_overlap:true,static_lab:true,disabled_wrapper_plans:true,old_vs_new_synthetic_contracts:true,judge_and_tribunal_evidence:true,rollback_and_rebuild_proof:true,synthetic_behavioral_when_candidate_handler_is_green:true,preprod_promotion:false,prod_readonly_canary:false,prod_write:false,auto_merge:false,customer_data:false,external_skill_code_execution:false,trading:false,paid_fallback:false,additional_cost_budget_eur:0},
  processed_candidate_ids:[],in_flight:{},waiting_human:{},waiting_safe_handler:{},completed:{},terminal_hold:{},autonomy_action_ledger:{},autonomy_action_queue:{},autonomy_action_handoffs:{},autonomy_action_history:{},
  prod_authorized:false,autonomous_prod_promotion_authorized:false
};}

function engineeringRow(overrides={}){return {
  company_id:'fenix',github_url:'https://github.com/acme/skills/tree/main/skills/safe-engineering',status:'HUMAN_REQUIRED',source_status:'ENGINEERING_TASK_REQUIRED',reason:'AUTO_ENGINEERING_NOT_FULL',human_required:'LOW_CONFIDENCE',full_safe_preprod:false,candidate_id:'repo:1234567890abcdef123456789abc',technical_name:'safe-engineering',pinned_sha:'1234567890abcdef1234567890abcdef12345678',source_locator:'github://acme/skills@1234567890abcdef1234567890abcdef12345678/skills/safe-engineering',snapshot_sha256:'a'.repeat(64),manifest_sha256:'b'.repeat(64),target_engine_bindings:['FACT-001','LRN-001'],capability_contracts:[],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,...overrides
};}
function queue(results){return {schema_version:'1.4.0',state_type:'CEREBRO_UNIVERSAL_SKILL_SOURCE_QUEUE_REPORT_V1',status:'QUEUE_TERMINAL_GREEN',results,by_status:{HUMAN_REQUIRED:results.length},report_hash:'source-report-hash'};}

test('technical engineering incompleteness no longer survives as synthetic LOW_CONFIDENCE',()=>{
  const normalized=normalizeSkillSourceQueueReport(queue([engineeringRow()]));
  const row=normalized.results[0];
  assert.equal(row.status,'SAFE_ENGINEERING_REQUIRED');
  assert.equal(row.human_required,null);
  assert.equal(row.admission_decision,'ENVOLVER');
  assert.equal(row.synthetic_low_confidence_removed,true);
  assert.equal(normalized.by_status.SAFE_ENGINEERING_REQUIRED,1);
});

test('genuine canonical human gate is preserved and never admitted autonomously',()=>{
  const genuine=engineeringRow({status:'HUMAN_REQUIRED',source_status:'HUMAN_REQUIRED',reason:'CEREBRO_SKILL_MANIFEST_MISSING',human_required:'LOW_CONFIDENCE'});
  const normalized=normalizeSkillSourceQueueReport(queue([genuine]));
  assert.equal(normalized.results[0].status,'HUMAN_REQUIRED');
  assert.equal(normalized.results[0].human_required,'LOW_CONFIDENCE');
  const result=applySafeEngineeringAdmissions({state:baseState(),queue_report:normalized,now:'2026-10-20T15:00:00.000Z'});
  assert.equal(result.report.admitted,0);
  assert.equal(result.report.queue_depth,0);
});

test('engineering with existing engine bindings becomes ENVOLVER and enters safe action queue',()=>{
  const result=applySafeEngineeringAdmissions({state:baseState(),queue_report:queue([engineeringRow()]),now:'2026-10-20T15:00:00.000Z',source_run_id:123,max_admissions:1});
  const id='repo:1234567890abcdef123456789abc';
  assert.equal(result.report.admitted,1);
  assert.equal(result.report.admissions[0].decision,'ENVOLVER');
  assert.equal(result.state.completed[id].disposition,'ENVOLVER');
  assert.equal(result.state.completed[id].action_type,'BUILD_INTERNAL_WRAPPER_PLAN');
  assert.equal(result.state.autonomy_action_queue[id].status,'WAITING_SAFE_ACTION_WORKER');
  assert.equal(result.state.waiting_human[id],undefined);
  assert.equal(result.state.completed[id].human_required,null);
});

test('real gap without existing bindings becomes FACT-001 candidate-only safe work',()=>{
  const row=engineeringRow({candidate_id:'repo:abcdefabcdefabcdefabcdefabcd',technical_name:'new-gap',target_engine_bindings:[],capability_contracts:[]});
  const result=applySafeEngineeringAdmissions({state:baseState(),queue_report:queue([row]),now:'2026-10-20T15:00:00.000Z'});
  const id='repo:abcdefabcdefabcdefabcdefabcd';
  assert.equal(result.report.admissions[0].decision,'FABRICAR_GRATIS');
  assert.equal(result.state.completed[id].action_type,'FACT001_CAPABILITY_GAP_CANDIDATE');
  assert.equal(result.state.autonomy_action_queue[id].fact001_create_authorized,false);
  assert.equal(result.state.autonomy_action_queue[id].additional_cost_eur,0);
});

test('admission is idempotent and does not duplicate a recorded safe action',()=>{
  const first=applySafeEngineeringAdmissions({state:baseState(),queue_report:queue([engineeringRow()]),now:'2026-10-20T15:00:00.000Z'});
  const second=applySafeEngineeringAdmissions({state:first.state,queue_report:queue([engineeringRow()]),now:'2026-10-20T15:01:00.000Z'});
  assert.equal(second.report.admitted,0);
  assert.equal(second.report.idempotent,1);
  assert.equal(Object.keys(second.state.autonomy_action_queue).length,1);
  assert.equal(Object.keys(second.state.autonomy_action_ledger).length,1);
});

test('authority expansion is rejected instead of entering autonomous engineering',()=>{
  const normalized=normalizeSkillSourceQueueReport(queue([engineeringRow({prod_write_authorized:true})]));
  assert.equal(normalized.results[0].status,'REJECTED');
  assert.equal(normalized.results[0].admission_status,'POLICY_REJECTED');
  const result=applySafeEngineeringAdmissions({state:baseState(),queue_report:normalized,now:'2026-10-20T15:00:00.000Z'});
  assert.equal(result.report.admitted,0);
  assert.equal(result.report.queue_depth,0);
});

test('canary limit admits only one engineering candidate per cycle',()=>{
  const a=engineeringRow();
  const b=engineeringRow({candidate_id:'repo:bbbbbbbbbbbbbbbbbbbbbbbbbbbb',technical_name:'second-safe-skill',github_url:'https://github.com/acme/skills/tree/main/skills/second'});
  const result=applySafeEngineeringAdmissions({state:baseState(),queue_report:queue([a,b]),now:'2026-10-20T15:00:00.000Z',max_admissions:1});
  assert.equal(result.report.admitted,1);
  assert.equal(result.report.deferred,1);
  assert.equal(Object.keys(result.state.autonomy_action_queue).length,1);
});
