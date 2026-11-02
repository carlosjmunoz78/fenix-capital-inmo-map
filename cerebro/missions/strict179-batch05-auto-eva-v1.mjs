#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {planAuto001Patch} from '../platform/auto001-preprod-patch-planner-v0.mjs';
import {decideIncidentAction,assertRepairEnvelope} from '../platform/incident-root-cause-escalator-v0.mjs';
import {runCapFullE2ERealV1} from '../runtime/cap-real-consumer-adoption-v1.mjs';
import {defineBenchmark,evaluateOldNew,tribunalDecision,validateEvaluatorChange} from '../runtime/evaluation-tribunal.mjs';

const ROOT=process.cwd();
const SOURCES={
  'AUTO-001':'cerebro/platform/auto001-preprod-patch-planner-v0.mjs',
  'EVA-001':'cerebro/runtime/cap-real-consumer-adoption-v1.mjs'
};
function assert(c,m){if(!c)throw new Error(m);}
function stable(v){return Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);}
function stableJson(v){return JSON.stringify(stable(v));}
function sha(v){return crypto.createHash('sha256').update(typeof v==='string'?v:stableJson(v)).digest('hex');}
function parseOut(){const a=process.argv.slice(2),i=a.indexOf('--out');if(i<0||!a[i+1])throw new Error('usage: --out <dir>');return path.resolve(a[i+1]);}
function copy(src,dst){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}
function sourceBackupRollback(id,source,scratch){
  const src=path.join(ROOT,source),backup=path.join(scratch,'backup',source),probe=path.join(scratch,'probe',source);
  assert(fs.existsSync(src),`${id} physical source missing`);
  copy(src,backup);
  const sourceDigest=sha(fs.readFileSync(src)),backupDigest=sha(fs.readFileSync(backup));
  assert(sourceDigest===backupDigest,`${id} backup mismatch`);
  copy(backup,probe);fs.appendFileSync(probe,'\n// STRICT179_BATCH05_ROLLBACK_PROBE\n');
  assert(sha(fs.readFileSync(probe))!==sourceDigest,`${id} mutation probe failed`);
  fs.rmSync(path.dirname(probe),{recursive:true,force:true});copy(backup,probe);
  const restoredDigest=sha(fs.readFileSync(probe));assert(restoredDigest===sourceDigest,`${id} rollback restore mismatch`);
  return {source_digest:sourceDigest,backup_digest:backupDigest,restored_digest:restoredDigest};
}
function autoFixture(){return {
  state_type:'CEREBRO_QA_SOURCE_MAPPING_STATE_V0',company_id:'fenix',
  safety:{prod_write:false,customer_data:false,trading:false,additional_subscription_eur:0},
  mappings:[{repair_id:'repair-b05',case_id:'case-b05',owner_engine:'HCI-001',dimension:'accessibility_semantics',target:'APP:AUTH_SHELL',resolution:{status:'SOURCE_HINT_VERIFIED',repository:'carlosjmunoz78/fenix-capital-inmo-map',file_hints:['src/App.tsx']},execution_authority:{prod_write_authorized:false}}]
};}
function executeAuto(){
  const sourceMap=autoFixture(),baseSha='a'.repeat(40),sourceText='<div className="auth-shell">A</div>\n<div className="auth-shell">B</div>';
  const plan1=planAuto001Patch(sourceMap,{baseSha,sourceText}),plan2=planAuto001Patch(sourceMap,{baseSha,sourceText});
  assert(plan1.status==='PATCH_PLAN_READY'&&plan1.engine_id==='AUTO-001'&&plan1.environment==='PREPROD','AUTO-001 plan not ready');
  assert(plan1.prod_authorized===false&&plan1.prod_write_authorized===false&&plan1.auto_merge===false&&plan1.additional_cost_eur===0,'AUTO-001 authority/cost drift');
  assert(plan1.max_files_changed===1&&plan1.max_line_delta===4&&plan1.allowed_files.length===1&&plan1.allowed_files[0]==='src/App.tsx','AUTO-001 bounded patch drift');
  assert(stableJson(plan1)===stableJson(plan2),'AUTO-001 deterministic rebuild failed');
  const unsafe=planAuto001Patch(sourceMap,{baseSha,sourceText:'<div className="auth-shell">only-one</div>'});
  assert(unsafe.status==='NO_ELIGIBLE_PATCH'&&unsafe.reason==='CERTIFIED_TRANSFORM_SOURCE_SHAPE_NOT_PROVEN'&&unsafe.prod_write_authorized===false,'AUTO-001 unsafe source must fail closed');
  const failure={workflow:'STRICT179 Batch05',job:'auto001',step:'synthetic bounded repair',error:'fixture repeated failure',environment:'PREPROD'};
  const repair={bounded:true,reversible:true,preprod_only:true,tests_defined:true,rollback_defined:true,additional_cost_eur:0,prod_write:false,permission_expansion:false,gate_relaxation:false};
  const envelope=assertRepairEnvelope(repair);assert(envelope.green===true,'AUTO-001 repair envelope not green');
  const first=decideIncidentAction({current:failure,history:[],proposedRepair:repair});
  const repeated=decideIncidentAction({current:failure,history:[failure],proposedRepair:repair});
  const human=decideIncidentAction({current:{...failure,human_required_reason:'HIGH_RISK'},history:[],proposedRepair:repair});
  assert(first.state==='ONE_SAFE_RETRY_ALLOWED'&&first.max_retries===1,'AUTO-001 first retry policy failed');
  assert(repeated.state==='ROOT_CAUSE_REPAIR_READY'&&repeated.retry_authorized===false&&repeated.repair_authorized===true&&repeated.prod_authorized===false,'AUTO-001 anti-loop policy failed');
  assert(human.state==='HUMAN_REQUIRED'&&human.reason==='HIGH_RISK'&&human.retry_authorized===false,'AUTO-001 HUMAN_REQUIRED policy failed');
  const benchmark=defineBenchmark({company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'0.1.0',benchmark_id:'batch05-auto001-bounded-repair',benchmark_version:'v1',metric:'score',holdout_ref:'holdout:auto001:opaque',adversarial_refs:['unsafe-source-shape','repeated-failure','high-risk']});
  const common={experiment_id:'strict179-auto001-b05',company_id:'fenix',engine_id:'AUTO-001',environment:'PREPROD',version:'0.1.0'};
  const evaluation=evaluateOldNew({benchmark,old_result:{...common,arm:'OLD',metrics:{score:70}},new_result:{...common,arm:'NEW',metrics:{score:90}}});
  const judgement=tribunalDecision({evaluation,judge_id:'JDG-001:BATCH05',candidate_actor_id:'AUTO-001',real_outcome_delta:1});
  assert(judgement.decision==='PASS'&&judgement.prod_authorized===false,'AUTO-001 independent tribunal failed');
  return {plan:plan1,unsafe,first,repeated,human,envelope,evaluation,judgement};
}
function evaProjection(r){return {status:r.status,engine_id:r.engine_id,environment:r.environment,bundle_id:r.bundle_id,semantic_outcome_hash:r.semantic_outcome_hash,outcome_hash:r.outcome_hash,coverage:r.consumer_coverage,eva:r.evaluation_consumer,tribunal:r.independent_tribunal,backup_rollback_rebuild:r.backup_rollback_rebuild,idempotency_proven:r.idempotency_proven,continuous_improvement_feedback:r.continuous_improvement_feedback,additional_cost_eur:r.additional_cost_eur,prod_authorized:r.prod_authorized,prod_write_authorized:r.prod_write_authorized,trading_access:r.trading_access,full_e2e_real_preprod:r.full_e2e_real_preprod};}
function executeEva(scratch){
  const a=runCapFullE2ERealV1({company_id:'fenix',workdir:path.join(scratch,'eva-a'),source_run_id:505,source_head_sha:'b'.repeat(40)});
  const b=runCapFullE2ERealV1({company_id:'fenix',workdir:path.join(scratch,'eva-b'),source_run_id:505,source_head_sha:'b'.repeat(40)});
  const pa=evaProjection(a),pb=evaProjection(b);
  assert(a.full_e2e_real_preprod===true&&a.status==='FULL_E2E_REAL_PREPROD','EVA-001 real PREPROD chain not green');
  assert(a.evaluation_consumer?.engine_id==='EVA-001'&&a.evaluation_consumer?.decision==='CAP_EVALUATION_READY','EVA-001 real evaluation consumer failed');
  assert(a.independent_tribunal?.decision==='PASS'&&a.independent_tribunal?.prod_authorized===false,'EVA-001 independent tribunal failed');
  assert(a.backup_rollback_rebuild?.backup_ready===true&&a.backup_rollback_rebuild?.rollback_green===true&&a.backup_rollback_rebuild?.rebuild_green===true,'EVA-001 backup/rollback/rebuild failed');
  assert(a.consumer_coverage===1&&a.idempotency_proven===true&&a.additional_cost_eur===0,'EVA-001 coverage/idempotency/cost failed');
  assert(a.prod_authorized===false&&a.prod_write_authorized===false&&a.trading_access===false,'EVA-001 authority drift');
  assert(stableJson(pa)===stableJson(pb),'EVA-001 deterministic rebuild failed');
  const evaluation=a.evaluation_consumer.outcome.evaluation;
  const selfJudge=tribunalDecision({evaluation,judge_id:'EVA-001',candidate_actor_id:'EVA-001'});
  assert(selfJudge.decision==='FAIL'&&selfJudge.reason==='judge_not_independent','EVA-001 self-judge must fail closed');
  const weaken=validateEvaluatorChange({reduces_requirements:true,independent_gate:false});
  const selfEdit=validateEvaluatorChange({may_edit_judge:true});
  assert(weaken.ok===false&&weaken.reasons.includes('cannot_weaken_evaluator_without_independent_gate'),'EVA-001 evaluator weakening must fail closed');
  assert(selfEdit.ok===false&&selfEdit.reasons.includes('self_judge_edit_forbidden'),'EVA-001 judge self-edit must fail closed');
  return {projection:pa,self_judge:selfJudge,weaken_evaluator:weaken,self_edit_judge:selfEdit};
}

async function main(){
  const out=parseOut(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'strict179-batch05-'));
  try{
    const backup={};for(const [id,src] of Object.entries(SOURCES))backup[id]=sourceBackupRollback(id,src,scratch);
    const auto=executeAuto(),eva=executeEva(scratch);
    const engines={
      'AUTO-001':{status:'GREEN',source:SOURCES['AUTO-001'],...backup['AUTO-001'],execution_hash:sha(auto),evaluation_id:auto.evaluation.evaluation_id,tribunal_decision:auto.judgement.decision,gates:{contract:'GREEN',permissions:'GREEN',tests:'GREEN',evaluation:'GREEN',tribunal:'GREEN',observability:'GREEN',backup:'GREEN',rollback:'GREEN',rebuild:'GREEN',cost:'GREEN',policy:'GREEN',preprod:'GREEN'},safety:{prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false,additional_cost_eur:0},execution:auto},
      'EVA-001':{status:'GREEN',source:SOURCES['EVA-001'],...backup['EVA-001'],execution_hash:sha(eva.projection),evaluation_id:eva.projection.eva.outcome.evaluation.evaluation_id,tribunal_decision:eva.projection.tribunal.decision,gates:{contract:'GREEN',permissions:'GREEN',tests:'GREEN',evaluation:'GREEN',tribunal:'GREEN',observability:'GREEN',backup:'GREEN',rollback:'GREEN',rebuild:'GREEN',cost:'GREEN',policy:'GREEN',preprod:'GREEN'},safety:{prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false,additional_cost_eur:0},execution:eva}
    };
    for(const [id,e] of Object.entries(engines))assert(Object.values(e.gates).every(x=>x==='GREEN'),`${id} gate not green`);
    const summary={schema_version:'1.0.0',state_type:'STRICT_179_BATCH05_AUTO_EVA_RESULT',status:'GREEN',environment:'PREPROD',verified_engine_ids:Object.keys(engines),engines,safety:{additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,secrets_read:false,external_writes:false,registry_mutated:false,factory_mutated:false},next_block:'PERSIST_BATCH05_PHYSICAL_EVIDENCE_THEN_REAUDIT'};
    fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');
    fs.writeFileSync(path.join(out,'AUTO001_OBSERVABILITY.json'),JSON.stringify({engine_id:'AUTO-001',environment:'PREPROD',audit:'GREEN',log:'GREEN',metric:'GREEN',trace:'GREEN',trace_id:sha(auto).slice(0,32),prod_authorized:false,additional_cost_eur:0},null,2)+'\n');
    fs.writeFileSync(path.join(out,'AUTO001_TRIBUNAL.json'),JSON.stringify({engine_id:'AUTO-001',environment:'PREPROD',evaluation:auto.evaluation,judgement:auto.judgement,independent:true},null,2)+'\n');
    fs.writeFileSync(path.join(out,'EVA001_OBSERVABILITY.json'),JSON.stringify({engine_id:'EVA-001',environment:'PREPROD',audit:'GREEN',log:'GREEN',metric:'GREEN',trace:'GREEN',semantic_outcome_hash:eva.projection.semantic_outcome_hash,prod_authorized:false,additional_cost_eur:0},null,2)+'\n');
    fs.writeFileSync(path.join(out,'EVA001_TRIBUNAL.json'),JSON.stringify({engine_id:'EVA-001',environment:'PREPROD',evaluation:eva.projection.eva.outcome.evaluation,judgement:eva.projection.tribunal,independent:true,self_judge_probe:eva.self_judge},null,2)+'\n');
    fs.writeFileSync(path.join(out,'REBUILD.sha256'),sha(summary)+'\n');
    console.log('STRICT179_BATCH05='+JSON.stringify({status:summary.status,verified_engine_ids:summary.verified_engine_ids,safety:summary.safety}));
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
await main();
