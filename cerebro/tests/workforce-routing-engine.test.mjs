import test from 'node:test';
import assert from 'node:assert/strict';
import {assignCase} from '../hr/workforce-routing-engine.mjs';
const context={company_id:'fenix',engine_id:'HR-006',environment:'PREPROD',version:'0.1.0'};
test('assigns by specialty zone performance load and risk',()=>{const r=assignCase({context,authorized:true,confidence:.95,source_refs:['wf:1'],case_profile:{specialty:'mortgage',zone:'cordoba',risk:2},workers:[{id:'a',load:5,performance:.9,specialties:['mortgage'],zones:['cordoba'],risk_capacity:3},{id:'b',load:1,performance:.7,specialties:['other'],zones:['cordoba'],risk_capacity:3}]});assert.equal(r.status,'WORKFORCE_ASSIGNMENT_READY');assert.equal(r.worker_id,'a');assert.equal(r.assignment_execute,false);});
test('inactive workers excluded',()=>{const r=assignCase({context,authorized:true,confidence:.95,source_refs:['wf:2'],case_profile:{specialty:'mortgage',zone:'cordoba',risk:1},workers:[{id:'a',active:false,performance:1,specialties:['mortgage'],zones:['cordoba'],risk_capacity:5},{id:'b',performance:.8,specialties:['mortgage'],zones:['cordoba'],risk_capacity:5}]});assert.equal(r.worker_id,'b');});
test('low confidence escalates',()=>{const r=assignCase({context,authorized:true,confidence:.4,source_refs:['wf:3'],case_profile:{},workers:[{id:'a'}]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LOW_CONFIDENCE');});
