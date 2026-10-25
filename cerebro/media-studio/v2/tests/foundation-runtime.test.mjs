import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMediaMasterGraph,addSequence,addScene,addShot,countShots,assertIsolation } from '../runtime/media-master-graph.mjs';
import { createPod } from '../runtime/pod-factory.mjs';
import { evaluateIdentityRights } from '../runtime/rights-gate.mjs';
import { routeToolModel,assertNoSilentSpend } from '../runtime/tool-model-router.mjs';
import { generateDailyRoleQuestions,buildScoutBatch } from '../learning/learning-inbox.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));

test('Media Master Graph creates sequence scene shot and isolates tenant',()=>{
  const g=createMediaMasterGraph({company_id:'fenix',production_id:'P1'});
  const seq=addSequence(g); const scene=addScene(seq); addShot(scene);
  assert.equal(countShots(g),1);
  assert.equal(assertIsolation(g,{company_id:'fenix',production_id:'P1'}),true);
  assert.throws(()=>assertIsolation(g,{company_id:'other',production_id:'P1'}),/CROSS_COMPANY_DENY/);
});

test('Voice pod mounts voice department and voice consent guardian',()=>{
  const pod=createPod({pod_type:'VOICE',company_id:'fenix',production_id:'P1',objective:'authorized voice clone',capabilities:['authorized_voice_clone'],clone_job:{clone_type:'VOICE_CLONE'}});
  assert.ok(pod.roles.includes('D11'));
  assert.ok(pod.review.guardians.includes('GRD-03'));
  assert.equal(pod.lifecycle.ephemeral,true);
});

test('Real identity cloning fails closed without valid rights',()=>{
  assert.equal(evaluateIdentityRights({identity_type:'SYNTHETIC_ORIGINAL',clone_type:'VOICE_CLONE'}).decision,'PASS');
  assert.equal(evaluateIdentityRights({identity_type:'REAL_AUTHORIZED',clone_type:'VOICE_CLONE',rights_record:{}}).decision,'HUMAN_REQUIRED');
  assert.equal(evaluateIdentityRights({identity_type:'REAL_AUTHORIZED',clone_type:'VOICE_CLONE',rights_record:{status:'VALID',provenance_record:'PRV-1',revocation_process:'REV-1'}}).decision,'PASS');
});

test('Router prefers deterministic zero-cost candidate and enforces silent-spend guard',()=>{
  const result=routeToolModel({capability:'transcode',quality_target:80,cost_ceiling_eur:5,privacy:'NORMAL'},[
    {id:'paid',route_class:'paid_burst_authorized',enabled:true,license_ok:true,security_ok:true,quality_score:99,estimated_cost_eur:1},
    {id:'ffmpeg',route_class:'deterministic',enabled:true,license_ok:true,security_ok:true,quality_score:90,estimated_cost_eur:0,execution_location:'LOCAL'}
  ]);
  assert.equal(result.selected.id,'ffmpeg');
  assert.doesNotThrow(()=>assertNoSilentSpend(result,0));
});

test('Every role can generate a four-horizon daily learning batch',()=>{
  const q=generateDailyRoleQuestions({role_id:'D11-A03',department_id:'D11'});
  assert.equal(q.length,8);
  const b=buildScoutBatch(q);
  assert.ok(b.required_pipeline.includes('OLD_vs_NEW'));
  assert.ok(b.required_pipeline.includes('tribunal'));
});

test('Capability registry includes universal modalities and interoperability spine',()=>{
  const reg=json('registry/capability-registry.json');
  assert.ok(Object.keys(reg.universes).length>=13);
  assert.ok(reg.universes.VOICE_SPEECH.includes('authorized_voice_clone'));
  assert.ok(reg.universes.VIDEO.includes('scene_reconstruction'));
  assert.ok(reg.universes.VFX.includes('fire_smoke'));
  assert.ok(reg.interop_spine.includes('OpenUSD'));
  assert.ok(reg.interop_spine.includes('C2PA'));
  assert.ok(reg.surface_types.includes('HOLOGRAPHIC_DEVICE_STREAM'));
});

test('Core contracts exist and parse',()=>{
  for(const f of ['contracts/media-master-graph.schema.json','contracts/pod.schema.json','contracts/voice-profile.schema.json','contracts/effect-asset.schema.json','contracts/clone-job.schema.json','contracts/identity-character-rights.schema.json']) assert.doesNotThrow(()=>json(f),f);
});
