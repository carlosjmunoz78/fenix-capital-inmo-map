import test from 'node:test';import assert from 'node:assert/strict';import {checkCapability} from '../security/capability-guard.mjs';
const base={context:{company_id:'fenix',environment:'SCAFFOLD',version:'0.1.0'},capability_id:'crm.read',action:'read',allowed_capabilities:['crm.read'],cross_company:false,high_risk:false};
test('allows declared capability',()=>{const r=checkCapability(base);assert.equal(r.status,'ALLOW');assert.equal(r.audit_required,true)});
test('blocks undeclared capability',()=>{assert.equal(checkCapability({...base,capability_id:'crm.write'}).reason,'POLICY_CONFLICT')});
test('blocks cross-company access',()=>{assert.equal(checkCapability({...base,cross_company:true}).reason,'POLICY_CONFLICT')});
test('blocks high-risk action',()=>{assert.equal(checkCapability({...base,high_risk:true}).reason,'HIGH_RISK')});
