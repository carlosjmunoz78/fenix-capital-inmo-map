import test from 'node:test';
import assert from 'node:assert/strict';
import {assessDocumentation} from '../platform/system-documentation-engine.mjs';
const context={company_id:'fenix',engine_id:'DOCS-001',environment:'PREPROD',version:'0.1.0'};
const artifacts={registry:'engine-registry.md',contracts:'contracts.md',dependency_map:'deps.md',runbook:'runbook.md',changelog:'changelog.md',backup:'backup.md',rebuild:'rebuild.md',autonomy_state:'autonomy.md'};
test('marks complete documentation without writing',()=>{const r=assessDocumentation({context,authorized:true,confidence:.95,artifacts});assert.equal(r.status,'DOCUMENTATION_COMPLETE');assert.equal(r.missing.length,0);assert.equal(r.autowrite_execute,false);assert.equal(r.executed,false)});
test('reports gaps deterministically',()=>{const x={...artifacts,runbook:''};const r=assessDocumentation({context,authorized:true,confidence:.95,artifacts:x});assert.equal(r.status,'DOCUMENTATION_GAPS');assert.deepEqual(r.missing,['runbook'])});
test('fails closed for prod and low confidence',()=>{assert.throws(()=>assessDocumentation({context:{...context,environment:'PROD'},authorized:true,confidence:.95,artifacts}),/UNSAFE_CONTEXT/);assert.equal(assessDocumentation({context,authorized:true,confidence:.3,artifacts}).reason,'LOW_CONFIDENCE')});
