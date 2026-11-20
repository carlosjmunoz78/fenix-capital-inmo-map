import test from 'node:test';
import assert from 'node:assert/strict';
import {routeCinematicShot,CINEMATIC_ROUTES} from '../runtime/cinematic-model-router-lab-v0.mjs';
const base={company_id:'fenix',request_id:'cinematic-test',prompt:'Original cinematic Andalusian architecture at sunset',estimated_remaining_budget_usd:10};
test('image default uses FLUX with no paid activation',()=>{
  const p=routeCinematicShot({...base,scene_type:'IMAGE_REFERENCE'});
  assert.equal(p.model_id,'black-forest-labs/flux-1.1-pro');
  assert.equal(p.execute_allowed,false);
});
test('routine uses economical Pruna Pro and hero uses Veo',()=>{
  const p=routeCinematicShot(base);
  const h=routeCinematicShot({...base,request_id:'hero-0001',scene_type:'VIDEO_HERO'});
  assert.equal(p.model_id,'prunaai/p-video-2-pro');
  assert.equal(p.input.mode,'cost');
  assert.equal(p.estimated_cost_usd,0.225);
  assert.equal(h.model_id,'google/veo-3.1-fast');
  assert.equal(h.input.generate_audio,false);
  assert.equal(h.estimated_cost_usd,0.8);
});
test('hero cannot be approved when budget insufficient',()=>{
  const p=routeCinematicShot({...base,estimated_remaining_budget_usd:0.2,scene_type:'VIDEO_HERO'});
  assert.equal(p.budget_fit,false);
  assert.equal(p.next_gate,'MONEY_LIMIT');
});
test('animation action uses Seedance with audio off; character uses Pruna quality',()=>{
  const a=routeCinematicShot({...base,scene_type:'VIDEO_ACTION'});
  const c=routeCinematicShot({...base,scene_type:'VIDEO_CHARACTER'});
  assert.equal(a.model_id,'bytedance/seedance-1.5-pro');
  assert.equal(a.input.generate_audio,false);
  assert.equal(c.input.mode,'quality');
  assert.equal(c.estimated_cost_usd,0.475);
});
test('continuity requires frame and does not use OpenAI',()=>{
  assert.throws(()=>routeCinematicShot({...base,scene_type:'IMAGE_CONTINUITY'}),/REFERENCE_REQUIRED/);
  const p=routeCinematicShot({...base,scene_type:'IMAGE_CONTINUITY',reference_image:'https://example.org/fenix.png'});
  assert.equal(p.model_id,'black-forest-labs/flux-kontext-pro');
  assert.equal(p.execute_allowed,false);
});
test('no unsupported model, aspect or invalid budget',()=>{
  assert.throws(()=>routeCinematicShot({...base,scene_type:'VIDEO_COPY_MARVEL'}),/SCENE_TYPE_DENIED/);
  assert.throws(()=>routeCinematicShot({...base,aspect_ratio:'8:1'}),/RATIO_DENIED/);
  assert.throws(()=>routeCinematicShot({...base,estimated_remaining_budget_usd:-1}),/BUDGET_INVALID/);
});
