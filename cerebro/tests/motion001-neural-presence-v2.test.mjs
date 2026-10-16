import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNeuralPresencePlan,buildNeuralRegionActivity,NEURAL_PRESENCE_PALETTE,phase1V2AcceptanceSummary} from '../runtime/motion001-neural-presence-v2.mjs';

test('V2 uses procedural presence and preserves zero-cost non-PROD boundary',()=>{
  const p=buildNeuralPresencePlan({company_id:'fenix',state:'PROCESSING'});
  assert.equal(p.engine_id,'MOTION-001');
  assert.equal(p.renderer,'SELF_CONTAINED_PROCEDURAL_PARTICLE_GRAPH');
  assert.equal(p.geometry,'EMERGENT_BRAIN_FROM_PARTICLE_DENSITY_AND_NEGATIVE_SPACE');
  assert.equal(p.node_budget,1250);
  assert.equal(p.additional_cost_eur,0);
  assert.equal(p.prod_authorized,false);
  assert.equal(p.prod_write_authorized,false);
  assert.equal(p.trading_access,false);
});

test('V2 palette is calm by default and explicitly rejects rainbow engine coding',()=>{
  assert.deepEqual(NEURAL_PRESENCE_PALETTE.base,['DEEP_NAVY_BLACK','ELECTRIC_BLUE','CYAN','WHITE']);
  assert.equal(NEURAL_PRESENCE_PALETTE.rainbow_per_engine,false);
});

test('HUMAN_REQUIRED and ERROR accents stay focal instead of recolouring the whole brain',()=>{
  const human=buildNeuralRegionActivity({state:'HUMAN_REQUIRED',region_id:'SUPERVISION_DECISION',intensity:.72,exception:true});
  const error=buildNeuralRegionActivity({state:'ERROR',region_id:'SECURITY_RESILIENCE',intensity:.55,exception:true});
  assert.equal(human.accent,'AMBER_FOCAL_ONLY');
  assert.equal(error.accent,'RED_FOCAL_ONLY');
  assert.equal(human.whole_brain_recolor,false);
  assert.equal(error.whole_brain_recolor,false);
  assert.equal(human.flashing,false);
  assert.equal(error.flashing,false);
});

test('reduced-motion removes rotation, breathing and travelling pulse demand',()=>{
  const p=buildNeuralPresencePlan({company_id:'fenix',state:'SPEAKING',reduced_motion:true});
  assert.equal(p.parameters.rotation,0);
  assert.equal(p.parameters.breathing,0);
  assert.equal(p.parameters.pulse,0);
  assert.ok(p.parameters.links<=.12);
});

test('conserve mode reduces node/resource budget without changing semantics',()=>{
  const p=buildNeuralPresencePlan({company_id:'fenix',state:'PROCESSING',device_class:'CONSERVE'});
  assert.equal(p.node_budget,650);
  assert.ok(p.parameters.density<=.58);
  assert.ok(p.parameters.links<=.12);
  assert.equal(p.state,'PROCESSING');
});

test('V2 refuses PROD and noncanonical HUMAN_REQUIRED reasons',()=>{
  assert.throws(()=>buildNeuralPresencePlan({company_id:'fenix',state:'IDLE',environment:'PROD'}),/refuses/);
  assert.throws(()=>buildNeuralPresencePlan({company_id:'fenix',state:'HUMAN_REQUIRED',human_required_reason:'OTHER'}),/noncanonical/);
  const p=buildNeuralPresencePlan({company_id:'fenix',state:'HUMAN_REQUIRED',human_required_reason:'LOW_CONFIDENCE'});
  assert.equal(p.human_required_reason,'LOW_CONFIDENCE');
});

test('V2 acceptance summary explicitly preserves Phase 1 V1 as OLD/fallback',()=>{
  const s=phase1V2AcceptanceSummary();
  assert.equal(s.preserves_phase1_v1_as_old_and_fallback,true);
  assert.equal(s.requirements.procedural_nodes,true);
  assert.equal(s.requirements.travelling_pulses,true);
  assert.equal(s.requirements.depth_projection,true);
  assert.equal(s.requirements.external_dependencies,0);
});
