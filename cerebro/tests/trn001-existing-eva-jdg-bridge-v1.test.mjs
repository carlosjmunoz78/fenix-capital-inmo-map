import test from 'node:test';
import assert from 'node:assert/strict';
import {Trn001TrainingLedgerV1} from '../runtime/foundation-holds-v1.mjs';
import {evaluateTrn001WithExistingTribunalV1 as evaluate} from '../runtime/trn001-existing-eva-jdg-bridge-v1.mjs';

const common={company_id:'fenix',engine_id:'KNW-001',dataset_id:'fixture-only',dataset_version:'v1',
 benchmark_id:'independent-holdout-fixture',benchmark_version:'v1',metric:'accuracy',version:'v1',
 champion_run_id:'old',challenger_run_id:'new',judge_id:'independent-judge',
 candidate_actor_id:'training-candidate',holdout_ref:'synthetic-holdout-not-candidate-visible'};
function fixture(){
 const ledger=new Trn001TrainingLedgerV1();
 ledger.registerDataset({company_id:common.company_id,engine_id:common.engine_id,dataset_id:common.dataset_id,
  version:'v1',cases:[{input:'synthetic',expected:'REFERENCE_ONLY'}],created_at:'2026-11-03T18:00:00Z'});
 for(const [run_id,accuracy] of [['old',0.5],['new',0.9]]){
  ledger.recordRun({company_id:common.company_id,engine_id:common.engine_id,dataset_id:common.dataset_id,
   dataset_version:'v1',run_id,candidate_version:run_id,metrics:{accuracy},created_at:'2026-11-03T18:00:00Z'});
 }
 return ledger;
}
test('existing EVA and JDG tribunal accepts metric comparison but not PROD promotion',()=>{
 const o=evaluate({...common,ledger:fixture()});
 assert.equal(o.tribunal.decision,'PASS');
 assert.equal(o.tribunal_passes,true);
 assert.equal(o.prod_authorized,false);
 assert.equal(o.auto_promote,false);
 assert.equal(o.judge_identity_physically_verified,false);
 assert.equal(o.next_gate,'INDEPENDENT_PHYSICAL_EVIDENCE_REQUIRED');
});
test('existing tribunal disqualifies same actor and judge',()=>{
 const o=evaluate({...common,ledger:fixture(),judge_id:'training-candidate'});
 assert.equal(o.tribunal.decision,'FAIL');assert.equal(o.prod_authorized,false);
});
test('existing evaluator rejects visible holdout',()=>{
 assert.throws(()=>evaluate({...common,ledger:fixture(),candidate_visible_holdout:true}),/holdout leakage detected/);
});
test('existing tribunal detects Goodhart on real outcome regression',()=>{
 const o=evaluate({...common,ledger:fixture(),real_outcome_delta:-0.2});
 assert.equal(o.tribunal.decision,'FAIL');
 assert.equal(o.tribunal.reason,'GOODHART_DETECTED');
});
test('does not authorize trading or cross company run access',()=>{
 assert.throws(()=>evaluate({...common,ledger:fixture(),engine_id:'LAB-TRD'}),/TRN001_TRADING_DENIED/);
 assert.throws(()=>evaluate({...common,ledger:fixture(),company_id:'another-company'}),/TRN001_RUN_NOT_FOUND/);
});
