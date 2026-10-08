import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LearningLedgerV0,LEARNING_LEDGER_V0_CONTRACT} from '../runtime/learning-ledger.mjs';

function candidate(){return {
  learning_id:'learn-preprod:test',company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.2.0',
  source_event_ids:['evt:1'],source_type:'SKILL_SUPPLY_CHAIN',observed_at:'2026-10-08T12:00:00Z',
  hypothesis:'candidate may improve quality',expected_metric_delta:{metric:'quality',direction:'HIGHER'},confidence:0.8,risk_class:'LOW',
  evidence_refs:['e:1'],promotion_state:'CANDIDATE',created_by:'LRN-001',reason:'SHADOW_VALIDATED_FOR_LOCAL_PREPROD_PERSISTENCE',judge_decision:null,
  persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false
};}

function tempFile(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lrn-'));return {dir,file:path.join(dir,'learning.v8')};}

test('ledger is local PREPROD only, zero-cost and not Supabase-backed',()=>{
  assert.equal(LEARNING_LEDGER_V0_CONTRACT.environment,'PREPROD');
  assert.equal(LEARNING_LEDGER_V0_CONTRACT.supabase_required,false);
  assert.equal(LEARNING_LEDGER_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(LEARNING_LEDGER_V0_CONTRACT.prod_writes,false);
});

test('ledger persists, restarts, scopes and deduplicates identical learning records',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const first=ledger.persist(candidate());
    assert.equal(first.accepted,true);
    assert.equal(ledger.operation_count,1);
    const duplicate=ledger.persist(candidate());
    assert.equal(duplicate.accepted,false);
    assert.equal(duplicate.duplicate,true);
    assert.equal(ledger.operation_count,1);
    const reopened=new LearningLedgerV0({file_path:file});
    assert.equal(reopened.operation_count,1);
    assert.equal(reopened.listForContext({company_id:'fenix',engine_id:'LRN-001',version:'0.2.0'}).length,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('ledger rejects PROD, unauthorized persistence and learning_id payload conflicts',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    ledger.persist(candidate());
    assert.throws(()=>ledger.persist({...candidate(),hypothesis:'different payload'}),/learning_id conflict/);
    assert.throws(()=>ledger.persist({...candidate(),learning_id:'x',persistent_publish_authorized:false}),/persistence authorization/);
    assert.throws(()=>ledger.persist({...candidate(),learning_id:'y',environment:'PROD'}),/exact PREPROD/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
