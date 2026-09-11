import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPerformance} from '../hr/performance-coaching-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-005',environment:'PREPROD',version:'0.1.0'};
test('creates coaching plan for weak metrics',()=>{const r=assessPerformance({context,authorized:true,confidence:.95,source_refs:['perf:1'],metrics:{error_rate:.2,sla_breach_rate:.15,completion_rate:.7,quality_score:.75}});assert.equal(r.status,'COACHING_PLAN_REQUIRED');assert.ok(r.interventions.includes('MICROTRAINING_ERRORS'));assert.equal(r.disciplinary_action,false);});
test('healthy metrics stay green',()=>{const r=assessPerformance({context,authorized:true,confidence:.95,source_refs:['perf:2'],metrics:{error_rate:.02,sla_breach_rate:.03,completion_rate:.95,quality_score:.92}});assert.equal(r.status,'PERFORMANCE_OK');assert.equal(r.interventions.length,0);});
test('low confidence escalates',()=>{const r=assessPerformance({context,authorized:true,confidence:.4,source_refs:['perf:3'],metrics:{}});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LOW_CONFIDENCE');});
