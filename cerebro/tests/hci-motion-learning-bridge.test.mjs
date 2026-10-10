import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeInteractionSession} from '../runtime/hci001-interaction-runtime.mjs';
import {analyzeMotionSession} from '../runtime/motion001-presence-runtime.mjs';
import {buildHumanExperienceLearningReport} from '../runtime/hci-motion-learning-bridge.mjs';
import {buildLearningOutbox} from '../runtime/rsi-event-outbox.mjs';

const subscribers=JSON.parse(fs.readFileSync(new URL('../registry/rsi-learning-subscribers.v0.json',import.meta.url),'utf8'));

test('HCI/MOTION learning bridge emits privacy-minimized events accepted by LRN-001 outbox',()=>{
  const hci=analyzeInteractionSession([
    {company_id:'fenix',session_id:'h1',event_id:'h1-1',occurred_at:'2026-10-10T15:00:00Z',event_type:'TURN_COMPLETED',channel:'TELEGRAM',modality:'VOICE',latency_ms:800,assistant_chars:500,user_chars:50},
    {company_id:'fenix',session_id:'h1',event_id:'h1-2',occurred_at:'2026-10-10T15:00:01Z',event_type:'CLARIFICATION',channel:'TELEGRAM',modality:'VOICE'}
  ]);
  const motion=analyzeMotionSession([
    {company_id:'fenix',session_id:'m1',variant:'CURRENT',occurred_at:'2026-10-10T15:00:00Z',state:'SPEAKING',input_to_visual_latency_ms:70,speech_visual_sync_error_ms:80,dropped_frames:1,total_frames:120,frame_time_p95_ms:18,cpu_budget_proxy:.3,battery_impact_proxy:.2,reduced_motion_requested:false,reduced_motion_complied:true,visual_state_recognized:true,preference_score:1}
  ]);
  const report=buildHumanExperienceLearningReport({hci_reports:[hci],motion_reports:[motion]});
  assert.ok(report.events_total>=2);assert.equal(report.raw_content_persisted,false);assert.equal(report.sensitive_trait_inference,false);assert.equal(report.auto_promotion_authorized,false);assert.equal(report.prod_authorized,false);assert.equal(report.trading_access,false);
  const outbox=buildLearningOutbox({event_report:report,subscriber_registry:subscribers,source:{workflow:'HCI MOTION PREPROD TEST',run_id:1,head_sha:'0123456789abcdef0123456789abcdef01234567'}});
  assert.equal(outbox.batches_total,1);assert.equal(outbox.batches[0].company_id,'fenix');assert.equal(outbox.batches[0].engine_id,'LRN-001');assert.equal(outbox.batches[0].environment,'PREPROD');assert.equal(outbox.batches[0].prod_authorized,false);assert.equal(outbox.batches[0].trading_access,false);assert.equal(outbox.batches[0].events_total,report.events_total);
});
