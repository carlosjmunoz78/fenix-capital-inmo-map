import test from 'node:test';
import assert from 'node:assert/strict';
import {assessHrLifecycle} from '../hr/hr-core-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-001',environment:'PREPROD',version:'0.1.0'};
test('delegates onboarding to HR-003',()=>{const r=assessHrLifecycle({context,authorized:true,confidence:.95,source_refs:['hr:1'],employee_ref:'emp-1',stage:'ONBOARDING',facts:{role:'financiero'}});assert.equal(r.status,'HR_CORE_READY');assert.equal(r.delegate_engine_id,'HR-003');assert.equal(r.executed,false);});
test('sensitive labor decision escalates',()=>{const r=assessHrLifecycle({context,authorized:true,confidence:.95,source_refs:['hr:2'],employee_ref:'emp-2',stage:'PERFORMANCE',requested_action:'TERMINATION',facts:{}});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
test('invalid stage fails closed',()=>{assert.throws(()=>assessHrLifecycle({context,authorized:true,confidence:.95,source_refs:['hr:3'],stage:'OTHER',facts:{}}),/INVALID_HR_STAGE/);});
