import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAccounting} from '../finance/accounting-prep-engine.mjs';
const ctx={company_id:'co1',engine_id:'ACC-001',environment:'PREPROD',version:'0.1.0'};
test('prepares reconciled package',()=>{const r=prepareAccounting({context:ctx,authorized:true,confidence:.9,source_refs:['ledger:1'],entries:[{category:'REVENUE',amount_cents:10000,source_ref:'inv1'},{category:'EXPENSE',amount_cents:-3000,source_ref:'bill1'}]}); assert.equal(r.total_cents,7000); assert.equal(r.reconciled,true); assert.equal(r.book_entry_write,false);});
test('rejects unsupported category',()=>{assert.throws(()=>prepareAccounting({context:ctx,authorized:true,confidence:.9,source_refs:['x'],entries:[{category:'OTHER',amount_cents:1,source_ref:'x'}]}),/CATEGORY_NOT_ALLOWED/);});
test('gates low confidence',()=>{assert.equal(prepareAccounting({context:ctx,authorized:true,confidence:.5,source_refs:['x']}).reason,'LOW_CONFIDENCE');});
