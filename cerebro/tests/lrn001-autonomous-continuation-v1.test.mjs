import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMultiCompanyLrn001Continuation,lrn001PersistenceEnvelope,HUMAN_REQUIRED_CODES,LRN001_ACCEPTED_SIGNAL_TYPES} from '../multicompany/lrn001-autonomous-continuation-v1.mjs';

const activation=(company_id)=>({company_id,engine_id:'ENGACT-001',environment:'PREPROD',evidence_sha256:'a'.repeat(64),human_required_code:null,payload:{next_gate:'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED'},prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
const signal=(company_id,overrides={})=>({signal_id:`sig-${company_id}`,signal_type:'METRIC_OBSERVATION',company_id,engine_id:'SEO-001',source_environment:'PREPROD',version:'v1',observed_at:'2026-10-14T12:30:00Z',severity:'INFO',confidence:0.92,risk_class:'LOW',reason:'QUALITY_DELTA',metric:{name:'quality',direction:'HIGHER',measurement:'OLD_VS_NEW'},payload:{metric_value:1},contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,...overrides});
const evaluation=(overrides={})=>({old_score:0.71,new_score:0.84,hard_gates_green:true,tribunal_verdict:'NEW_BETTER',evaluation_ref:'eva:acme:1',tribunal_ref:'jdg:acme:1',rollback_ref:'rollback:acme:1',...overrides});

test('LRN-001 multi-company continuation reuses universal ingress and stays PREPROD-only',()=>{
  const result=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:evaluation()});
  assert.equal(result.engine_id,'LRN-001');
  assert.equal(result.environment,'PREPROD');
  assert.equal(result.continuation_state,'PREPROD_CONTINUATION_ELIGIBLE');
  assert.equal(result.candidate_action,'CONTINUE_PREPROD_LEARNING_CYCLE');
  assert.equal(result.next_gate,'MULTICOMPANY_PHYSICAL_E2E_ACCEPTANCE_REQUIRED');
  assert.equal(result.canonical_knowledge_write_authorized,false);
  assert.equal(result.publish_authorized,false);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.trading_access,false);
  assert.equal(result.additional_cost_eur,0);
});

test('tenant isolation rejects a mixed-company learning batch before evaluation',()=>{
  assert.throws(()=>buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme'),signal('beta',{signal_id:'sig-beta'})],evaluation:evaluation()}),/POLICY_CONFLICT:MIXED_COMPANY_LEARNING_BATCH/);
  assert.throws(()=>buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('beta'),signals:[signal('acme')]}),/POLICY_CONFLICT:ENGACT_SCOPE/);
});

test('raw conversation content and PII-shaped fields fail closed',()=>{
  assert.throws(()=>buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme',{payload:{transcript:'raw words'}})]}),/SECURITY_INCIDENT:RAW_OR_PII_FORBIDDEN/);
  assert.throws(()=>buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme',{payload:{email:'person@example.test'}})]}),/SECURITY_INCIDENT:RAW_OR_PII_FORBIDDEN/);
});

test('LOW_CONFIDENCE and HIGH_RISK become canonical HUMAN_REQUIRED without promotion',()=>{
  const low=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme',{confidence:0.4})],evaluation:evaluation()});
  assert.equal(low.continuation_state,'HUMAN_REQUIRED');
  assert.equal(low.human_required_code,'LOW_CONFIDENCE');
  assert.equal(low.next_gate,'MULTICOMPANY_LRN001_AUTONOMOUS_CONTINUATION_REQUIRED');
  const high=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme',{risk_class:'HIGH'})],evaluation:evaluation()});
  assert.equal(high.human_required_code,'HIGH_RISK');
  assert.ok(HUMAN_REQUIRED_CODES.includes(high.human_required_code));
});

test('OLD-vs-NEW and tribunal gates reject regression autonomously',()=>{
  const hard=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:evaluation({hard_gates_green:false})});
  assert.equal(hard.continuation_state,'REJECTED_BY_HARD_GATES');
  const oldBetter=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:evaluation({tribunal_verdict:'OLD_BETTER'})});
  assert.equal(oldBetter.continuation_state,'REJECTED_NOT_NEW_BETTER');
  const regression=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:evaluation({old_score:0.9,new_score:0.8})});
  assert.equal(regression.continuation_state,'REJECTED_SCORE_REGRESSION');
  for(const r of [hard,oldBetter,regression]){assert.equal(r.prod_authorized,false);assert.equal(r.canonical_knowledge_write_authorized,false);}
});

test('missing evaluation evidence stays pending, never silently promotes',()=>{
  const pending=buildMultiCompanyLrn001Continuation({company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:null});
  assert.equal(pending.continuation_state,'PENDING_CONTROLLED_EVALUATION');
  assert.equal(pending.human_required_code,null);
  assert.equal(pending.candidate_action,'RUN_OLD_VS_NEW_AND_TRIBUNAL');
});

test('receipt is deterministic, bounded and persists no raw learning payload',()=>{
  const input={company_id:'acme',evidence_at:'2026-10-14T12:31:00Z',activation:activation('acme'),signals:[signal('acme')],evaluation:evaluation()};
  const one=buildMultiCompanyLrn001Continuation(input);
  const two=buildMultiCompanyLrn001Continuation(input);
  assert.equal(one.result_sha256,two.result_sha256);
  assert.equal(one.event_digest,two.event_digest);
  const envelope=lrn001PersistenceEnvelope(one,{idempotency_key:'lrn:acme:cycle:1',recorded_by:'ci'});
  assert.equal(envelope.engine_id,'LRN-001');
  assert.equal(envelope.continuation_state,'PREPROD_CONTINUATION_ELIGIBLE');
  assert.equal(JSON.stringify(envelope).includes('metric_value'),false);
  assert.equal(envelope.prod_write_authorized,false);
  assert.equal(envelope.additional_cost_eur,0);
});

test('accepted signal family remains the existing universal learning surface',()=>{
  assert.deepEqual(LRN001_ACCEPTED_SIGNAL_TYPES,['ENGINE_RESULT','ENGINE_ERROR','ENGINE_EVENT','METRIC_OBSERVATION','COST_OBSERVATION','HUMAN_CORRECTION','TRIBUNAL_DECISION','OBSERVABILITY_ALERT']);
});
