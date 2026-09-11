import test from 'node:test';import assert from 'node:assert/strict';import {planAccountLifecycle} from '../identity/account-lifecycle.mjs';
const base={context:{company_id:'fenix',identity_id:'id-1',environment:'LAB',version:'0.1.0'},action:'PREPARE_CREATE',fake_identity:false,spam_network:false,metric_manipulation:false,provider_requires_human:false,estimated_additional_cost_eur:0,existing_reusable_account:false};
test('prepares legitimate account lifecycle plan',()=>{const r=planAccountLifecycle(base);assert.equal(r.status,'LIFECYCLE_PLAN_READY');assert.equal(r.verify_required,true)});
test('prefers existing reusable account',()=>{const r=planAccountLifecycle({...base,existing_reusable_account:true});assert.equal(r.preferred_action,'REUSE')});
test('blocks fake/spam account pattern',()=>{assert.equal(planAccountLifecycle({...base,fake_identity:true}).reason,'POLICY_CONFLICT')});
test('requires human when provider requires presence',()=>{assert.equal(planAccountLifecycle({...base,provider_requires_human:true}).status,'HUMAN_REQUIRED')});
