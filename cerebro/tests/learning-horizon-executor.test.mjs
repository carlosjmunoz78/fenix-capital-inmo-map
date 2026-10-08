import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {persistDueLearningPlans} from '../runtime/learning-orchestrator.mjs';
import {executePendingLearningHorizons,executeLearningHorizonPlan} from '../runtime/learning-horizon-executor.mjs';
import {MetaObservabilityLedger,makeMetaTimingSample} from '../runtime/meta-observability-ledger.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-horizon-exec-'));}
function paths(root){return {state_file:path.join(root,'state.json'),plans_dir:path.join(root,'plans'),results_dir:path.join(root,'results'),ledger_file:path.join(root,'learning.v8'),receipts_dir:path.join(root,'receipts'),heartbeat_file:path.join(root,'heartbeat.json'),meta_metrics_file:path.join(root,'meta.v8')};}
function seedMeta(file,version='0.7.0'){
  const ledger=new MetaObservabilityLedger({file_path:file});
  for(let i=0;i<3;i++)ledger.append(makeMetaTimingSample({company_id:'fenix',version,observed_at:`2026-10-0${5+i}T12:00:00Z`,collect_ms:10+i,learn_ms:50+i,evaluate_ms:20+i,statuses:{learning:'GREEN'}}));
}

test('fresh due horizons execute from local evidence and never invent MetaLearn or Factory candidates without metrics',()=>{
  const root=temp();
  try{
    const p=paths(root);fs.mkdirSync(p.receipts_dir,{recursive:true});
    persistDueLearningPlans({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:30:00Z'});
    const result=executePendingLearningHorizons({...p,company_id:'fenix',version:'0.7.0',meta_metrics_file:null,now:'2026-10-08T14:31:00Z'});
    assert.equal(result.status,'HORIZON_EXECUTORS_GREEN');assert.equal(result.completed_total,3);assert.equal(result.prod_authorized,false);assert.equal(result.trading_access,false);
    const daily=result.completed.find(x=>x.cadence==='DAILY');const weekly=result.completed.find(x=>x.cadence==='WEEKLY');const monthly=result.completed.find(x=>x.cadence==='MONTHLY');
    assert.equal(daily.evidence.learning_records_total,0);assert.equal(daily.evidence.raw_customer_data_included,false);
    assert.equal(weekly.meta_candidate_generated,false);assert.equal(weekly.meta_review.status,'MORE_EVIDENCE');assert.equal(weekly.factory_candidate_generated,false);
    assert.equal(monthly.knowledge_mutations,0);assert.equal(monthly.evidence.knowledge_index_bound,false);
    const state=JSON.parse(fs.readFileSync(p.state_file,'utf8'));assert.ok(state.last_success.DAILY);assert.ok(state.last_success.WEEKLY);assert.ok(state.last_success.MONTHLY);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('weekly horizon creates only a held hypothesis when measured MetaLearn evidence is sufficient',()=>{
  const root=temp();
  try{
    const p=paths(root);fs.mkdirSync(p.receipts_dir,{recursive:true});seedMeta(p.meta_metrics_file);
    const planned=persistDueLearningPlans({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:30:00Z'});
    const weeklyPlan=planned.plans.find(x=>x.cadence==='WEEKLY');
    const result=executeLearningHorizonPlan({plan:weeklyPlan,company_id:'fenix',version:'0.7.0',ledger_file:p.ledger_file,receipts_dir:p.receipts_dir,heartbeat_file:p.heartbeat_file,meta_metrics_file:p.meta_metrics_file,results_dir:p.results_dir,now:'2026-10-08T14:31:00Z'});
    assert.equal(result.meta_candidate_generated,true);assert.equal(result.meta_review.status,'META_CANDIDATE_CREATED_HELD');assert.equal(result.meta_review.bottleneck.stage,'learn');assert.equal(result.meta_review.gate.ok,false);assert.equal(result.meta_review.automatic_promotion,false);assert.equal(result.meta_review.prod_authorized,false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('executor is idempotent after immutable results exist',()=>{
  const root=temp();
  try{
    const p=paths(root);fs.mkdirSync(p.receipts_dir,{recursive:true});persistDueLearningPlans({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:30:00Z'});
    const first=executePendingLearningHorizons({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:31:00Z'});const second=executePendingLearningHorizons({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:32:00Z'});
    assert.equal(first.completed_total,3);assert.equal(second.completed_total,0);assert.equal(second.skipped_total,3);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('executor rejects context drift and authority expansion',()=>{
  const root=temp();
  try{
    const p=paths(root);fs.mkdirSync(p.receipts_dir,{recursive:true});const planned=persistDueLearningPlans({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:30:00Z'});const plan=planned.plans[0];
    assert.throws(()=>executeLearningHorizonPlan({plan:{...plan,company_id:'other'},company_id:'fenix',version:'0.7.0',ledger_file:p.ledger_file,receipts_dir:p.receipts_dir,heartbeat_file:p.heartbeat_file,results_dir:p.results_dir,now:'2026-10-08T14:31:00Z'}),/CONTEXT_MISMATCH/);
    assert.throws(()=>executeLearningHorizonPlan({plan:{...plan,prod_authorized:true},company_id:'fenix',version:'0.7.0',ledger_file:p.ledger_file,receipts_dir:p.receipts_dir,heartbeat_file:p.heartbeat_file,results_dir:p.results_dir,now:'2026-10-08T14:31:00Z'}),/AUTHORITY_EXPANDED/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
