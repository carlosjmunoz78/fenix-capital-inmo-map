import test from 'node:test';
import assert from 'node:assert/strict';
import {assessOnboarding} from '../hr/onboarding-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-003',environment:'PREPROD',version:'0.1.0'};
test('ready only when checklist complete',()=>{const r=assessOnboarding({context,authorized:true,confidence:.95,source_refs:['onb:1'],checklist:{identity_verified:true,accounts_planned:true,permissions_planned:true,training_complete:true,shadowing_complete:true}});assert.equal(r.status,'ONBOARDING_READY');assert.equal(r.readiness_score,1);assert.equal(r.account_creation_execute,false);});
test('missing items remain incomplete',()=>{const r=assessOnboarding({context,authorized:true,confidence:.95,source_refs:['onb:2'],checklist:{identity_verified:true}});assert.equal(r.status,'ONBOARDING_INCOMPLETE');assert.ok(r.missing.includes('training_complete'));});
test('OTP/CAPTCHA requires human policy gate',()=>{const r=assessOnboarding({context,authorized:true,confidence:.95,source_refs:['onb:3'],checklist:{requires_otp:true}});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');});
