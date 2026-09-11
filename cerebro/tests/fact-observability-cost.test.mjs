import test from 'node:test';import assert from 'node:assert/strict';import {evaluateFactoryObservability} from '../factory/fact-observability-cost.mjs';
const base={context:{company_id:'fenix',engine_id:'FACT-001',environment:'PREPROD',version:'0.1.0'},metrics:{error_rate:0.01,p95_latency_ms:120,human_exception_rate:0.02,cost_eur:0},cost_budget_eur:0,evidence_refs:['run://1']};
test('FACT observability passes with evidence and zero cost',()=>{const r=evaluateFactoryObservability(base);assert.equal(r.status,'PASS');assert.equal(r.ready,true)});
test('FACT observability blocks missing evidence',()=>{assert.equal(evaluateFactoryObservability({...base,evidence_refs:[]}).reason,'POLICY_CONFLICT')});
test('FACT observability blocks budget overrun',()=>{assert.equal(evaluateFactoryObservability({...base,metrics:{...base.metrics,cost_eur:1}}).reason,'MONEY_LIMIT')});
