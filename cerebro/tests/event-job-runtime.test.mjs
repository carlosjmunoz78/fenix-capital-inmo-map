import test from 'node:test';import assert from 'node:assert/strict';import {prepareJob} from '../runtime/event-job-runtime.mjs';
const context={company_id:'fenix',engine_id:'SCAN-001',environment:'PREPROD',version:'0.1.0'};
test('job runtime prepares idempotent dispatch',()=>{const r=prepareJob({context,event_id:'ev1',job_id:'job1',event_type:'SCAN_REQUEST'});assert.equal(r.status,'READY');assert.equal(r.dispatch,true);assert.equal(r.idempotency_key,'fenix:SCAN-001:job1')});
test('job runtime blocks cross-company dispatch',()=>{const r=prepareJob({context,event_id:'ev1',job_id:'job1',event_type:'X',target_company_id:'other'});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT')});
test('job runtime blocks unapproved spend',()=>{const r=prepareJob({context,event_id:'ev1',job_id:'job1',event_type:'X',cost_eur:1});assert.equal(r.reason,'MONEY_LIMIT');assert.equal(r.dispatch,false)});
test('job runtime normalizes retry bounds',()=>{const r=prepareJob({context,event_id:'ev1',job_id:'job1',event_type:'X',attempt:0,max_attempts:0});assert.equal(r.attempt,1);assert.equal(r.max_attempts,1)});
