import test from 'node:test';import assert from 'node:assert/strict';import {planHealing} from '../supervisor/self-healing.mjs';
const context={company_id:'fenix',engine_id:'SELF-001',environment:'PREPROD',version:'0.1.0'};
test('SELF-001 prepares safe reversible healing only',()=>{const r=planHealing({context,action:'REQUEUE_JOB'});assert.equal(r.status,'PLAN_READY');assert.equal(r.execute,false);assert.equal(r.rollback_required,true);assert.equal(r.verification_required,true)});
test('SELF-001 blocks Trading',()=>{const r=planHealing({context,action:'RETRY',trading:true});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT')});
test('SELF-001 blocks PROD writes and spend',()=>{assert.equal(planHealing({context,action:'RETRY',prod_write:true}).reason,'HIGH_RISK');assert.equal(planHealing({context,action:'RETRY',additional_cost_eur:1}).reason,'MONEY_LIMIT')});
test('SELF-001 blocks unknown healing and PROD environment',()=>{assert.equal(planHealing({context,action:'DELETE_DATABASE'}).reason,'HIGH_RISK');assert.equal(planHealing({context:{...context,environment:'PROD'},action:'RETRY'}).reason,'HIGH_RISK')});
