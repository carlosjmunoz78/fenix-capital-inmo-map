import test from 'node:test';import assert from 'node:assert/strict';import {evaluateTribunalV0} from '../factory/tribunal-standard-v0.mjs';
const base={context:{company_id:'fenix',engine_id:'FACT-001',environment:'SCAFFOLD',version:'0.1.0'},candidate_version:'0.2.0',champion_version:'0.1.0',metrics:{quality_delta:0.1,cost_delta:0},evidence_refs:['run:1'],confidence:0.95};
test('tribunal approves evidence-backed non-regression only to PREPROD',()=>{const r=evaluateTribunalV0(base);assert.equal(r.status,'APPROVED');assert.equal(r.prod_promotion,false)});
test('tribunal blocks missing evidence',()=>{assert.equal(evaluateTribunalV0({...base,evidence_refs:[]}).status,'BLOCKED')});
test('tribunal escalates low confidence',()=>{assert.equal(evaluateTribunalV0({...base,confidence:0.5}).reason,'LOW_CONFIDENCE')});
test('tribunal rejects regression',()=>{assert.equal(evaluateTribunalV0({...base,metrics:{quality_delta:-0.1}}).decision,'KEEP_CHAMPION')});
