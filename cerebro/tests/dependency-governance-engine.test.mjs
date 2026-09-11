import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDependency} from '../platform/dependency-governance-engine.mjs';
const base={context:{company_id:'fenix',engine_id:'DEP-001',environment:'PREPROD'},authorized:true,confidence:.95,source_refs:['master'],dependency:{from_engine:'API-001',to_engine:'DATA-001',type:'READ',critical:false,rollback_defined:true}};
test('valid dependency',()=>assert.equal(assessDependency(base).status,'DEPENDENCY_VALID'));
test('critical without rollback blocked',()=>assert.equal(assessDependency({...base,dependency:{...base.dependency,critical:true,rollback_defined:false}}).reason,'HIGH_RISK'));
test('cross-company denied',()=>assert.equal(assessDependency({...base,dependency:{...base.dependency,cross_company:true}}).reason,'POLICY_CONFLICT'));
test('prod rejected',()=>assert.throws(()=>assessDependency({...base,context:{...base.context,environment:'PROD'}}),/UNSAFE_CONTEXT/));
