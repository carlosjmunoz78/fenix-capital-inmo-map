import test from 'node:test';
import assert from 'node:assert/strict';
import {assessJob} from '../platform/job-governance-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'JOB-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['master'],job:{name:'sync-case',timeout_seconds:300,max_retries:3,estimated_cost_cents:0,cost_limit_cents:0}};
test('valid job plan',()=>assert.equal(assessJob(base).status,'JOB_PLAN_VALID'));
test('money limit',()=>assert.equal(assessJob({...base,job:{...base.job,estimated_cost_cents:10}}).reason,'MONEY_LIMIT'));
test('cross-company denied',()=>assert.equal(assessJob({...base,job:{...base.job,cross_company:true}}).reason,'POLICY_CONFLICT'));
test('prod rejected',()=>assert.throws(()=>assessJob({...base,context:{...base.context,environment:'PROD'}}),/UNSAFE_CONTEXT/));
