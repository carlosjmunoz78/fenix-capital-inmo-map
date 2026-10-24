import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATIVE_JOB_RUNNER_V2_CONTRACT } from '../runtime/creative-job-runner-v2.mjs';

test('v2 renderer is quality-gated, motion-capable and non-publishing',()=>{
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.mandatory_creative_tribunal,'CREATIVE_QUALITY_TRIBUNAL_V2');
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.transparent_logo,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.multi_visual_broll,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.real_motion,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.transitions,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.audio_ducking,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.captions,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.physical_motion_analysis,true);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.rollback_runtime,'creative-job-runner-v1.mjs');
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.publish_authorized,false);
  assert.equal(CREATIVE_JOB_RUNNER_V2_CONTRACT.additional_cost_eur,0);
});
