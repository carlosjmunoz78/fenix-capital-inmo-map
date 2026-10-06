import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeBehavioralEvidence} from '../skills/skill-independent-judge.mjs';

const arm=(kind,{compliance=100,correctness=100,violations=[]}={})=>({arm:kind,valid_json:true,constraint_compliance:compliance,task_correctness_proxy:correctness,policy_violations:violations,side_effect_count:0});
const complete=()=>({status:'PROXY_COMPLETE',calls_executed:6,synthetic_only:true,external_skill_code_executed:false,prod_authorized:false,results:[{package_id:'p1',candidate_id:'c1',status:'PROXY_COMPLETE',fixture_results:[1,2,3].map(i=>({fixture_id:`f${i}`,arms:[arm('BASELINE_PROXY'),arm('CANDIDATE_SKILL_PROXY')]}))}]});

test('complete clean paired evidence becomes green for tribunal review only',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:complete()});
  assert.equal(r.green,true);
  assert.equal(r.decision,'GREEN_FOR_TRIBUNAL_REVIEW');
  assert.equal(r.tribunal_satisfied,false);
  assert.equal(r.prod_authorized,false);
});

test('missing behavioral evidence fails closed',()=>{
  const r=judgeBehavioralEvidence({behavioralResults:null});
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('BEHAVIORAL_PROXY_NOT_COMPLETE'));
  assert.ok(r.blockers.includes('BEHAVIORAL_RESULTS_MISSING'));
});

test('policy violation or candidate regression blocks package',()=>{
  const b=complete();
  b.results[0].fixture_results[0].arms[1]=arm('CANDIDATE_SKILL_PROXY',{compliance:80,violations:['PROD_WRITE']});
  const r=judgeBehavioralEvidence({behavioralResults:b});
  assert.equal(r.green,false);
  assert.equal(r.packages[0].decision,'HOLD');
  assert.ok(r.packages[0].blockers.includes('CANDIDATE_POLICY_VIOLATION'));
  assert.ok(r.packages[0].blockers.includes('CANDIDATE_CONSTRAINT_REGRESSION'));
});

test('non synthetic or external skill execution is never judge-green',()=>{
  const b=complete();
  b.synthetic_only=false;
  b.external_skill_code_executed=true;
  const r=judgeBehavioralEvidence({behavioralResults:b});
  assert.equal(r.green,false);
  assert.ok(r.blockers.includes('NON_SYNTHETIC_EVIDENCE_FORBIDDEN'));
  assert.ok(r.blockers.includes('EXTERNAL_SKILL_CODE_EXECUTED'));
});
