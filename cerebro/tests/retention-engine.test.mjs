import test from 'node:test';
import assert from 'node:assert/strict';
import {planRetention} from '../customer/retention-engine.mjs';
const context={company_id:'fenix',engine_id:'RET-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,customer_requests_human:false,confidence:0.9,source_refs:['cx:client-1'],days_since_contact:21,cx_score:55,open_issues:2};
test('RET-001 creates retention plan without execution',()=>{const r=planRetention(base);assert.equal(r.status,'RETENTION_PLAN_READY');assert.equal(r.plan_only,true);assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.read_only,true);assert.ok(r.risk_score>=0&&r.risk_score<=100);assert.ok(r.actions.includes('RESOLVE_OPEN_ISSUES_FIRST'));assert.ok(r.actions.includes('PREPARE_PERSONALIZED_CHECK_IN'));assert.ok(r.actions.includes('PREPARE_SERVICE_RECOVERY'));});
test('RET-001 gates PROD and authorization',()=>{assert.equal(planRetention({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(planRetention({...base,authorized:false}).reason,'POLICY_CONFLICT');});
test('RET-001 respects customer human request and low confidence',()=>{assert.equal(planRetention({...base,customer_requests_human:true}).reason,'CUSTOMER_HUMAN_REQUEST');assert.equal(planRetention({...base,confidence:0.2}).reason,'LOW_CONFIDENCE');});
test('RET-001 requires evidence and safe environment',()=>{assert.throws(()=>planRetention({...base,source_refs:[]}));assert.throws(()=>planRetention({...base,context:{...context,environment:'PROD'}}));});
