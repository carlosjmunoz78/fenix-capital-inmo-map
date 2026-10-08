import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LearningLedgerV0} from '../runtime/learning-ledger.mjs';
import {buildVersionedImprovementCandidate,ImprovementCandidateLedgerV0,materializeImprovementCandidates,IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT} from '../runtime/improvement-candidate-factory.mjs';

function temp(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-rsi-candidate-'));return {dir,learning:path.join(dir,'learning.v8'),candidates:path.join(dir,'candidates.v8')};}
function learning({id='learn-preprod:1',company_id='fenix',engine_id='SEO-001',source_version='2.4.0',risk_class='LOW',confidence=0.85}={}){
  const record={
    learning_id:id,company_id,engine_id,environment:'PREPROD',version:'0.5.0',
    source_event_ids:[`evt:${id}`],source_type:'ENGINE_ERROR',observed_at:'2026-10-08T21:45:00.000Z',
    hypothesis:'Repeated timeout pattern should be reduced without weakening current contracts.',
    expected_metric_delta:{name:'failure_rate',direction:'LOWER',measurement:'CONTROLLED_OLD_VS_NEW'},confidence,risk_class,
    evidence_refs:[`evidence:${id}`],promotion_state:'CANDIDATE',created_by:'cap:universal-learning-ingress',reason:'ENGINE_ERROR',judge_decision:null,
    persistent_publish_authorized:true,persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',rsi_publish_authorized:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false
  };
  if(source_version) record.source_version=source_version;
  return record;
}

test('LOW/MEDIUM learning becomes deterministic versioned PREPROD improvement candidate',()=>{
  const first=buildVersionedImprovementCandidate(learning());
  const second=buildVersionedImprovementCandidate(learning());
  assert.equal(first.ok,true);assert.equal(second.ok,true);
  assert.equal(first.candidate.candidate_id,second.candidate.candidate_id);
  assert.equal(first.candidate.baseline_version,'2.4.0');
  assert.equal(first.candidate.baseline_version_source,'SOURCE_EVIDENCE_VERSION');
  assert.equal(first.candidate.baseline_verification_required,false);
  assert.match(first.candidate.candidate_version,/^2\.4\.0-rsi-cand\.[0-9a-f]{8}$/);
  assert.notEqual(first.candidate.baseline_version,first.candidate.candidate_version);
  assert.equal(first.candidate.next_gate,'OLD_VS_NEW_EXPERIMENT');
  assert.equal(first.candidate.experiment_contract.old_version,'2.4.0');
  assert.equal(first.candidate.experiment_contract.new_version,first.candidate.candidate_version);
  assert.equal(first.candidate.experiment_contract.baseline_resolution_required,false);
  assert.equal(first.candidate.preservation_contract.preserve_existing,true);
  assert.equal(first.candidate.preservation_contract.contract_resolution_required,true);
  assert.equal(first.candidate.prod_authorized,false);assert.equal(first.candidate.prod_write_authorized,false);assert.equal(first.candidate.trading_access,false);assert.equal(first.candidate.additional_cost_eur,0);
});

test('legacy learning without source version stays usable but forces exact OLD contract resolution before experiment',()=>{
  const legacy=buildVersionedImprovementCandidate(learning({id:'learn:legacy',source_version:null}));
  assert.equal(legacy.ok,true);
  assert.equal(legacy.candidate.baseline_version,'0.5.0');
  assert.equal(legacy.candidate.baseline_version_source,'LEARNING_CONTEXT_VERSION_REQUIRES_OLD_CONTRACT_RESOLUTION');
  assert.equal(legacy.candidate.baseline_verification_required,true);
  assert.equal(legacy.candidate.experiment_contract.baseline_resolution_required,true);
  assert.equal(legacy.candidate.preservation_contract.contract_resolution_required,true);
  assert.equal(legacy.candidate.next_gate,'OLD_VS_NEW_EXPERIMENT');
  assert.equal(legacy.candidate.prod_authorized,false);
});

test('HIGH/CRITICAL and LOW_CONFIDENCE remain canonical human exceptions',()=>{
  const high=buildVersionedImprovementCandidate(learning({risk_class:'HIGH'}));
  assert.equal(high.ok,false);assert.equal(high.human_required,'HIGH_RISK');assert.equal(high.candidate,null);
  const lowConfidence=buildVersionedImprovementCandidate(learning({confidence:0.40}));
  assert.equal(lowConfidence.ok,false);assert.equal(lowConfidence.human_required,'LOW_CONFIDENCE');assert.equal(lowConfidence.candidate,null);
});

test('candidate ledger is durable append-only and idempotent',()=>{
  const {dir,candidates}=temp();
  try{
    const candidate=buildVersionedImprovementCandidate(learning()).candidate;
    const ledger=new ImprovementCandidateLedgerV0({file_path:candidates});
    const first=ledger.persist(candidate);const duplicate=ledger.persist(candidate);
    assert.equal(first.accepted,true);assert.equal(duplicate.duplicate,true);assert.equal(ledger.operation_count,1);
    const reopened=new ImprovementCandidateLedgerV0({file_path:candidates});
    assert.equal(reopened.operation_count,1);assert.equal(reopened.list()[0].candidate_id,candidate.candidate_id);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('materializer converts tenant-local learning once, holds exceptions and never leaks another company',()=>{
  const {dir,learning:learningFile,candidates}=temp();
  try{
    const ledger=new LearningLedgerV0({file_path:learningFile});
    ledger.persist(learning({id:'learn:green'}));
    ledger.persist(learning({id:'learn:high',risk_class:'HIGH'}));
    ledger.persist(learning({id:'learn:other',company_id:'otherco'}));
    const first=materializeImprovementCandidates({learning_ledger_file:learningFile,candidate_ledger_file:candidates,company_id:'fenix'});
    assert.equal(first.persisted_total,1);assert.equal(first.held_total,1);assert.deepEqual(first.human_required,['HIGH_RISK']);assert.equal(first.skipped_cross_company,1);assert.equal(first.candidate_total,1);
    const second=materializeImprovementCandidates({learning_ledger_file:learningFile,candidate_ledger_file:candidates,company_id:'fenix'});
    assert.equal(second.persisted_total,0);assert.equal(second.duplicates_total,1);assert.equal(second.candidate_total,1);
    const candidateLedger=new ImprovementCandidateLedgerV0({file_path:candidates});
    assert.deepEqual([...new Set(candidateLedger.list().map(item=>item.company_id))],['fenix']);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('factory contract is zero-cost PREPROD only with no PROD or Trading authority',()=>{
  assert.equal(IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT.environment,'PREPROD');
  assert.equal(IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT.prod_writes,false);
  assert.equal(IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT.autonomous_prod,false);
  assert.equal(IMPROVEMENT_CANDIDATE_FACTORY_V0_CONTRACT.trading_access,false);
});
