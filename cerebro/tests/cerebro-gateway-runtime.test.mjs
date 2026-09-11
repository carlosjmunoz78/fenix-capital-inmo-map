import test from 'node:test';import assert from 'node:assert/strict';import {routeGatewayRequest} from '../gateway/cerebro-gateway-runtime.mjs';
const base={context:{company_id:'fenix',environment:'SCAFFOLD',version:'0.1.0'},request_id:'r1',intent:'engine.query',direct_model_access:false,estimated_additional_cost_eur:0};
test('gateway routes zero-cost request',()=>{const r=routeGatewayRequest(base);assert.equal(r.status,'ROUTE_READY');assert.equal(r.gateway,true)});
test('gateway blocks direct model access',()=>{assert.equal(routeGatewayRequest({...base,direct_model_access:true}).reason,'POLICY_CONFLICT')});
test('gateway blocks paid route',()=>{assert.equal(routeGatewayRequest({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
