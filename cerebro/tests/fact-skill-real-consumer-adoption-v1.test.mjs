import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FACT_SKILL_NATIVE_ROUTE} from '../runtime/fact-skill-native-v1.mjs';
import {routeFactSkillNative} from '../runtime/fact-skill-native-router-v1.mjs';
import {buildFactSkillStrictFixture,consumeFactSkillOutputReal,runFactSkillFullE2ERealV1,FACT_SKILL_REAL_REQUIRED_CONSUMERS} from '../runtime/fact-skill-real-consumer-adoption-v1.mjs';

const HEAD='1'.repeat(40);
function workdir(label){return fs.mkdtempSync(path.join(os.tmpdir(),`fact-real-${label}-`));}
function producer(){
  const payload=buildFactSkillStrictFixture({company_id:'fenix'});
  return routeFactSkillNative({route:FACT_SKILL_NATIVE_ROUTE,payload,context:{gateway_authorized:true,environment:'PREPROD',company_id:'fenix',engine_id:'FACT-001'}});
}
function clone(value){return structuredClone(value);}
async function consume(receipt,label){return consumeFactSkillOutputReal({producer_receipt:receipt,workdir:workdir(label),source_run_id:123,source_head_sha:HEAD});}

test('FACT-SKILL-NATIVE is FULL E2E REAL only when every declared consumer functionally uses its output',async()=>{
  const report=await runFactSkillFullE2ERealV1({company_id:'fenix',workdir:workdir('happy'),source_run_id:123,source_head_sha:HEAD});
  assert.equal(report.status,'FULL_E2E_REAL_PREPROD');
  assert.equal(report.full_e2e_real_preprod,true);
  assert.equal(report.gateway_router_real,true);
  assert.equal(report.consumer_coverage,1);
  assert.equal(report.functional_consumer_coverage,1);
  assert.deepEqual(report.missing_consumers,[]);
  assert.deepEqual(report.failed_consumers,[]);
  assert.deepEqual(report.required_consumers,[...FACT_SKILL_REAL_REQUIRED_CONSUMERS]);
  assert.equal(report.consumers.length,7);
  assert.ok(report.consumers.every(item=>item.real_consumption===true&&item.fields_used.length>0&&item.outcome_hash));
  assert.equal(report.consumer_map['ROUTE-001'].decision,'BINDINGS_APPLIED');
  assert.equal(report.consumer_map['SEC-001'].decision,'SECURITY_APPROVED_PREPROD');
  assert.equal(report.consumer_map['QA-001'].decision,'QA_PASS');
  assert.equal(report.consumer_map['EVA-001'].decision,'TRIBUNAL_PASS');
  assert.equal(report.consumer_map['LRN-001'].decision,'LRN_FEEDBACK_PERSISTED');
  assert.equal(report.consumer_map['OBSERV-001'].decision,'OBSERVABILITY_RECORDED');
  assert.equal(report.consumer_map['FINOPS-001'].decision,'FINOPS_ZERO_COST_RECORDED');
  assert.equal(report.outcome.accepted,true);
  assert.equal(report.continuous_improvement_feedback,true);
  assert.equal(report.idempotency_proven,true);
  assert.equal(report.restartable,true);
  assert.equal(report.state_persisted,true);
  assert.equal(report.additional_cost_eur,0);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.android_touched,false);
});

test('persistent consumer state is restartable and rerun does not duplicate LRN, OBSERV or FINOPS evidence',async()=>{
  const root=workdir('restart');
  const one=await runFactSkillFullE2ERealV1({company_id:'fenix',workdir:root,source_run_id:123,source_head_sha:HEAD});
  const two=await runFactSkillFullE2ERealV1({company_id:'fenix',workdir:root,source_run_id:123,source_head_sha:HEAD});
  assert.equal(one.full_e2e_real_preprod,true);
  assert.equal(two.full_e2e_real_preprod,true);
  assert.equal(two.consumer_map['LRN-001'].outcome.first_created_total,0);
  assert.equal(two.consumer_map['LRN-001'].outcome.second_created_total,0);
  assert.equal(two.consumer_map['OBSERV-001'].outcome.records_for_correlation,1);
  assert.equal(two.consumer_map['FINOPS-001'].outcome.events,1);
  assert.equal(one.producer_idempotency_key,two.producer_idempotency_key);
  assert.equal(one.outcome_hash,two.outcome_hash);
});

test('ROUTE-001 proof is semantic: removing producer PREPROD authorization changes the consumer decision',async()=>{
  const broken=clone(producer());
  broken.promotion.preprod_registration_authorized=false;
  const report=await consume(broken,'route');
  assert.equal(report.consumer_map['ROUTE-001'].decision,'ROUTE_HOLD');
  assert.equal(report.consumer_map['ROUTE-001'].outcome.applied,false);
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('ROUTE-001'));
});

test('SEC-001 proof is semantic: permission-scope regression is consumed and denied',async()=>{
  const broken=clone(producer());
  broken.security.permission_scope_green=false;
  const report=await consume(broken,'sec');
  assert.equal(report.consumer_map['SEC-001'].decision,'SECURITY_DENIED');
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('SEC-001'));
});

test('QA-001 and EVA-001 consume producer gate outcome instead of trusting a binding receipt',async()=>{
  const broken=clone(producer());
  broken.native_full=false;
  broken.status='HOLD';
  broken.failed_gates=['permissions_policy'];
  broken.full_gates.permissions_policy=false;
  const report=await consume(broken,'qa-eva');
  assert.equal(report.consumer_map['QA-001'].decision,'QA_FAIL');
  assert.notEqual(report.consumer_map['EVA-001'].decision,'TRIBUNAL_PASS');
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('QA-001'));
  assert.ok(report.failed_consumers.includes('EVA-001'));
});

test('LRN-001 consumes the actual learning event and fails if producer feedback disappears',async()=>{
  const broken=clone(producer());
  broken.events=broken.events.filter(event=>event.type!=='skill.native.learning.feedback');
  const report=await consume(broken,'lrn');
  assert.equal(report.consumer_map['LRN-001'].decision,'LRN_FEEDBACK_INCOMPLETE');
  assert.equal(report.consumer_map['LRN-001'].outcome.localized_feedback_events,0);
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('LRN-001'));
});

test('OBSERV-001 consumes producer observability state and records the producer hash',async()=>{
  const broken=clone(producer());
  broken.observability.connected=false;
  const report=await consume(broken,'observ');
  assert.equal(report.consumer_map['OBSERV-001'].decision,'OBSERVABILITY_INCOMPLETE');
  assert.equal(report.consumer_map['OBSERV-001'].outcome.producer_hash,report.producer_receipt_hash);
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('OBSERV-001'));
});

test('FINOPS-001 consumes the real producer cost and blocks a non-zero cost regression',async()=>{
  const broken=clone(producer());
  broken.finops.additional_cost_eur=0.01;
  const report=await consume(broken,'finops');
  assert.equal(report.consumer_map['FINOPS-001'].decision,'FINOPS_COST_POLICY_FAIL');
  assert.equal(report.consumer_map['FINOPS-001'].outcome.cost_eur_micros,10000);
  assert.equal(report.additional_cost_eur,0.01);
  assert.equal(report.full_e2e_real_preprod,false);
  assert.ok(report.failed_consumers.includes('FINOPS-001'));
});
