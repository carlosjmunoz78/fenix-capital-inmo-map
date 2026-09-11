import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRegistryRecord} from '../property/registry-engine.mjs';
const context={company_id:'fenix',engine_id:'REGP-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['nota-simple:1'],title_holders:['owner:1'],mortgages:[{bank:'A'}],embargoes:[],encumbrances:[],cancellations_pending:[],registry_notes:[]};
test('REGP-001 prepares registry tasks',()=>{const r=analyzeRegistryRecord(base);assert.equal(r.status,'REGISTRY_ANALYSIS_READY');assert.ok(r.tasks.includes('VERIFY_MORTGAGE_STATUS'));assert.equal(r.executed,false);});
test('REGP-001 escalates legal complexity',()=>{const r=analyzeRegistryRecord({...base,embargoes:[{ref:'e1'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LEGAL_REQUIRED');});
test('REGP-001 enforces policy and evidence',()=>{assert.equal(analyzeRegistryRecord({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(analyzeRegistryRecord({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>analyzeRegistryRecord({...base,source_refs:[]}));});
