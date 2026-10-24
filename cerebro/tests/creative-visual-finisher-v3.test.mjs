import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATIVE_VISUAL_FINISHER_V3_CONTRACT } from '../runtime/creative-visual-finisher-v3.mjs';

test('visual finisher v3 is deterministic, zero-cost and non-publishing',()=>{
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.deterministic,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.scene_synced_accent_sweeps,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.transition_flashes,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.kinetic_brand_accents,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.audio_passthrough,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.duration_preserving,true);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.additional_cost_eur,0);
  assert.equal(CREATIVE_VISUAL_FINISHER_V3_CONTRACT.publish_authorized,false);
});
