import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCost} from '../finance/finops-engine.mjs';
const ctx={company_id:'co1',engine_id:'FINOPS-001',environment:'PREPROD',version:'0.1.0'};
test('stays within budget',()=>{const r=assessCost({context:ctx,authorized:true,confidence:.9,source_refs:['cost:1'],budget_cents:1000,items:[{type:'API',cost_cents:200,ref:'a'},{type:'STORAGE',cost_cents:100,ref:'s'}]}); assert.equal(r.status,'COST_WITHIN_BUDGET'); assert.equal(r.remaining_cents,700);});
test('gates over budget',()=>{const r=assessCost({context:ctx,authorized:true,confidence:.9,source_refs:['cost:2'],budget_cents:100,items:[{type:'AI',cost_cents:200,ref:'m'}]}); assert.equal(r.reason,'MONEY_LIMIT');});
test('rejects unsupported cost type',()=>{assert.throws(()=>assessCost({context:ctx,authorized:true,confidence:.9,source_refs:['x'],budget_cents:1000,items:[{type:'OTHER',cost_cents:1}]}),/COST_TYPE_NOT_ALLOWED/);});
