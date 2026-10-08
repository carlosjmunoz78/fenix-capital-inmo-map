import test from 'node:test';
import assert from 'node:assert/strict';
import {cycleTelemetryEnvelope,loopGuard,externalChangeGate} from '../runtime/rsi-observability-adapter.mjs';

test('RSI telemetry targets current OBSERV/FINOPS authority without persisting or spending',()=>{
  const envelope=cycleTelemetryEnvelope({company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.1.0',cycle_id:'cycle-1',started_at:'2026-10-08T12:00:00Z',ended_at:'2026-10-08T12:01:00Z',cost_eur:0,candidates:4,useful_improvements:2,attempts:1});
  assert.equal(envelope.authority,'OBSERV-001/current-observability-audit-finops');
  assert.equal(envelope.observability_input.data.duration_ms,60000);
  assert.equal(envelope.observability_input.data.learning_yield,0.5);
  assert.equal(envelope.finops_input.cost_eur,0);
  assert.equal(envelope.persistent_write_authorized,false);
  assert.equal(envelope.prod_authorized,false);
  assert.throws(()=>cycleTelemetryEnvelope({company_id:'fenix',engine_id:'LRN-001',environment:'PROD',version:'0.1.0',cycle_id:'x',started_at:'2026-10-08T12:00:00Z',ended_at:'2026-10-08T12:01:00Z',cost_eur:0,candidates:1,useful_improvements:1,attempts:1}),/PREPROD/);
});

test('loop guard maps only security and money to canonical HUMAN_REQUIRED',()=>{
  const security=loopGuard({attempts:1,security_incident:true});
  assert.equal(security.allowed,false);
  assert.equal(security.human_required,'SECURITY_INCIDENT');
  const money=loopGuard({attempts:1,cost_eur:1,budget_eur:0});
  assert.equal(money.human_required,'MONEY_LIMIT');
  const runaway=loopGuard({attempts:4,max_attempts:3});
  assert.equal(runaway.human_required,null);
});

test('external change remains held until audit rollback policy security and PREPROD evidence are present',()=>{
  const held=externalChangeGate({auditable:true,reversible:true,policy_pass:true,security_pass:true,preprod_evidence:false});
  assert.equal(held.allowed,false);
  assert.ok(held.reasons.includes('PREPROD_EVIDENCE_REQUIRED'));
  const ready=externalChangeGate({auditable:true,reversible:true,policy_pass:true,security_pass:true,preprod_evidence:true});
  assert.equal(ready.allowed,true);
  assert.equal(ready.next_gate,'CURRENT_DOMAIN_AUTHORITY_REVIEW');
  assert.equal(ready.prod_write_authorized,false);
});
