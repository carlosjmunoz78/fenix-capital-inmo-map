import test from 'node:test';
import assert from 'node:assert/strict';
import {planDigitalFootprintScan} from '../scanner/digital-footprint-scanner.mjs';
const ctx={company_id:'fenix',engine_id:'SCAN-001',environment:'SCAFFOLD',version:'0.1.0'};
test('SCAN-001 creates zero-cost read-only plan',()=>{const r=planDigitalFootprintScan({context:ctx,domain:'fenixcapital.es',authorized:true,estimated_additional_cost_eur:0,requires_prod_write:false});assert.equal(r.status,'PLAN_READY');assert.equal(r.mode,'READ_ONLY_PUBLIC_DISCOVERY');assert.equal(r.executed,false);assert.equal(r.prod_writes,false);assert.equal(r.trading_access,false);assert.equal(r.additional_cost_target_eur,0);assert.ok(r.surfaces.includes('website'));});
test('SCAN-001 fails closed on missing authorization',()=>{const r=planDigitalFootprintScan({context:ctx,domain:'fenixcapital.es',authorized:false});assert.equal(r.status,'HUMAN_REQUIRED');assert.equal(r.reason,'POLICY_CONFLICT');});
test('SCAN-001 blocks cost and PROD writes',()=>{assert.equal(planDigitalFootprintScan({context:ctx,domain:'fenixcapital.es',authorized:true,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT');assert.equal(planDigitalFootprintScan({context:ctx,domain:'fenixcapital.es',authorized:true,requires_prod_write:true}).reason,'HIGH_RISK');});
test('SCAN-001 rejects invalid domain/context',()=>{assert.throws(()=>planDigitalFootprintScan({context:ctx,domain:'not a domain',authorized:true}));assert.throws(()=>planDigitalFootprintScan({context:{...ctx,engine_id:'KW-001'},domain:'fenixcapital.es',authorized:true}));});
