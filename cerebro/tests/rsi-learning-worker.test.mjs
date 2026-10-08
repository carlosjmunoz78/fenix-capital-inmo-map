import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runLearningWorkerOnce} from '../runtime/rsi-learning-worker.mjs';

function temp(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-worker-'));return {dir,ledger:path.join(dir,'state','learning.v8')};}
function report(events){return {events};}
function lowEvent(id='evt-low'){return {event_id:id,event_type:'SKILL_CANDIDATE_STATIC_LAB_GREEN',candidate_id:`candidate:${id}`,company_id:'fenix',engine_id:'FACT-001',version:'0.1.0',reason:'STATIC_LAB_GREEN',evidence_ref:{source_ref:`source:${id}`},payload:{domain:'seo'},target_engine_bindings:['SEO-001']};}
function highEvent(id='evt-high'){return {event_id:id,event_type:'SECURITY_ADVISORY',candidate_id:`candidate:${id}`,company_id:'fenix',engine_id:'FACT-001',version:'0.1.0',severity:'HIGH',reason:'SECURITY_HIGH',evidence_ref:{source_ref:`source:${id}`},payload:{domain:'skills'}};}

test('worker persists LOW candidate, survives rerun idempotently and remains zero-cost/non-PROD',()=>{
  const {dir,ledger}=temp();
  try{
    const args={event_report:report([lowEvent()]),ledger_file:ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-08T12:00:00Z'};
    const first=runLearningWorkerOnce(args);
    assert.equal(first.status,'GREEN');
    assert.equal(first.persisted_total,1);
    assert.equal(first.ledger_operation_count,1);
    assert.equal(first.additional_cost_eur,0);
    assert.equal(first.prod_authorized,false);
    assert.equal(first.prod_write_authorized,false);
    assert.equal(first.trading_access,false);
    const second=runLearningWorkerOnce(args);
    assert.equal(second.persisted_total,0);
    assert.equal(second.duplicates_total,1);
    assert.equal(second.ledger_operation_count,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('worker automatically persists LOW and holds HIGH as canonical HUMAN_REQUIRED',()=>{
  const {dir,ledger}=temp();
  try{
    const result=runLearningWorkerOnce({event_report:report([lowEvent(),highEvent()]),ledger_file:ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-08T12:00:00Z'});
    assert.equal(result.status,'PARTIAL_HELD');
    assert.equal(result.persisted_total,1);
    assert.equal(result.held_total,1);
    assert.deepEqual(result.human_required,['HIGH_RISK']);
    assert.equal(result.prod_authorized,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('kill switch performs no persistence',()=>{
  const {dir,ledger}=temp();
  try{
    const result=runLearningWorkerOnce({event_report:report([lowEvent()]),ledger_file:ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,kill_switch:true});
    assert.equal(result.status,'KILLED');
    assert.equal(result.persisted_total,0);
    assert.equal(fs.existsSync(ledger),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('single-writer lock refuses concurrent ownership',()=>{
  const {dir,ledger}=temp();
  try{
    fs.mkdirSync(path.dirname(ledger),{recursive:true});
    fs.mkdirSync(`${ledger}.lock`);
    assert.throws(()=>runLearningWorkerOnce({event_report:report([lowEvent()]),ledger_file:ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true}),/single-writer lock/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('worker refuses any non-PREPROD execution context',()=>{
  const {dir,ledger}=temp();
  try{
    assert.throws(()=>runLearningWorkerOnce({event_report:report([lowEvent()]),ledger_file:ledger,preprod_version:'0.2.0',environment:'PROD',policy_pass:true,security_pass:true,local_persistence_enabled:true}),/exact PREPROD/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
