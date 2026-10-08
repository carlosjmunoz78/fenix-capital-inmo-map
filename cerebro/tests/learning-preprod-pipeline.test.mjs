import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LearningLedgerV0} from '../runtime/learning-ledger.mjs';
import {preparePreprodLearningCandidate,persistPreparedCandidate,persistBridgeReportToPreprod} from '../runtime/learning-preprod-pipeline.mjs';

function shadow(risk_class='LOW',learning_id='learn:shadow-test'){return {
  learning_id,company_id:'fenix',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',
  source_event_ids:[`evt:${learning_id}`],source_type:'SKILL_SUPPLY_CHAIN',observed_at:'2026-10-08T12:00:00Z',
  hypothesis:'candidate may improve capability quality',expected_metric_delta:{metric:'quality',direction:'HIGHER'},confidence:0.85,risk_class,
  evidence_refs:[`event:${learning_id}`],promotion_state:'CANDIDATE',created_by:'cap:skill-supply-chain',reason:'STATIC_LAB_GREEN',judge_decision:null,
  persistent_publish_authorized:false,rsi_publish_authorized:false,prod_authorized:false,prod_write_authorized:false
};}

function tempFile(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-lrn-preprod-'));return {dir,file:path.join(dir,'learning.v8')};}

test('low-risk green shadow can be prepared only with explicit policy security and local persistence gates',()=>{
  const closed=preparePreprodLearningCandidate({shadow_record:shadow(),preprod_version:'0.2.0',bridge_status:'SHADOW_BRIDGE_GREEN'});
  assert.equal(closed.ok,false);
  assert.ok(closed.reasons.includes('POLICY_GATE'));
  const prepared=preparePreprodLearningCandidate({shadow_record:shadow(),preprod_version:'0.2.0',bridge_status:'SHADOW_BRIDGE_GREEN',policy_pass:true,security_pass:true,local_persistence_enabled:true});
  assert.equal(prepared.ok,true);
  assert.equal(prepared.candidate.environment,'PREPROD');
  assert.equal(prepared.candidate.persistent_publish_authorized,true);
  assert.equal(prepared.candidate.persistence_scope,'LOCAL_PREPROD_LRN_LEDGER_ONLY');
  assert.equal(prepared.candidate.rsi_publish_authorized,false);
  assert.equal(prepared.candidate.prod_authorized,false);
  assert.equal(Object.hasOwn(prepared.candidate,'source_version'),false);
});

test('stable deterministic learning payload remains backward-compatible with the durable ledger schema',()=>{
  const prepared=preparePreprodLearningCandidate({shadow_record:shadow('LOW','learn:legacy-compatible'),preprod_version:'0.2.0',bridge_status:'SHADOW_BRIDGE_GREEN',policy_pass:true,security_pass:true,local_persistence_enabled:true});
  assert.equal(prepared.ok,true);
  assert.equal(Object.hasOwn(prepared.candidate,'source_version'),false);
  assert.equal(prepared.candidate.version,'0.2.0');
  assert.equal(prepared.candidate.source_learning_id,'learn:legacy-compatible');
});

test('HIGH/CRITICAL risk produces canonical HUMAN_REQUIRED HIGH_RISK instead of automatic persistence',()=>{
  const held=preparePreprodLearningCandidate({shadow_record:shadow('HIGH'),preprod_version:'0.2.0',bridge_status:'SHADOW_BRIDGE_GREEN',policy_pass:true,security_pass:true,local_persistence_enabled:true});
  assert.equal(held.ok,false);
  assert.equal(held.human_required,'HIGH_RISK');
  assert.equal(held.candidate,null);
});

test('prepared candidate persists in local ledger and stays outside external RSI/PROD publication',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const prepared=preparePreprodLearningCandidate({shadow_record:shadow(),preprod_version:'0.2.0',bridge_status:'SHADOW_BRIDGE_GREEN',policy_pass:true,security_pass:true,local_persistence_enabled:true});
    const persisted=persistPreparedCandidate({prepared,ledger});
    assert.equal(persisted.accepted,true);
    assert.equal(persisted.next_gate,'EXPERIMENT_OR_EVALUATION');
    assert.equal(persisted.rsi_publish_authorized,false);
    assert.equal(persisted.prod_write_authorized,false);
    assert.equal(ledger.operation_count,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('bridge report automatically persists low-risk candidates and holds HIGH risk for human exception',()=>{
  const {dir,file}=tempFile();
  try{
    const ledger=new LearningLedgerV0({file_path:file});
    const bridge_report={bridge_status:'SHADOW_BRIDGE_GREEN',learning_candidates:[shadow('LOW','learn:low'),shadow('HIGH','learn:high')]};
    const result=persistBridgeReportToPreprod({bridge_report,ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true});
    assert.equal(result.persisted_total,1);
    assert.equal(result.held_total,1);
    assert.deepEqual(result.human_required,['HIGH_RISK']);
    assert.equal(result.prod_authorized,false);
    assert.equal(result.prod_write_authorized,false);
    assert.equal(ledger.operation_count,1);
    const duplicate=persistBridgeReportToPreprod({bridge_report:{bridge_status:'SHADOW_BRIDGE_GREEN',learning_candidates:[shadow('LOW','learn:low')]},ledger,preprod_version:'0.2.0',policy_pass:true,security_pass:true,local_persistence_enabled:true});
    assert.equal(duplicate.persisted_total,0);
    assert.equal(duplicate.duplicates_total,1);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
