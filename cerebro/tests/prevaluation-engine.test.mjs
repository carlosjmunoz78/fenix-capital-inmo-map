import test from 'node:test';
import assert from 'node:assert/strict';
import {estimatePrevaluation} from '../property/prevaluation-engine.mjs';
const context={company_id:'fenix',engine_id:'TAS-001',environment:'PREPROD',version:'0.1.0'};
const comps=[{price_eur:180000,area_sqm:90},{price_eur:200000,area_sqm:100},{price_eur:220000,area_sqm:100},{price_eur:195000,area_sqm:95}];
const base={context,authorized:true,requires_prod_write:false,confidence:.92,source_refs:['comp:set1'],area_sqm:100,comparables:comps,max_deviation_pct:20};
test('TAS-001 returns estimate and interval',()=>{const r=estimatePrevaluation(base);assert.equal(r.status,'PREVALUATION_READY');assert.ok(r.estimate_eur>0);assert.ok(r.interval_eur.low<=r.estimate_eur);assert.ok(r.interval_eur.high>=r.interval_eur.low);assert.equal(r.valuation_final,false);});
test('TAS-001 escalates high deviation',()=>{const r=estimatePrevaluation({...base,observed_value_eur:400000});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'HIGH_RISK');});
test('TAS-001 enforces evidence/confidence/minimum comps',()=>{assert.equal(estimatePrevaluation({...base,confidence:.2}).reason,'LOW_CONFIDENCE');assert.equal(estimatePrevaluation({...base,comparables:comps.slice(0,2)}).reason,'LOW_CONFIDENCE');assert.throws(()=>estimatePrevaluation({...base,source_refs:[]}));});
