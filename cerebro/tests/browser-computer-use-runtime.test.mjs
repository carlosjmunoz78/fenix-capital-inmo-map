import test from 'node:test';import assert from 'node:assert/strict';import {planBrowserComputerUse} from '../connectors/browser-computer-use-runtime.mjs';
const base={context:{company_id:'fenix',identity_id:'id-1',account_id:'acc-1',environment:'LAB',version:'0.1.0'},request_id:'r1',provider:'linkedin',profile_id:'profile-1',action:'read_profile',api_or_connector_available:false,bypass_captcha:false,bypass_mfa:false,evade_platform_controls:false,human_presence_required:false,estimated_additional_cost_eur:0};
test('plans controlled browser fallback in LAB',()=>{const r=planBrowserComputerUse(base);assert.equal(r.status,'RUNTIME_PLAN_READY');assert.equal(r.isolated_profile,true)});
test('prefers connector when available',()=>{assert.equal(planBrowserComputerUse({...base,api_or_connector_available:true}).preferred_route,'API_OR_CONNECTOR')});
test('blocks CAPTCHA/MFA bypass',()=>{assert.equal(planBrowserComputerUse({...base,bypass_mfa:true}).reason,'SECURITY_INCIDENT')});
test('blocks PROD use by default',()=>{assert.equal(planBrowserComputerUse({...base,context:{...base.context,environment:'PROD'}}).reason,'HIGH_RISK')});
