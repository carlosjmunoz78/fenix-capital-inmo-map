import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildUniversalLearningEventReport,normalizeUniversalLearningSignal,UNIVERSAL_SIGNAL_TYPES} from '../runtime/universal-learning-ingress.mjs';
import {buildRsiShadowBridge} from '../skills/skill-rsi-shadow-bridge.mjs';
import {buildLearningOutbox} from '../runtime/rsi-event-outbox.mjs';
import {runLearningWorkerOnce} from '../runtime/rsi-learning-worker.mjs';

function base(type,overrides={}){
  return {
    signal_id:`sig-${type.toLowerCase()}`,
    signal_type:type,
    company_id:'fenix',
    engine_id:'TEST-001',
    source_environment:'PREPROD',
    version:'0.1.0',
    observed_at:'2026-10-08T20:00:00.000Z',
    severity:'LOW',
    reason:`synthetic ${type}`,
    evidence_refs:[`selfcheck:${type.toLowerCase()}`],
    payload:{synthetic:true},
    contains_customer_data:false,
    contains_secrets:false,
    additional_cost_eur:0,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    ...overrides
  };
}

test('universal ingress covers all canonical learning signal families and bridge emits valid generic learning records',()=>{
  const signals=UNIVERSAL_SIGNAL_TYPES.map((type,index)=>base(type,{signal_id:`sig-${index}-${type.toLowerCase()}`}));
  const report=buildUniversalLearningEventReport({signals});
  assert.equal(report.events_total,8);
  assert.equal(report.prod_authorized,false);
  assert.deepEqual(new Set(report.events.map(event=>event.source_type)),new Set(UNIVERSAL_SIGNAL_TYPES));
  const bridge=buildRsiShadowBridge(report,{observedAt:'2026-10-08T20:10:00.000Z'});
  assert.equal(bridge.bridge_status,'SHADOW_BRIDGE_GREEN');
  assert.equal(bridge.learning_candidates_valid,8);
  assert.equal(bridge.learning_candidates_invalid,0);
  for(const record of bridge.learning_candidates){
    assert.equal(record.company_id,'fenix');
    assert.equal(record.environment,'LAB');
    assert.equal(record.created_by,'cap:universal-learning-ingress');
    assert.ok(UNIVERSAL_SIGNAL_TYPES.includes(record.source_type));
    assert.ok(record.evidence_refs.length>=1);
  }
});

test('universal ingress is deterministic, observation-only, zero-cost and fail-closed for secrets/customer data/authority expansion',()=>{
  const signal=base('ENGINE_RESULT',{source_environment:'PROD'});
  const a=normalizeUniversalLearningSignal(signal);
  const b=normalizeUniversalLearningSignal(structuredClone(signal));
  assert.equal(a.event_id,b.event_id);
  assert.equal(a.source_environment,'PROD');
  assert.equal(a.environment,'PREPROD_CANDIDATE');
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.trading_access,false);
  assert.equal(a.additional_cost_eur,0);
  assert.throws(()=>normalizeUniversalLearningSignal({...signal,prod_authorized:true}),/AUTHORITY_EXPANSION/);
  assert.throws(()=>normalizeUniversalLearningSignal({...signal,contains_customer_data:true}),/CUSTOMER_DATA_FORBIDDEN/);
  assert.throws(()=>normalizeUniversalLearningSignal({...signal,contains_secrets:true}),/SECRETS_FORBIDDEN/);
  assert.throws(()=>normalizeUniversalLearningSignal({...signal,payload:{access_token:'x'}}),/FORBIDDEN_KEY/);
  assert.throws(()=>normalizeUniversalLearningSignal({...signal,additional_cost_eur:0.01}),/NONZERO_INCREMENTAL_COST/);
});

test('universal learning outbox preserves tenant isolation while GLOBAL_ONLY signals fan out explicitly',()=>{
  const report=buildUniversalLearningEventReport({signals:[
    base('ENGINE_ERROR',{signal_id:'tenant-only',company_id:'fenix'}),
    base('ENGINE_EVENT',{signal_id:'global-one',company_id:'GLOBAL_ONLY',engine_id:'FACT-001'})
  ]});
  const registry={
    engine_id:'LRN-001',environment:'PREPROD',prod_authorized:false,trading_access:false,
    subscribers:[
      {company_id:'fenix',enabled:true,environment:'PREPROD',version:'0.5.0',local_validation_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false},
      {company_id:'other',enabled:true,environment:'PREPROD',version:'0.5.0',local_validation_required:true,prod_authorized:false,prod_write_authorized:false,trading_access:false}
    ]
  };
  const outbox=buildLearningOutbox({event_report:report,subscriber_registry:registry,source:{workflow:'Universal selfcheck',run_id:1,head_sha:'a'.repeat(40)}});
  assert.equal(outbox.batches_total,2);
  const fenix=outbox.batches.find(batch=>batch.company_id==='fenix');
  const other=outbox.batches.find(batch=>batch.company_id==='other');
  assert.equal(fenix.events_total,2);
  assert.equal(other.events_total,1);
  assert.equal(other.events[0].origin_company_id,'GLOBAL_ONLY');
  assert.ok(fenix.events.some(event=>event.origin_company_id==='fenix'));
  assert.ok(fenix.events.some(event=>event.origin_company_id==='GLOBAL_ONLY'));
});

test('all universal signal families persist into LRN PREPROD and replay is idempotent',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-universal-ingress-'));
  try{
    const ledger=path.join(tmp,'learning.v8');
    const report=buildUniversalLearningEventReport({signals:UNIVERSAL_SIGNAL_TYPES.map((type,index)=>base(type,{signal_id:`persist-${index}-${type.toLowerCase()}`}))});
    const first=runLearningWorkerOnce({event_report:report,ledger_file:ledger,preprod_version:'0.5.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-08T20:20:00.000Z'});
    assert.equal(first.status,'GREEN');
    assert.equal(first.source_events_total,8);
    assert.equal(first.persisted_total,8);
    assert.equal(first.held_total,0);
    assert.deepEqual(first.human_required,[]);
    assert.equal(fs.existsSync(ledger),true);

    const second=runLearningWorkerOnce({event_report:report,ledger_file:ledger,preprod_version:'0.5.0',policy_pass:true,security_pass:true,local_persistence_enabled:true,observed_at:'2026-10-08T20:20:00.000Z'});
    assert.equal(second.status,'GREEN');
    assert.equal(second.persisted_total,0);
    assert.equal(second.duplicates_total,8);
    assert.equal(second.held_total,0);
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
