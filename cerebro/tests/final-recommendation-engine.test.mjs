import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendFinancialOption} from '../banking/final-recommendation-engine.mjs';
const context={company_id:'fenix',engine_id:'REC-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.93,source_refs:['rank:1','offers:1'],ranked_banks:[{bank:'B',score:90},{bank:'A',score:80}],compared_offers:[{offer_ref:'A1',bank:'A',total_cost_eur:30000,flexibility_score:.9},{offer_ref:'B1',bank:'B',total_cost_eur:28000,flexibility_score:.7},{offer_ref:'C1',bank:'C',total_cost_eur:32000,flexibility_score:.8}],policy_flags:[]};
test('REC-001 returns primary plus plans B/C with traceability',()=>{const r=recommendFinancialOption(base);assert.equal(r.status,'FINAL_RECOMMENDATION_READY');assert.equal(r.recommendation.offer_ref,'B1');assert.equal(r.plan_b.offer_ref,'A1');assert.equal(r.plan_c.offer_ref,'C1');assert.equal(r.explanation.confidence,.93);assert.equal(r.executed,false);});
test('REC-001 escalates low confidence and policy deny',()=>{assert.equal(recommendFinancialOption({...base,confidence:.3}).reason,'LOW_CONFIDENCE');assert.equal(recommendFinancialOption({...base,policy_flags:['DENY']}).reason,'POLICY_CONFLICT');});
test('REC-001 requires evidence and offers',()=>{assert.throws(()=>recommendFinancialOption({...base,source_refs:[]}));assert.throws(()=>recommendFinancialOption({...base,compared_offers:[]}));});
