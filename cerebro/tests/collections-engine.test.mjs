import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCollection} from '../finance/collections-engine.mjs';
const ctx={company_id:'co1',engine_id:'COL-001',environment:'PREPROD',version:'0.1.0'};
test('plans overdue followup without writes',()=>{const r=assessCollection({context:ctx,authorized:true,confidence:.9,source_refs:['inv:1'],invoice_ref:'inv1',due_date:'2026-09-01',today:'2026-09-11',amount_cents:10000,paid_cents:2500}); assert.equal(r.overdue,true); assert.equal(r.action,'PLAN_COLLECTION_FOLLOWUP'); assert.equal(r.communication_send,false);});
test('closes when paid',()=>{const r=assessCollection({context:ctx,authorized:true,confidence:.9,source_refs:['inv:2'],invoice_ref:'inv2',due_date:'2026-09-20',today:'2026-09-11',amount_cents:10000,paid_cents:10000}); assert.equal(r.action,'CLOSED');});
test('gates low confidence',()=>{assert.equal(assessCollection({context:ctx,authorized:true,confidence:.5,source_refs:['x'],invoice_ref:'i',due_date:'2026-09-01',today:'2026-09-11',amount_cents:1,paid_cents:0}).reason,'LOW_CONFIDENCE');});
