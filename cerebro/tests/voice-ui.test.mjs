import test from 'node:test';import assert from 'node:assert/strict';import {planVoiceUi} from '../console/voice-ui.mjs';
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
test('VOICEUI-001 stays gateway-only and zero-cost',()=>{const r=planVoiceUi({context});assert.equal(r.status,'READY');assert.equal(r.gateway_required,true);assert.equal(r.direct_model_access,false);assert.equal(r.additional_cost_eur,0)});
test('VOICEUI-001 requires consent before recording',()=>{const r=planVoiceUi({context,recording:true,consent:false});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT')});
test('VOICEUI-001 allows consented recording metadata only',()=>{const r=planVoiceUi({context,recording:true,consent:true});assert.equal(r.recording_allowed,true);assert.equal(r.transcript_audit_required,true)});
test('VOICEUI-001 blocks direct model, spend and PROD',()=>{assert.equal(planVoiceUi({context,direct_model_access:true}).reason,'POLICY_CONFLICT');assert.equal(planVoiceUi({context,additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(planVoiceUi({context:{...context,environment:'PROD'}}).reason,'HIGH_RISK')});
