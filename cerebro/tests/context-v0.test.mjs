import test from 'node:test';import assert from 'node:assert/strict';import {resolveContextV0} from '../console/context-v0.mjs';
const base={context:{company_id:'fenix',engine_id:'CTX-001',environment:'SCAFFOLD',version:'0.1.0'},authorized:true,scope:'company'};
test('CTX enforces company boundary',()=>{const r=resolveContextV0(base);assert.equal(r.status,'CONTEXT_READY');assert.equal(r.company_boundary_enforced,true);assert.equal(r.cross_company,false)});
test('CTX rejects unknown scope',()=>{assert.equal(resolveContextV0({...base,scope:'cross_company'}).reason,'POLICY_CONFLICT')});
