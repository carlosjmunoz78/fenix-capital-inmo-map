import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stableIdempotencyKey,validateCanonicalContext,validateLearningRecord,
  validateImprovementPackage,canPromote,checkpointContract,HUMAN_REQUIRED_CODES
} from '../runtime/continuous-improvement-contract.mjs';

const learningRecord={
  learning_id:'learn:test',company_id:'fenix',engine_id:'FACT-001',environment:'LAB',version:'0.1.0',
  source_event_ids:['evt:test'],source_type:'SKILL_SUPPLY_CHAIN',observed_at:'2026-10-08T12:00:00Z',
  hypothesis:'candidate may improve capability quality',expected_metric_delta:{metric:'capability_quality',direction:'HIGHER'},
  confidence:0.85,risk_class:'LOW',evidence_refs:['event:evt:test'],promotion_state:'CANDIDATE',
  created_by:'cap:skill-supply-chain',reason:'STATIC_LAB_GREEN',judge_decision:null
};

const improvementPackage={
  company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0',
  baseline_version:'current-main',candidate_version:'candidate-v1',scope:'engine',hypothesis:'candidate improves quality',
  affected_contracts:['FACT-001'],tests_before:{pass:true},tests_after:{pass:true},evaluation_before:{score:70},
  evaluation_after:{score:85},cost_before:{eur:0},cost_after:{eur:0},risks:[],rollback:{ref:'rollback:test'},
  rebuild:{ref:'rebuild:test'},judge:{id:'JDG-001',independent:true},promotion_decision:'PASS'
};

test('stable idempotency key is deep-key-order independent',()=>{
  assert.equal(stableIdempotencyKey({b:{z:2,a:1},a:1}),stableIdempotencyKey({a:1,b:{a:1,z:2}}));
});

test('canonical context requires multi-company identity and supports LAB/PREPROD/PROD as data contexts',()=>{
  assert.equal(validateCanonicalContext({company_id:'fenix',engine_id:'LRN-001',environment:'LAB',version:'0.1.0'}).ok,true);
  assert.equal(validateCanonicalContext({company_id:'fenix',engine_id:'LRN-001',environment:'PROD',version:'0.1.0'},{allowProd:false}).ok,false);
});

test('learning record preserves PR416 compatibility while failing closed on evidence',()=>{
  assert.equal(validateLearningRecord(learningRecord).ok,true);
  const bad=validateLearningRecord({...learningRecord,evidence_refs:[]});
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.includes('invalid:evidence_refs'));
});

test('HUMAN_REQUIRED accepts only the canonical eight exception codes',()=>{
  assert.equal(HUMAN_REQUIRED_CODES.length,8);
  const good=validateLearningRecord({...learningRecord,judge_decision:'HUMAN_REQUIRED',human_required:'HIGH_RISK'});
  const bad=validateLearningRecord({...learningRecord,judge_decision:'HUMAN_REQUIRED',human_required:'MANUAL_REVIEW'});
  assert.equal(good.ok,true);
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.includes('invalid:human_required'));
});

test('improvement package requires context, independent judge, rollback and rebuild',()=>{
  assert.equal(validateImprovementPackage(improvementPackage).ok,true);
  const bad=validateImprovementPackage({...improvementPackage,rebuild:{}});
  assert.equal(bad.ok,false);
  assert.ok(bad.errors.includes('rebuild_not_ready'));
});

test('promotion eligibility fails closed by default and never authorizes PROD write',()=>{
  const judged={...learningRecord,environment:'PREPROD',judge_decision:'PASS',promotion_state:'PREPROD'};
  const closed=canPromote({record:judged,improvementPackage});
  assert.equal(closed.ok,false);
  assert.equal(closed.prod_authorized,false);
  assert.equal(closed.prod_write_authorized,false);
  const eligible=canPromote({record:judged,improvementPackage,independentJudge:true,rollbackReady:true,rebuildReady:true,policyLocked:true});
  assert.equal(eligible.ok,true);
  assert.equal(eligible.next_gate,'PROMOTION_PIPELINE_REVIEW');
  assert.equal(eligible.prod_authorized,false);
});

test('checkpoint contract is deterministic and carries company engine environment version',()=>{
  const input={company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.1.0',cursor:'42',last_event_at:'2026-10-08T12:00:00Z'};
  const a=checkpointContract(input),b=checkpointContract(input);
  assert.equal(a.idempotency_key,b.idempotency_key);
  assert.equal(a.company_id,'fenix');
  assert.equal(a.engine_id,'LRN-001');
  assert.equal(a.environment,'PREPROD');
  assert.equal(a.version,'0.1.0');
});
