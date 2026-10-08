import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {initialOrchestratorState,planLearningHorizons,persistDueLearningPlans,recordLearningHorizonResult} from '../runtime/learning-orchestrator.mjs';

function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lrn-orch-'));}

test('fresh PREPROD state plans DAILY WEEKLY MONTHLY with zero cost and no PROD',()=>{
  const state=initialOrchestratorState({company_id:'fenix',version:'0.6.0'});
  const plan=planLearningHorizons({company_id:'fenix',version:'0.6.0',now:'2026-10-08T14:30:00Z',state});
  assert.equal(plan.due_total,3);assert.deepEqual(plan.due.map(x=>x.cadence),['DAILY','WEEKLY','MONTHLY']);
  for(const item of plan.due){assert.equal(item.environment,'PREPROD');assert.equal(item.budget_eur,0);assert.equal(item.prod_authorized,false);assert.equal(item.trading_access,false);assert.ok(item.task);}
  assert.equal(plan.event_path,'DIRECT_OUTBOX_TO_LRN');
});

test('persisting due plans is immutable/idempotent',()=>{
  const root=temp();
  try{
    const args={state_file:path.join(root,'state.json'),plans_dir:path.join(root,'plans'),company_id:'fenix',version:'0.6.0',now:'2026-10-08T14:30:00Z'};
    const first=persistDueLearningPlans(args);assert.equal(first.created_total,3);assert.equal(fs.readdirSync(args.plans_dir).length,3);
    const second=persistDueLearningPlans(args);assert.equal(second.created_total,0);assert.equal(fs.readdirSync(args.plans_dir).length,3);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('successful horizon result advances only its own clock and suppresses not-yet-due rerun',()=>{
  const root=temp();
  try{
    const stateFile=path.join(root,'state.json'),plansDir=path.join(root,'plans');
    persistDueLearningPlans({state_file:stateFile,plans_dir:plansDir,company_id:'fenix',version:'0.6.0',now:'2026-10-08T00:00:00Z'});
    recordLearningHorizonResult({state_file:stateFile,company_id:'fenix',version:'0.6.0',cadence:'DAILY',status:'GREEN',completed_at:'2026-10-08T00:10:00Z'});
    const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    const plan=planLearningHorizons({company_id:'fenix',version:'0.6.0',now:'2026-10-08T12:00:00Z',state});
    assert.equal(plan.due.some(x=>x.cadence==='DAILY'),false);assert.equal(plan.due.some(x=>x.cadence==='WEEKLY'),true);assert.equal(plan.due.some(x=>x.cadence==='MONTHLY'),true);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed horizon cannot advance scheduler state',()=>{
  const root=temp();
  try{
    const stateFile=path.join(root,'state.json');persistDueLearningPlans({state_file:stateFile,plans_dir:path.join(root,'plans'),company_id:'fenix',version:'0.6.0',now:'2026-10-08T00:00:00Z'});
    assert.throws(()=>recordLearningHorizonResult({state_file:stateFile,company_id:'fenix',version:'0.6.0',cadence:'DAILY',status:'ERROR',completed_at:'2026-10-08T00:10:00Z'}),/only successful/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('state context or authority drift fails closed',()=>{
  const root=temp();
  try{
    const stateFile=path.join(root,'state.json');fs.writeFileSync(stateFile,JSON.stringify({...initialOrchestratorState({company_id:'fenix',version:'0.6.0'}),prod_authorized:true}));
    assert.throws(()=>persistDueLearningPlans({state_file:stateFile,plans_dir:path.join(root,'plans'),company_id:'fenix',version:'0.6.0',now:'2026-10-08T00:00:00Z'}),/AUTHORITY_EXPANDED/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
