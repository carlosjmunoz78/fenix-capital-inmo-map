import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeInteractionSession,buildHciLearningEvents,compareInteractionVariants,normalizeInteractionEvent} from '../runtime/hci001-interaction-runtime.mjs';

const base=(overrides={})=>({company_id:'fenix',session_id:'s-1',event_id:`e-${Math.random()}`,occurred_at:'2026-10-10T15:00:00Z',event_type:'TURN_COMPLETED',channel:'TELEGRAM',modality:'VOICE',latency_ms:800,assistant_chars:500,user_chars:80,...overrides});

test('HCI event normalization stores metrics but never raw content or PROD authority',()=>{
  const e=normalizeInteractionEvent(base());assert.equal(e.engine_id,'HCI-001');assert.equal(e.environment,'PREPROD');assert.equal(e.contains_raw_content,false);assert.equal(e.sensitive_trait_inference,false);assert.equal(e.prod_authorized,false);assert.equal(e.prod_write_authorized,false);assert.equal(e.trading_access,false);assert.equal(e.additional_cost_eur,0);
});

test('HCI rejects mixed sessions and noncanonical HUMAN_REQUIRED reason',()=>{
  assert.throws(()=>analyzeInteractionSession([base(),base({session_id:'other'})]),/mixed session/);
  assert.throws(()=>normalizeInteractionEvent(base({reason_code:'HUMAN_REQUIRED:RANDOM_REASON'})),/noncanonical/);
});

test('HCI produces deterministic friction metrics and improvement candidates',()=>{
  const events=[
    base({event_id:'1',event_type:'TURN_COMPLETED'}),base({event_id:'2',event_type:'TURN_COMPLETED',occurred_at:'2026-10-10T15:00:02Z',assistant_chars:2200}),base({event_id:'3',event_type:'TURN_COMPLETED',occurred_at:'2026-10-10T15:00:04Z'}),
    base({event_id:'4',event_type:'CLARIFICATION',occurred_at:'2026-10-10T15:00:05Z'}),base({event_id:'5',event_type:'CORRECTION',occurred_at:'2026-10-10T15:00:06Z'}),base({event_id:'6',event_type:'REPETITION',occurred_at:'2026-10-10T15:00:07Z'}),base({event_id:'7',event_type:'EXPLICIT_FEEDBACK',occurred_at:'2026-10-10T15:00:08Z',preference_score:-2})
  ];
  const r=analyzeInteractionSession(events);assert.equal(r.sample.turns,3);assert.equal(r.metrics.clarification_rate,0.3333);assert.equal(r.metrics.correction_rate,0.3333);assert.equal(r.metrics.repetition_rate,0.3333);assert.ok(r.candidates.some(x=>x.code==='REDUCE_AMBIGUITY'));assert.ok(r.candidates.some(x=>x.code==='IMPROVE_CONFIRMATION'));assert.ok(r.candidates.some(x=>x.code==='REJECT_CURRENT_EXPERIENCE'));assert.equal(r.raw_content_persisted,false);
});

test('HCI OLD vs NEW never promotes directly and requires sufficient sample',()=>{
  const make=(sid,latency,feedback)=>analyzeInteractionSession([
    base({session_id:sid,event_id:`${sid}-1`,latency_ms:latency}),base({session_id:sid,event_id:`${sid}-2`,occurred_at:'2026-10-10T15:00:02Z',latency_ms:latency}),base({session_id:sid,event_id:`${sid}-3`,occurred_at:'2026-10-10T15:00:03Z',latency_ms:latency}),base({session_id:sid,event_id:`${sid}-4`,event_type:'TASK_COMPLETED',occurred_at:'2026-10-10T15:00:04Z',task_completed:true}),base({session_id:sid,event_id:`${sid}-5`,event_type:'EXPLICIT_FEEDBACK',occurred_at:'2026-10-10T15:00:05Z',preference_score:feedback})
  ],{variant:sid});
  const old=make('old',5000,-1),next=make('new',600,2);const cmp=compareInteractionVariants(old,next);assert.equal(cmp.sufficient_sample,true);assert.equal(cmp.decision,'NEW_WINS');assert.equal(cmp.promotion_authorized,false);assert.equal(cmp.requires_eva_001,true);assert.equal(cmp.requires_jdg_001,true);
});

test('HCI emits only bounded PREPROD learning events',()=>{
  const report=analyzeInteractionSession([base({event_id:'1'}),base({event_id:'2',event_type:'TASK_COMPLETED',occurred_at:'2026-10-10T15:00:02Z',task_completed:true})]);const out=buildHciLearningEvents(report);assert.ok(out.events.length>=1);for(const e of out.events){assert.ok(['METRIC_OBSERVATION','ENGINE_EVENT'].includes(e.signal_family));assert.equal(e.environment,'PREPROD');assert.equal(e.prod_authorized,false);assert.equal(e.prod_write_authorized,false);assert.equal(e.trading_access,false);assert.equal(e.additional_cost_eur,0);assert.equal(e.payload.raw_content_persisted??e.payload.candidate?.raw_content_persisted??false,false);}
});
