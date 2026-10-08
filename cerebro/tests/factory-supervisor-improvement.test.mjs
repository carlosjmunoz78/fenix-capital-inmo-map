import test from 'node:test';
import assert from 'node:assert/strict';
import {detectRepeatedFailurePattern,proposeFactoryVnext,ImprovementSupervisor} from '../runtime/factory-supervisor-improvement.mjs';

const pattern=()=>detectRepeatedFailurePattern({company_id:'fenix',environment:'LAB',version:'0.1.0',error_class:'CONTRACT_DRIFT',engine_ids:['SEO-001','LOCAL-SEO-001'],occurrences:3,evidence_refs:['e:1','e:2']});

test('factory pattern requires repeated cross-engine evidence',()=>{
  assert.equal(pattern().engine_id,'FACT-001');
  assert.throws(()=>detectRepeatedFailurePattern({company_id:'fenix',error_class:'x',engine_ids:['one'],occurrences:2,evidence_refs:['a','b']}),/cross-engine/);
});

test('factory vNext proposal never mutates existing engines or authorizes PROD',()=>{
  const c=proposeFactoryVnext({pattern:pattern(),current_scaffold_version:'1',candidate_scaffold_version:'2',new_contract_test:'contract-v2',fixture_engine_ids:['SEO-001'],rollback_ref:'rb:1',rebuild_ref:'rebuild:1'});
  assert.equal(c.mutate_existing_engines,false);
  assert.equal(c.prod_authorized,false);
  assert.equal(c.prod_write_authorized,false);
  assert.equal(c.next_gate,'OLD_VS_NEW_FIXTURE_EVALUATION');
});

test('supervisor is bounded, idempotent and cannot self-promote FACT-001',()=>{
  const s=new ImprovementSupervisor();
  const opened=s.open({candidate_id:'c1',evidence_ref:'e1',max_attempts:2});
  assert.equal(opened.accepted,true);
  assert.equal(s.open({candidate_id:'c1',evidence_ref:'e1',max_attempts:2}).duplicate,true);
  assert.equal(s.attempt('c1').attempts,1);
  assert.equal(s.attempt('c1').attempts,2);
  assert.equal(s.attempt('c1').state,'EXHAUSTED');
  assert.throws(()=>s.markJudged('c1',{pass:true,rollback_ref:'rb',rebuild_ref:'rebuild',independent_judge:false}),/independent judge/);
  const judged=s.markJudged('c1',{pass:true,rollback_ref:'rb',rebuild_ref:'rebuild',independent_judge:true});
  assert.equal(judged.eligible_for_external_promotion,true);
  assert.equal(judged.prod_authorized,false);
  assert.throws(()=>s.markPromoted('c1'),/current promotion authority/);
});
