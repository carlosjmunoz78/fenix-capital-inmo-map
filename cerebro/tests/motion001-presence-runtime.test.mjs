import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeMotionSession,buildMotionLearningEvents,compareMotionVariants,presenceProfile,transitionPresence} from '../runtime/motion001-presence-runtime.mjs';

const sample=(overrides={})=>({company_id:'fenix',session_id:'s-1',variant:'CURRENT',occurred_at:'2026-10-10T15:00:00Z',state:'SPEAKING',input_to_visual_latency_ms:70,speech_visual_sync_error_ms:80,dropped_frames:1,total_frames:120,frame_time_p95_ms:18,cpu_budget_proxy:.3,battery_impact_proxy:.25,reduced_motion_requested:false,reduced_motion_complied:true,visual_state_recognized:true,preference_score:1,...overrides});

test('MOTION state machine uses only explicit CEREBRO presence states and no functional authority',()=>{
  const t=transitionPresence('IDLE','LISTENING');assert.equal(t.engine_id,'MOTION-001');assert.equal(t.environment,'PREPROD');assert.equal(t.profile.state,'LISTENING');assert.equal(t.profile.functionality_dependency,false);assert.equal(t.content_payload,null);assert.equal(t.secret_payload,null);assert.equal(t.prod_authorized,false);assert.equal(t.prod_write_authorized,false);assert.equal(t.trading_access,false);
});

test('MOTION HUMAN_REQUIRED accepts only canonical reasons',()=>{
  assert.throws(()=>transitionPresence('PROCESSING','HUMAN_REQUIRED',{human_required_reason:'OTHER'}),/noncanonical/);
  const t=transitionPresence('PROCESSING','HUMAN_REQUIRED',{human_required_reason:'LOW_CONFIDENCE'});assert.equal(t.human_required_reason,'LOW_CONFIDENCE');assert.equal(t.profile.attention,'REQUIRED');
});

test('MOTION reduced-motion removes continuous movement while preserving state semantics',()=>{
  const p=presenceProfile('SPEAKING',{reduced_motion:true,audio_level:.9});assert.equal(p.reduced_motion,true);assert.equal(p.css.scale,1);assert.equal(p.css.pulse_hz,0);assert.equal(p.css.orbit_hz,0);assert.equal(p.css.spectrum,0);assert.equal(p.css.particle_density,0);assert.equal(p.attention,'ACTIVE');assert.equal(p.rapid_flashing,false);assert.equal(p.functionality_dependency,false);
});

test('MOTION audio level changes speaking profile without exceeding bounded ranges',()=>{
  const low=presenceProfile('SPEAKING',{audio_level:0}),high=presenceProfile('SPEAKING',{audio_level:1});assert.ok(high.css.scale>low.css.scale);assert.ok(high.css.glow>=low.css.glow);assert.ok(high.css.spectrum>low.css.spectrum);assert.ok(high.css.pulse_hz>low.css.pulse_hz);
});

test('MOTION detects performance and accessibility regressions and produces candidates',()=>{
  const r=analyzeMotionSession([
    sample({occurred_at:'2026-10-10T15:00:00Z',input_to_visual_latency_ms:180,speech_visual_sync_error_ms:190,dropped_frames:12,total_frames:100,frame_time_p95_ms:30,cpu_budget_proxy:.8,battery_impact_proxy:.7,reduced_motion_requested:true,reduced_motion_complied:false,visual_state_recognized:false,preference_score:-2}),
    sample({occurred_at:'2026-10-10T15:00:01Z',input_to_visual_latency_ms:170,speech_visual_sync_error_ms:170,dropped_frames:10,total_frames:100,frame_time_p95_ms:29,cpu_budget_proxy:.75,battery_impact_proxy:.65,reduced_motion_requested:true,reduced_motion_complied:false,visual_state_recognized:false,preference_score:-1})
  ]);const codes=new Set(r.candidates.map(x=>x.code));for(const c of ['REDUCE_VISUAL_LATENCY','IMPROVE_AUDIO_SYNC','REDUCE_FRAME_DROPS','LOWER_FRAME_COST','ADAPT_RESOURCE_BUDGET','FIX_ACCESSIBILITY','CLARIFY_VISUAL_STATES','REJECT_CURRENT_MOTION'])assert.ok(codes.has(c));assert.equal(r.raw_content_persisted,false);
});

test('MOTION OLD vs NEW can nominate winner but cannot authorize promotion',()=>{
  const mk=(session,variant,bad)=>analyzeMotionSession(Array.from({length:5},(_,i)=>sample({session_id:session,variant,occurred_at:`2026-10-10T15:00:0${i}Z`,input_to_visual_latency_ms:bad?220:40,speech_visual_sync_error_ms:bad?250:45,dropped_frames:bad?12:0,total_frames:120,frame_time_p95_ms:bad?35:17,cpu_budget_proxy:bad?.85:.2,battery_impact_proxy:bad?.75:.15,preference_score:bad?-2:2})),{variant});
  const old=mk('old','OLD',true),next=mk('new','NEW',false),cmp=compareMotionVariants(old,next);assert.equal(cmp.sufficient_sample,true);assert.equal(cmp.decision,'NEW_WINS');assert.equal(cmp.promotion_authorized,false);assert.equal(cmp.requires_eva_001,true);assert.equal(cmp.requires_jdg_001,true);
});

test('MOTION emits only bounded PREPROD learning events',()=>{
  const report=analyzeMotionSession([sample()]);const out=buildMotionLearningEvents(report);assert.ok(out.events.length>=1);for(const e of out.events){assert.ok(['METRIC_OBSERVATION','ENGINE_EVENT'].includes(e.signal_family));assert.equal(e.environment,'PREPROD');assert.equal(e.prod_authorized,false);assert.equal(e.prod_write_authorized,false);assert.equal(e.trading_access,false);assert.equal(e.additional_cost_eur,0);}
});
