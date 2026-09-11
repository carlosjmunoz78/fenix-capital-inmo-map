import test from 'node:test';import assert from 'node:assert/strict';import {planTenantIsolation} from '../company/tenant-isolation.mjs';
const base={context:{company_id:'fenix',engine_id:'TENANT-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,cross_company_access:false};
test('TENANT creates isolation plan',()=>{const r=planTenantIsolation(base);assert.equal(r.status,'PLAN_READY');assert.equal(r.isolation_rules.includes('deny_cross_company_by_default'),true)});
test('TENANT blocks cross-company access',()=>{assert.equal(planTenantIsolation({...base,cross_company_access:true}).reason,'POLICY_CONFLICT')});
