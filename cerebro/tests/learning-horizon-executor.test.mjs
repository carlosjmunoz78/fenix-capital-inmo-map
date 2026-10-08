import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {persistDueLearningPlans} from '../runtime/learning-orchestrator.mjs';
import {executePendingLearningHorizons,executeLearningHorizonPlan} from '../runtime/learning-horizon-executor.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-horizon-exec-'));}
function paths(root){return {state_file:path.join(root,'state.json'),plans_dir:path.join(root,'plans'),results_dir:path.join(root,'results'),ledger_file:path.join(root,'learning.v8'),receipts_dir:path.join(root,'receipts'),heartbeat_file:path.join(root,'heartbeat.json')};}

test('fresh due horizons execute from local evidence and never invent MetaLearn or Factory candidates',()=>{
  const root=temp();
  try{
    const p=paths(root);fs.mkdirSync(p.receipts_dir,{recursive:true});
    persistDueLearningPlans({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:30:00Z'});
    const result=executePendingLearningHorizons({...p,company_id:'fenix',version:'0.7.0',now:'2026-10-08T14:31:00Z'});
    assert.equal(result.status,'HORIZON_EXECUTORS_GREEN');assert.equal(result.completed_total,3);assert.equal(result.prod_authorized,false);assert.equal(result.trading_access,false);
    const daily=result.completed.find(x=>x.cadence==='DAILY');const weekly=result.completed.find(x=>x.cadence==='WEEKLY');const monthly=result.completed.find(x=>x.cadence==='MONTHLY');
    assert.equal(daily.evidence.learning_records_total,0);assert.equal(daily.evidence.raw_customer_data_included,false);
    assert.equal(weekly.meta_candidate_generated,false);assert.match(weekly.meta_candidate_reason,/INSUFFICIENT|NO_VALIDATED/);assert.equal(weekly.factory_candidate_generated,false);
    assert.equal(monthly.knowledge_mutations,0);assert.equal(monthly.evidence.knowledge_index_bound,false);
    const state=JSON.parse(fs.readFileSync(p.state_file,'utf8'));assert.ok(state.last_success.DAILY);assert.ok(state.last_success.WEEKLY);assert.ok(state.last_success.MONTHLY);
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
