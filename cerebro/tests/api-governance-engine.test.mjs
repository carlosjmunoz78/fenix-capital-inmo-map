import test from 'node:test';
import assert from 'node:assert/strict';
import {assessApi} from '../platform/api-governance-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'API-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['master'],api:{name:'cases',version:'v1',path:'/cases',method:'GET',auth:'gateway',owner:'cerebro',rate_limit_required:true}};
test('valid api contract',()=>assert.equal(assessApi(base).status,'API_CONTRACT_VALID'));
test('cross-company denied',()=>assert.equal(assessApi({...base,api:{...base.api,cross_company:true}}).reason,'POLICY_CONFLICT'));
test('secret blocked',()=>assert.equal(assessApi({...base,api:{...base.api,exposes_raw_secret:true}}).reason,'SECURITY_INCIDENT'));
test('prod rejected',()=>assert.throws(()=>assessApi({...base,context:{...base.context,environment:'PROD'}}),/UNSAFE_CONTEXT/));
