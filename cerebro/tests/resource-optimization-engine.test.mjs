import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizeResources} from '../platform/resource-optimization-engine.mjs';
const context={company_id:'fenix',engine_id:'OPT-001',environment:'PREPROD',version:'0.1.0'};
const resources=[{type:'CPU',used:10,capacity:100,unit_cost_eur:0},{type:'MEMORY',used:60,capacity:100,unit_cost_eur:0},{type:'API',used:95,capacity:100,unit_cost_eur:0}];
test('plans optimization deterministically at zero extra cost',()=>{const r=optimizeResources({context,authorized:true,confidence:.95,resources});assert.equal(r.status,'OPTIMIZATION_PLAN');assert.equal(r.findings[0].action,'DOWNSIZE_OR_CONSOLIDATE');assert.equal(r.findings[2].action,'CAPACITY_REVIEW');assert.equal(r.cost_additional_eur,0);assert.equal(r.executed,false)});
test('fails closed for paid or prod write paths',()=>{assert.equal(optimizeResources({context,authorized:true,confidence:.95,resources,additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(optimizeResources({context,authorized:true,confidence:.95,resources,requires_prod_write:true}).reason,'HIGH_RISK')});
test('fails closed for low confidence and bad context',()=>{assert.equal(optimizeResources({context,authorized:true,confidence:.2,resources}).reason,'LOW_CONFIDENCE');assert.throws(()=>optimizeResources({context:{...context,environment:'PROD'},authorized:true,confidence:.95,resources}),/UNSAFE_CONTEXT/)});
