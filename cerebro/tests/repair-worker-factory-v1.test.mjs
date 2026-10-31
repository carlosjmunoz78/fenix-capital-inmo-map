import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepairWorkerRegistry, buildRepairWorkerBundle, writeRepairWorkerBundle } from '../factory/repair-worker-factory-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../..');
const PROFILES=path.join(ROOT,'cerebro/registry/certified-repair-worker-profiles.v1.json');
const ENGINES=path.join(ROOT,'cerebro/registry/engine-registry.v1.json');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));

test('FACT-001 repair worker factory accepts only canonical governed PREPROD repair profiles',()=>{
  const result=validateRepairWorkerRegistry(read(PROFILES),{engineRegistry:read(ENGINES),repoRoot:ROOT});
  assert.equal(result.valid,true);
  assert.equal(result.profile_count,1);
  assert.equal(result.new_engine_identity,false);
  assert.equal(result.repo_write_max_concurrency,1);
  assert.equal(result.additional_cost_eur,0);
  assert.equal(result.prod_authorized,false);
  assert.equal(result.trading_access,false);
  const p=result.profiles[0];
  assert.equal(p.profile_id,'AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1');
  assert.equal(p.engine_id,'AUTO-001');
  assert.equal(p.owner_engine_id,'HCI-001');
  assert.equal(p.target_engine_id,'APP-001');
  assert.equal(p.transform_id,'APP_AUTH_SHELL_ROLE_MAIN_V0');
  assert.deepEqual(p.allowed_files,['src/App.tsx']);
});

test('FACT-001 generated repair bundle is deterministic and remains descriptive, not dispatch authority',()=>{
  const registry=read(PROFILES), engines=read(ENGINES);
  const a=buildRepairWorkerBundle(registry,{engineRegistry:engines,repoRoot:ROOT});
  const b=buildRepairWorkerBundle(registry,{engineRegistry:engines,repoRoot:ROOT});
  assert.equal(a.bundle_sha256,b.bundle_sha256);
  assert.equal(a.worker_count,1);
  assert.equal(a.factory_may_dispatch,false);
  assert.equal(a.new_engine_identity,false);
  assert.equal(a.repo_write_max_concurrency,1);
  assert.equal(a.additional_cost_eur,0);
  assert.equal(a.prod_authorized,false);
  assert.equal(a.prod_write_authorized,false);
  assert.equal(a.trading_access,false);
  const worker=a.workers[0];
  assert.equal(worker.execution_binding.workflow_path,'.github/workflows/cerebro-auto001-preprod-patch-executor-v0.yml');
  assert.equal(worker.mutation_envelope.repo_write_concurrency,1);
  assert.equal(worker.authority.factory_may_dispatch,false);
  assert.equal(worker.authority.prod_authorized,false);
  assert.equal(worker.safety.paid_ai,false);
});

test('FACT-001 repair worker factory writes inspectable bounded bundle files',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-repair-worker-factory-'));
  try{
    const bundle=writeRepairWorkerBundle(read(PROFILES),dir,{engineRegistry:read(ENGINES),repoRoot:ROOT});
    const index=read(path.join(dir,'repair-worker-bundle.json'));
    const profile=read(path.join(dir,'profiles','AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1.json'));
    assert.equal(index.bundle_sha256,bundle.bundle_sha256);
    assert.equal(index.worker_count,1);
    assert.equal(profile.profile_id,'AUTO001_APP_HCI_AUTH_SHELL_ROLE_MAIN_V1');
    assert.equal(profile.authority.prod_write_authorized,false);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('FACT-001 repair worker factory fails closed on authority, concurrency or identity expansion',()=>{
  const engines=read(ENGINES);
  const unsafeProd=clone(read(PROFILES));unsafeProd.profiles[0].prod_authorized=true;
  assert.throws(()=>validateRepairWorkerRegistry(unsafeProd,{engineRegistry:engines,repoRoot:ROOT}),/unsafe prod_authorized/);
  const unsafeParallel=clone(read(PROFILES));unsafeParallel.profiles[0].repo_write_concurrency=2;
  assert.throws(()=>validateRepairWorkerRegistry(unsafeParallel,{engineRegistry:engines,repoRoot:ROOT}),/repository mutations must remain serial/);
  const unknown=clone(read(PROFILES));unknown.profiles[0].target_engine_id='NEW-999';
  assert.throws(()=>validateRepairWorkerRegistry(unknown,{engineRegistry:engines,repoRoot:ROOT}),/noncanonical target_engine_id/);
  const dispatch=clone(read(PROFILES));dispatch.profiles[0].factory_may_dispatch=true;
  assert.throws(()=>validateRepairWorkerRegistry(dispatch,{engineRegistry:engines,repoRoot:ROOT}),/FACT-001 may describe but not dispatch/);
});

test('FACT-001 repair worker factory rejects path-capable profile ids and duplicate contract values',()=>{
  const engines=read(ENGINES);
  const unsafeId=clone(read(PROFILES));unsafeId.profiles[0].profile_id='../ESCAPE';
  assert.throws(()=>validateRepairWorkerRegistry(unsafeId,{engineRegistry:engines,repoRoot:ROOT}),/unsafe profile_id/);
  const duplicateHuman=clone(read(PROFILES));duplicateHuman.policy.human_required_reasons[7]=duplicateHuman.policy.human_required_reasons[0];
  assert.throws(()=>validateRepairWorkerRegistry(duplicateHuman,{engineRegistry:engines,repoRoot:ROOT}),/HUMAN_REQUIRED contract drift/);
  const duplicateGate=clone(read(PROFILES));duplicateGate.profiles[0].required_gates[10]=duplicateGate.profiles[0].required_gates[0];
  assert.throws(()=>validateRepairWorkerRegistry(duplicateGate,{engineRegistry:engines,repoRoot:ROOT}),/required gates incomplete/);
  const duplicateAllowed=clone(read(PROFILES));duplicateAllowed.profiles[0].allowed_files=['src/App.tsx','src/App.tsx'];duplicateAllowed.profiles[0].max_files_changed=1;
  assert.throws(()=>validateRepairWorkerRegistry(duplicateAllowed,{engineRegistry:engines,repoRoot:ROOT}),/duplicate allowed_files/);
});
