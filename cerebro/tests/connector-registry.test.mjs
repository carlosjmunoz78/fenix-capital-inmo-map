import test from 'node:test';import assert from 'node:assert/strict';import {registerConnector} from '../connectors/connector-registry.mjs';
const base={context:{company_id:'fenix',environment:'LAB',version:'0.1.0'},connector_id:'conn-1',type:'API',provider:'example',connector_version:'0.1.0',status:'ACTIVE',permissions:['read'],estimated_additional_cost_eur:0};
test('registers zero-cost connector',()=>{const r=registerConnector(base);assert.equal(r.status,'REGISTERED');assert.equal(r.connector.type,'API')});
test('supports MCP type',()=>{assert.equal(registerConnector({...base,type:'MCP'}).connector.type,'MCP')});
test('blocks paid connector by default',()=>{assert.equal(registerConnector({...base,estimated_additional_cost_eur:1}).reason,'MONEY_LIMIT')});
