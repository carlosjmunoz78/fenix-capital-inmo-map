import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDataGovernance} from '../platform/data-governance-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'DATA-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['master'],datasets:[{name:'crm',classification:'TRANSACTIONAL',owner:'ops',system_of_record:'CRM',retention_defined:true}]};
test('governed',()=>assert.equal(assessDataGovernance(base).status,'GOVERNED'));
test('cross company denied',()=>assert.equal(assessDataGovernance({...base,datasets:[{...base.datasets[0],cross_company:true}]}).reason,'POLICY_CONFLICT'));
test('raw secrets incident',()=>assert.equal(assessDataGovernance({...base,datasets:[{...base.datasets[0],contains_raw_secrets:true}]}).reason,'SECURITY_INCIDENT'));
test('prod rejected',()=>assert.throws(()=>assessDataGovernance({...base,context:{...base.context,environment:'PROD'}}),/UNSAFE_CONTEXT/));
