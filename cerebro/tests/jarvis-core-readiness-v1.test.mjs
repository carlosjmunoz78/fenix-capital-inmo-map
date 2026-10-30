import test from 'node:test';
import assert from 'node:assert/strict';
import {coreReadiness} from '../jarvis/core-v1/core-readiness-v1.mjs';

test('Minimal Core readiness is evidence-based and remains PARCIAL while memory/verifier/orchestrator bindings are incomplete',()=>{
 const r=coreReadiness();
 assert.equal(r.component_count,10);
 assert.equal(r.missing_evidence_count,0);
 assert.equal(r.minimal_core_status,'PARCIAL');
 assert.ok(r.partial_count>=3);
 assert.equal(r.prod_authorized,false);
 assert.equal(r.prod_write_authorized,false);
 assert.equal(r.trading_access,false);
 assert.equal(r.components.find(x=>x.id==='WORLD_MEMORY_ACCESS').state,'PARCIAL');
 assert.equal(r.components.find(x=>x.id==='VERIFIER_EVALUATION').state,'PARCIAL');
 assert.match(r.components.find(x=>x.id==='CAPABILITY_FABRIC').state,/AUDIT_REQUIRED/);
});
