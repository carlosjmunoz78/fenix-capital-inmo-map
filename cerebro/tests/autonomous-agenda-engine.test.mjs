import test from 'node:test';
import assert from 'node:assert/strict';
import {planAgenda} from '../operations/autonomous-agenda-engine.mjs';
const context={company_id:'fenix',engine_id:'AGD-001',environment:'PREPROD',version:'0.1.0'};
test('orders by priority then due date',()=>{const r=planAgenda({context,authorized:true,confidence:.95,source_refs:['agenda:1'],tasks:[{id:'a',priority:2,due_ts:20},{id:'b',priority:3,due_ts:30},{id:'c',priority:3,due_ts:10}]});assert.deepEqual(r.ordered_tasks.map(x=>x.id),['c','b','a']);assert.equal(r.calendar_write,false);});
test('unavailable tasks are excluded',()=>{const r=planAgenda({context,authorized:true,confidence:.95,source_refs:['agenda:2'],tasks:[{id:'a',available:false},{id:'b',available:true}]});assert.deepEqual(r.ordered_tasks.map(x=>x.id),['b']);});
test('low confidence escalates',()=>{const r=planAgenda({context,authorized:true,confidence:.2,source_refs:['agenda:3'],tasks:[]});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'LOW_CONFIDENCE');});
