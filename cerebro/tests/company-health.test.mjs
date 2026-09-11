import test from 'node:test';import assert from 'node:assert/strict';import {planCompanyHealth} from '../company/company-health.mjs';
const base={context:{company_id:'fenix',engine_id:'COMP-HLT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true};
test('COMP-HLT creates read-only health plan',()=>{const r=planCompanyHealth(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_HEALTH_PLAN');assert.equal(r.checks.includes('backup_freshness'),true)});
test('COMP-HLT requires authorization',()=>{assert.equal(planCompanyHealth({...base,authorized:false}).reason,'POLICY_CONFLICT')});
