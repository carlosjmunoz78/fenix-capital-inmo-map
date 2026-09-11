import test from 'node:test';
import assert from 'node:assert/strict';
import {planVoiceCall} from '../communications/voice-engine.mjs';

const context={company_id:'fenix',engine_id:'VOICE-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,consent_confirmed:true,requires_prod_write:false,confidence:0.95,local_hour:11,contact_ref:'contact:demo',purpose:'follow_up',script_ref:'script:demo',language:'es-ES'};

test('VOICE-001 builds safe plan only',()=>{const r=planVoiceCall(base);assert.equal(r.status,'VOICE_PLAN_READY');assert.equal(r.mode,'PLAN_ONLY');assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.additional_cost_target_eur,0);});
test('VOICE-001 gates prod, auth, consent and confidence',()=>{assert.equal(planVoiceCall({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planVoiceCall({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(planVoiceCall({...base,consent_confirmed:false}).reason,'POLICY_CONFLICT');assert.equal(planVoiceCall({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('VOICE-001 respects quiet hours',()=>{const r=planVoiceCall({...base,local_hour:22});assert.equal(r.status,'DEFERRED');assert.equal(r.reason,'QUIET_HOURS');});
test('VOICE-001 requires recording consent',()=>{const r=planVoiceCall({...base,recording_requested:true,recording_consent_confirmed:false});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');});
test('VOICE-001 rejects unsafe environment and invalid duration',()=>{assert.throws(()=>planVoiceCall({...base,context:{...context,environment:'PROD'}}));assert.throws(()=>planVoiceCall({...base,max_duration_sec:5}));});
