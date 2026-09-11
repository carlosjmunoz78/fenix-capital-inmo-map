import test from 'node:test';
import assert from 'node:assert/strict';
import {planKeywordDiscovery} from '../seo/keyword-discovery.mjs';
const context={company_id:'fenix',engine_id:'KW-001',environment:'SCAFFOLD',version:'0.1.0'};
test('KW-001 builds deterministic zero-cost plan',()=>{const r=planKeywordDiscovery({context,authorized:true,seed_terms:['Hipotecas','hipotecas','inversión'],estimated_additional_cost_eur:0});assert.equal(r.status,'PLAN_READY');assert.deepEqual(r.seed_terms,['hipotecas','inversión']);assert.equal(r.additional_cost_target_eur,0);assert.equal(r.executed,false);});
test('KW-001 blocks unauthorized/cost/prod',()=>{assert.equal(planKeywordDiscovery({context,authorized:false,seed_terms:['x']}).reason,'POLICY_CONFLICT');assert.equal(planKeywordDiscovery({context,authorized:true,seed_terms:['x'],estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(planKeywordDiscovery({context,authorized:true,seed_terms:['x'],requires_prod_write:true}).reason,'HIGH_RISK');});
test('KW-001 fails closed',()=>{assert.throws(()=>planKeywordDiscovery({context,authorized:true,seed_terms:[]}));assert.throws(()=>planKeywordDiscovery({context:{...context,engine_id:'SCAN-001'},authorized:true,seed_terms:['x']}));});
