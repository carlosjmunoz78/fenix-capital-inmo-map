import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCompanyRecord,getCompanyForContext,assertNoCrossCompanyAccess} from '../company-registry.mjs';
const company={company_id:'fenix',name:'Fenix',brands:['Fenix'],domains:['example.invalid'],sector:'real-estate',country:'ES',owner_ref:'principal://owner',permissions_ref:'policy://fenix',environments:['SCAFFOLD'],stack_refs:['github://repo'],status:'ACTIVE',active_engine_ids:['COMP-REG-001']};
const context={company_id:'fenix',engine_id:'COMP-REG-001',environment:'SCAFFOLD',version:'0.1.0'};
test('validates canonical company record',()=>{assert.equal(validateCompanyRecord(company).company_id,'fenix');});
test('resolves company only by exact company_id',()=>{assert.equal(getCompanyForContext([company],context).name,'Fenix');});
test('duplicate company_id fails closed',()=>{assert.throws(()=>getCompanyForContext([company,{...company}],context));});
test('cross-company access denied by default',()=>{const r=assertNoCrossCompanyAccess('fenix','other');assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');});
