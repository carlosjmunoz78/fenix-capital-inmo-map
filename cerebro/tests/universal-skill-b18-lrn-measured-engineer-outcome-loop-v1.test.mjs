import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {planAuto001Patch} from '../platform/auto001-preprod-patch-planner-v0.mjs';
import {measurePlannerOrderInvariance,decideNextEngineeringCycle,runB18MeasuredEngineerOutcomeLoop} from '../runtime/universal-skill-b18-lrn-measured-engineer-outcome-loop-v1.mjs';

const pendingSource='A <div className="auth-shell"> one </div> B <div className="auth-shell"> two </div>';
function stable(parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16)}
function oldOrderSensitivePlanner(sourceMap,{baseSha='UNKNOWN',sourceText=null}={}){
 const eligible=(sourceMap.mappings??[]).find(m=>m?.resolution?.status==='SOURCE_HINT_VERIFIED'&&m.resolution.repository==='carlosjmunoz78/fenix-capital-inmo-map'&&m.owner_engine==='HCI-001'&&m.dimension==='accessibility_semantics'&&String(m.target??'').startsWith('APP:')&&(m.resolution.file_hints??[]).includes('src/App.tsx')&&m.execution_authority?.prod_write_authorized===false);
 if(!eligible)return {status:'NO_ELIGIBLE_PATCH'};
 const pending=(sourceText?.match(/<div className="auth-shell">/g)??[]).length;if(pending!==2)return {status:'NO_ELIGIBLE_PATCH'};
 return {status:'PATCH_PLAN_READY',plan_id:`auto001:${stable([eligible.repair_id,eligible.case_id,eligible.dimension,'APP_AUTH_SHELL_ROLE_MAIN_V0',baseSha])}`,source_repair_id:eligible.repair_id,source_case_id:eligible.case_id,target:eligible.target};
}

test('B18 measurement exposes OLD order sensitivity and confirms NEW invariance',()=>{
 const oldResult=measurePlannerOrderInvariance(oldOrderSensitivePlanner,{baseSha:'oldsha'});
 const newResult=measurePlannerOrderInvariance(planAuto001Patch,{baseSha:'oldsha'});
 assert.equal(oldResult.score,0);
 assert.equal(oldResult.same_repair,false);
 assert.equal(newResult.score,1);
 assert.equal(newResult.same_repair,true);
 assert.equal(newResult.same_plan_id,true);
 assert.deepEqual(newResult.selected_repairs,['r-a','r-a']);
});

test('B18 next-cycle decision changes only when measured learning is supplied',()=>{
 const measurement={score:1};
 const withoutLearning=decideNextEngineeringCycle({measurement});
 const withLearning=decideNextEngineeringCycle({measurement,learning:{source_type:'METRIC_OBSERVATION',hypothesis:'Keep the deterministic certified-mapping selection while order_invariance_score remains at target; reopen engineering only on measured regression.'}});
 assert.equal(withoutLearning.decision,'REOPEN_DIAGNOSTIC');
 assert.equal(withLearning.decision,'KEEP_NEW_MONITOR');
 assert.equal(withLearning.learning_applied,true);
});

test('B18 composes real LRN persistence, Safe Engineering and independent OLD vs NEW tribunal in PREPROD',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-b18-'));
 try{
  const report=await runB18MeasuredEngineerOutcomeLoop({oldPlanner:oldOrderSensitivePlanner,newPlanner:planAuto001Patch,baselineSha:'f17fd6481c27d11df3442fb5764ba63c414bbfea',candidateSha:'b18-test-candidate-head',learningLedgerFile:path.join(dir,'learning.v8'),observedAt:'2026-10-18T00:00:00.000Z'});
  assert.equal(report.status,'B18_GREEN_PREPROD');
  assert.equal(report.old_measurement.score,0);
  assert.equal(report.new_measurement.score,1);
  assert.equal(report.learning_persist.accepted,true);
  assert.equal(report.engineering_plan.decision,'PASS_PREPROD_PLAN');
  assert.equal(report.safe_engineering_comparison.decision,'NEW_BETTER');
  assert.equal(report.tribunal.ok,true);
  assert.equal(report.tribunal.decision,'APPROVE_PREPROD_NEXT_STAGE');
  assert.equal(report.next_cycle.learning_persist.accepted,true);
  assert.equal(report.next_cycle.learning_changed_next_decision,true);
  assert.equal(report.next_cycle.with_learning.decision,'KEEP_NEW_MONITOR');
  assert.equal(report.learning_ledger_operations,2);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
