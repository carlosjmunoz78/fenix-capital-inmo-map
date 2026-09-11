import test from 'node:test';import assert from 'node:assert/strict';import {evaluateForecast} from '../strategy/forecasting-engine.mjs';
const context={company_id:'fenix',engine_id:'FRC-001',environment:'PREPROD',version:'0.1.0'};
test('FRC-001 forecasts deterministically',()=>{const r=evaluateForecast({context,authorized:true,confidence:.9,history:[10,20,30],horizon_periods:3});assert.deepEqual(r.forecast,[40,50,60]);assert.equal(r.method,'LINEAR_AVERAGE_DELTA');assert.equal(r.paid_ai_required,false)});
test('FRC-001 escalates low confidence and PROD',()=>{assert.equal(evaluateForecast({context,authorized:true,confidence:.5,history:[1,2]}).reason,'LOW_CONFIDENCE');assert.equal(evaluateForecast({context:{...context,environment:'PROD'},authorized:true,confidence:.9,history:[1,2]}).reason,'HIGH_RISK')});
test('FRC-001 requires enough history',()=>{assert.throws(()=>evaluateForecast({context,authorized:true,confidence:.9,history:[1]}),/at least 2 points/)});
