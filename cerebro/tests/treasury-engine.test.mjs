import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastTreasury} from '../finance/treasury-engine.mjs';
const ctx={company_id:'co1',engine_id:'TRE-001',environment:'PREPROD',version:'0.1.0'};
test('forecasts positive liquidity',()=>{const r=forecastTreasury({context:ctx,authorized:true,confidence:.9,source_refs:['cash:1'],opening_cents:10000,inflows:[{amount_cents:5000}],outflows:[{amount_cents:3000}]}); assert.equal(r.projected_closing_cents,12000); assert.equal(r.liquidity_risk,false);});
test('flags negative liquidity',()=>{const r=forecastTreasury({context:ctx,authorized:true,confidence:.9,source_refs:['cash:2'],opening_cents:1000,inflows:[],outflows:[{amount_cents:5000}]}); assert.equal(r.action,'PLAN_LIQUIDITY_REVIEW'); assert.equal(r.payment_execute,false);});
test('gates prod write',()=>{assert.equal(forecastTreasury({context:ctx,authorized:true,requires_prod_write:true,confidence:.9,source_refs:['x']}).reason,'HIGH_RISK');});
