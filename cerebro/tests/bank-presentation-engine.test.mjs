import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBankPresentation} from '../banking/bank-presentation-engine.mjs';
const context={company_id:'fenix',engine_id:'BNK-004',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['doc:set1'],bank:'BankA',case_ref:'CASE-1',template_ref:'tpl:bankA',message_template_ref:'msg:bankA',documents:[{name:'nomina.pdf',type:'INCOME',ref:'d2'},{name:'dni.pdf',type:'IDENTITY',ref:'d1'}]};
test('BNK-004 prepares deterministic package',()=>{const r=prepareBankPresentation(base);assert.equal(r.status,'BANK_PRESENTATION_PLAN_READY');assert.equal(r.document_count,2);assert.equal(r.documents[0].type,'IDENTITY');assert.equal(r.executed,false);assert.equal(r.prod_writes,false);});
test('BNK-004 enforces safety',()=>{assert.equal(prepareBankPresentation({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(prepareBankPresentation({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(prepareBankPresentation({...base,confidence:.1}).reason,'LOW_CONFIDENCE');});
test('BNK-004 requires evidence and templates',()=>{assert.throws(()=>prepareBankPresentation({...base,source_refs:[]}));assert.throws(()=>prepareBankPresentation({...base,template_ref:''}));});
