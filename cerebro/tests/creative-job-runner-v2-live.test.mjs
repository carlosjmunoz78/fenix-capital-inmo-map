import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATIVE_JOB_RUNNER_V2_LIVE_CONTRACT } from '../runtime/creative-job-runner-v2-live.mjs';

test('live renderer is PREPROD-only candidate with rollback and no publish authority',()=>{
  const c=CREATIVE_JOB_RUNNER_V2_LIVE_CONTRACT;
  assert.equal(c.status,'PREPROD_CANDIDATE');
  assert.equal(c.mandatory_creative_tribunal,'CREATIVE_QUALITY_TRIBUNAL_V2');
  assert.equal(c.governed_live_action_sources,true);
  assert.equal(c.pexels_license_provenance,true);
  assert.equal(c.transparent_logo,true);
  assert.equal(c.multiple_layout_system,true);
  assert.equal(c.real_live_action,true);
  assert.equal(c.animated_overlay,true);
  assert.equal(c.neural_voice,true);
  assert.equal(c.procedural_music,true);
  assert.equal(c.audio_ducking,true);
  assert.equal(c.captions,true);
  assert.equal(c.live_action_ratio_analysis,true);
  assert.equal(c.rollback_runtime,'creative-job-runner-v1.mjs');
  assert.equal(c.publish_authorized,false);
  assert.equal(c.additional_cost_eur,0);
});
