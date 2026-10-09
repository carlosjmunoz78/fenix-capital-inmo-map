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
  assert.match(LEARNING_LEDGER_V0_CONTRACT.duplicate_policy,/FIRST_SEEN_IMMUTABLE/);
  assert.deepEqual(LEARNING_LEDGER_V0_CONTRACT.additive_provenance_fields,['signal_id','source_environment']);
  assert.equal(LEARNING_LEDGER_V0_CONTRACT.conflict_diagnostics,'FIELD_NAMES_AND_PRESENCE_ONLY_NO_PAYLOAD_VALUES');
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
    assert.equal(duplicate.semantic_duplicate,false);
    assert.equal(ledger.operation_count,1);
    const reopened=new LearningLedgerV0({file_path:file});
    assert.equal(reopened.operation_count,1);
    assert.equal(reopened.listForContext({company_id:'fenix',engine_id:'LRN-001',version:'0.2.0'}).length,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('same deterministic learning re-observed later is an idempotent semantic duplicate and preserves first-seen evidence',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const first=ledger.persist(candidate());
    const later=ledger.persist({...candidate(),observed_at:'2026-10-08T22:10:00Z'});
    assert.equal(later.accepted,false);
    assert.equal(later.duplicate,true);
    assert.equal(later.semantic_duplicate,true);
    assert.deepEqual(later.compatibility_fields,['observed_at']);
    assert.equal(later.preserved_observed_at,'2026-10-08T12:00:00Z');
    assert.equal(later.record_hash,first.record_hash);
    assert.equal(ledger.operation_count,1);
    assert.equal(ledger.list()[0].observed_at,'2026-10-08T12:00:00Z');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('legacy record accepts additive signal/source-environment provenance while preserving immutable first-seen payload',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const first=ledger.persist(candidate());
    const enriched=ledger.persist({...candidate(),observed_at:'2026-10-08T22:10:00Z',signal_id:'evt:source:1',source_environment:'PREPROD_CANDIDATE'});
    assert.equal(enriched.accepted,false);
    assert.equal(enriched.duplicate,true);
    assert.equal(enriched.semantic_duplicate,true);
    assert.deepEqual(enriched.compatibility_fields,['observed_at','signal_id','source_environment']);
    assert.equal(enriched.record_hash,first.record_hash);
    assert.equal(ledger.operation_count,1);
    const stored=ledger.list()[0];
    assert.equal(stored.observed_at,'2026-10-08T12:00:00Z');
    assert.equal(Object.hasOwn(stored,'signal_id'),false);
    assert.equal(Object.hasOwn(stored,'source_environment'),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('legacy replay may omit provenance added to first-seen record without mutating or weakening it',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const enriched={...candidate(),signal_id:'evt:source:1',source_environment:'PREPROD_CANDIDATE'};
    const first=ledger.persist(enriched);
    const replay=ledger.persist({...candidate(),observed_at:'2026-10-08T22:10:00Z'});
    assert.equal(replay.accepted,false);
    assert.equal(replay.duplicate,true);
    assert.equal(replay.semantic_duplicate,true);
    assert.deepEqual(replay.compatibility_fields,['observed_at','signal_id','source_environment']);
    assert.equal(replay.record_hash,first.record_hash);
    assert.equal(ledger.operation_count,1);
    const stored=ledger.list()[0];
    assert.equal(stored.signal_id,'evt:source:1');
    assert.equal(stored.source_environment,'PREPROD_CANDIDATE');
    assert.equal(stored.observed_at,'2026-10-08T12:00:00Z');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('ledger still rejects genuine same-ID payload conflicts and never masks changed evidence, policy, or existing provenance',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    ledger.persist(candidate());
    assert.throws(()=>ledger.persist({...candidate(),hypothesis:'different payload'}),/learning_id conflict/);
    assert.throws(()=>ledger.persist({...candidate(),observed_at:'2026-10-08T22:10:00Z',evidence_refs:['e:changed']}),/learning_id conflict/);
    assert.throws(()=>ledger.persist({...candidate(),observed_at:'2026-10-08T22:10:00Z',risk_class:'MEDIUM'}),/learning_id conflict/);
    assert.throws(()=>ledger.persist({...candidate(),learning_id:'x',persistent_publish_authorized:false}),/persistence authorization/);
    assert.throws(()=>ledger.persist({...candidate(),learning_id:'y',environment:'PROD'}),/exact PREPROD/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('conflict diagnostics expose sorted field names only and never payload values',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    ledger.persist(candidate());
    const secretHypothesis='SENSITIVE_VALUE_MUST_NOT_APPEAR';
    const secretEvidence='PRIVATE_EVIDENCE_VALUE_MUST_NOT_APPEAR';
    let error;
    try{
      ledger.persist({...candidate(),hypothesis:secretHypothesis,evidence_refs:[secretEvidence]});
    }catch(caught){error=caught;}
    assert.ok(error instanceof Error);
    assert.equal(error.message,'learning_id conflict with different payload fields:evidence_refs,hypothesis');
    assert.equal(error.message.includes(secretHypothesis),false);
    assert.equal(error.message.includes(secretEvidence),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('conflict diagnostics distinguish missing-vs-present optional fields without exposing values',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const stored={...candidate(),candidate_id:null};
    ledger.persist(stored);
    const incoming={...candidate(),observed_at:'2026-10-08T22:10:00Z'};
    let error;
    try{ledger.persist(incoming);}catch(caught){error=caught;}
    assert.ok(error instanceof Error);
    assert.equal(error.message,'learning_id conflict with different payload fields:candidate_id#presence,observed_at');
    assert.equal(error.message.includes('null'),false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('once nonempty provenance exists, changing its value still fails closed',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const enriched={...candidate(),signal_id:'evt:source:1',source_environment:'PREPROD_CANDIDATE'};
    ledger.persist(enriched);
    assert.throws(()=>ledger.persist({...enriched,observed_at:'2026-10-08T22:10:00Z',signal_id:'evt:source:2'}),/learning_id conflict/);
    assert.throws(()=>ledger.persist({...enriched,observed_at:'2026-10-08T22:10:00Z',source_environment:'LAB'}),/learning_id conflict/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
