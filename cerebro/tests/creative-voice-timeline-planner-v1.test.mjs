import test from 'node:test';
import assert from 'node:assert/strict';
import { planCreativeVoiceTimelineV1 } from '../runtime/creative-voice-timeline-planner-v1.mjs';

test('planner redistributes real TTS durations under the hard gap gate',()=>{
  const r=planCreativeVoiceTimelineV1({durations_sec:[8.4,8.7,8.1,8.5,8.6],total_sec:55,preferred_starts_sec:[.05,10.5,22,33,44.5]});
  assert.ok(r.max_gap_sec<=2.4);
  assert.ok(r.hook_start_sec<=1.2);
  assert.equal(r.starts_sec.length,5);
  assert.ok(r.end_margin_sec>=0);
});

test('planner stays deterministic and near preferred cadence when feasible',()=>{
  const input={durations_sec:[3.2,3.5,3.4],total_sec:17.2,preferred_starts_sec:[.05,6,11.5]};
  assert.deepEqual(planCreativeVoiceTimelineV1(input),planCreativeVoiceTimelineV1(input));
});

test('planner fails closed when there is too much dead air for the allowed block count',()=>{
  assert.throws(()=>planCreativeVoiceTimelineV1({durations_sec:[1,1,1],total_sec:20,max_gap_sec:2.4}),/VOICE_TIMELINE_TOO_SPARSE/);
});
