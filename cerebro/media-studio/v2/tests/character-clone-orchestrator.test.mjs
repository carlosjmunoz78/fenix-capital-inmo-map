import test from 'node:test';
import assert from 'node:assert/strict';
import { planCharacterClone,assertCharacterCloneGoverned,mayBindPhysicalCharacterAdapter } from '../runtime/character-clone-orchestrator.mjs';

const base={
  company_id:'fenix',
  engine_id:'UMS-001',
  environment:'PREPROD',
  version:'0.1.0',
  character_id:'CHAR-SYN-001',
  provenance:{source_class:'CREATED_BY_CEREBRO',evidence_refs:['EV-001']}
};

test('Synthetic original persistent character reaches PREPROD benchmark planning without human exception',()=>{
  const plan=planCharacterClone({...base,identity_type:'SYNTHETIC_ORIGINAL'});
  assert.equal(plan.state,'READY_FOR_PREPROD_BENCHMARK');
  assert.equal(plan.rights_decision.decision,'PASS');
  assert.equal(plan.physical_execution.allowed,false);
  assert.ok(plan.required_roles.includes('D09'));
  assert.ok(plan.required_roles.includes('D10'));
  assert.ok(plan.required_roles.includes('D11'));
  assert.ok(plan.required_roles.includes('D12'));
  assert.ok(plan.required_guardians.includes('GRD-13'));
  assert.ok(plan.benchmark_requirements.includes('TEMPORAL_IDENTITY_DRIFT'));
});

test('Real person digital double fails closed without valid consent provenance and revocation',()=>{
  const input={...base,character_id:'CHAR-REAL-001',identity_type:'REAL_AUTHORIZED',rights:{status:'PENDING'}};
  const plan=planCharacterClone(input);
  assert.equal(plan.state,'HUMAN_REQUIRED');
  assert.equal(plan.rights_decision.code,'LEGAL_REQUIRED');
  assert.throws(()=>assertCharacterCloneGoverned(input),/HUMAN_REQUIRED:LEGAL_REQUIRED/);
});

test('Authorized real identity can be planned but still cannot bind physical adapters without evidence',()=>{
  const plan=assertCharacterCloneGoverned({...base,character_id:'CHAR-REAL-002',identity_type:'REAL_AUTHORIZED',rights:{status:'VALID',provenance_record:'PRV-2',revocation_process:'REV-2'}});
  assert.equal(plan.state,'READY_FOR_PREPROD_BENCHMARK');
  assert.deepEqual(mayBindPhysicalCharacterAdapter({plan}),{allowed:false,reason:'adapter_evidence_incomplete'});
});

test('Physical binding only passes with license security cost benchmark provenance and rollback evidence',()=>{
  const plan=assertCharacterCloneGoverned({...base,identity_type:'SYNTHETIC_ORIGINAL'});
  const adapterEvidence={license_status:'PASS',security_status:'PASS',measured_cost_eur:0};
  const benchmarkEvidence={status:'PASS',rollback_proven:true,provenance_complete:true};
  assert.deepEqual(mayBindPhysicalCharacterAdapter({plan,adapterEvidence,benchmarkEvidence}),{allowed:true,reason:'preprod_binding_gate_pass'});
});

test('Voice-only clone mounts voice rights and release controls without overmounting unrelated departments',()=>{
  const plan=planCharacterClone({...base,identity_type:'SYNTHETIC_ORIGINAL',components:['VOICE']});
  assert.deepEqual(plan.required_roles,['D09','D11']);
  assert.ok(plan.required_guardians.includes('GRD-03'));
  assert.ok(plan.required_guardians.includes('GRD-13'));
});

test('Provenance is mandatory for every persistent character',()=>{
  assert.throws(()=>planCharacterClone({...base,identity_type:'SYNTHETIC_ORIGINAL',provenance:{source_class:'CREATED_BY_CEREBRO',evidence_refs:[]}}),/PROVENANCE_REQUIRED/);
});
