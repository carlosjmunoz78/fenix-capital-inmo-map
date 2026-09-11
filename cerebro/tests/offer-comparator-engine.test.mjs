import test from 'node:test';
import assert from 'node:assert/strict';
import {compareOffers} from '../banking/offer-comparator-engine.mjs';
const context={company_id:'fenix',engine_id:'OFR-001',environment:'PREPROD',version:'0.1.0'};
const base={context,authorized:true,requires_prod_write:false,confidence:.95,source_refs:['offer:set1'],principal_eur:200000,term_months:300,offers:[{offer_ref:'A',bank:'BankA',tin_pct:3,tae_pct:3.4,fees_eur:500,insurance_total_eur:5000,bonus_products_total_eur:1000,flexibility_score:.8},{offer_ref:'B',bank:'BankB',tin_pct:2.8,tae_pct:3.2,fees_eur:1000,insurance_total_eur:3000,bonus_products_total_eur:500,flexibility_score:.7}]};
test('OFR-001 normalizes and ranks offers',()=>{const r=compareOffers(base);assert.equal(r.status,'OFFER_COMPARISON_READY');assert.equal(r.offers.length,2);assert.ok(r.offers[0].total_cost_eur<=r.offers[1].total_cost_eur);assert.equal(r.executed,false);});
test('OFR-001 enforces safety',()=>{assert.equal(compareOffers({...base,authorized:false}).reason,'POLICY_CONFLICT');assert.equal(compareOffers({...base,requires_prod_write:true}).reason,'HIGH_RISK');assert.equal(compareOffers({...base,confidence:.1}).reason,'LOW_CONFIDENCE');assert.throws(()=>compareOffers({...base,source_refs:[]}));});
