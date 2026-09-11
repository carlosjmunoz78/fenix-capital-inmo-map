import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeCadastre} from '../property/cadastre-engine.mjs';
const context={company_id:'fenix',engine_id:'CAT-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['catastro:1','registro:1'],cadastre_ref:'RC-1',cadastre_area_sqm:100,registry_area_sqm:97,use:'RESIDENTIAL',parcel_ref:'PARCEL-1',max_area_diff_pct:10};
test('CAT-001 validates registry-cadastre coherence',()=>{const r=analyzeCadastre(base);assert.equal(r.status,'CADASTRE_ANALYSIS_READY');assert.equal(r.coherent_with_registry,true);assert.equal(r.executed,false);});
test('CAT-001 escalates large area discrepancy',()=>{const r=analyzeCadastre({...base,registry_area_sqm:70});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
test('CAT-001 enforces policy/evidence',()=>{assert.equal(analyzeCadastre({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(analyzeCadastre({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.throws(()=>analyzeCadastre({...base,source_refs:[]}));});
