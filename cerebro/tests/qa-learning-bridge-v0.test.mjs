import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQaLearningSignals} from '../qa/qa-learning-bridge.mjs';
import {buildUniversalLearningEventReport} from '../runtime/universal-learning-ingress.mjs';

function state(overrides={}){
 return {state_type:'CEREBRO_CONTINUOUS_HUMAN_QA_STATE_V0',company_id:'fenix',engine_id:'QA-001',environment:'CONTROL_PLANE',version:'0.1.0',updated_at:'2026-10-11T01:00:00Z',quality_score:80,previous_quality_score:100,quality_delta:-20,new_issues:[{fingerprint:'abc123',severity:'HIGH',kind:'APP',title:'[APP] public shell pageerror',owner_engine:'APP-001',evidence:['pageerror crash']}],resolved_issue_fingerprints:['old456'],safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0},...overrides};
}

test('new QA finding becomes an owner-scoped PREPROD learning signal with no PROD authority',()=>{
 const batch=buildQaLearningSignals(state({resolved_issue_fingerprints:[],quality_delta:0}));
 assert.equal(batch.signals_total,1);
 const signal=batch.signals[0];
 assert.equal(signal.signal_type,'ENGINE_ERROR');
 assert.equal(signal.engine_id,'APP-001');
 assert.equal(signal.risk_class,'MEDIUM');
 assert.equal(signal.prod_write_authorized,false);
 assert.equal(signal.contains_customer_data,false);
 assert.equal(signal.additional_cost_eur,0);
 assert.ok(signal.payload.required_path.includes('ADD_REGRESSION_TEST'));
 const ingress=buildUniversalLearningEventReport(batch);
 assert.equal(ingress.events_total,1);
 assert.equal(ingress.events[0].engine_id,'APP-001');
 assert.equal(ingress.events[0].environment,'PREPROD_CANDIDATE');
 assert.equal(ingress.events[0].prod_write_authorized,false);
});

test('resolved issue and quality regression become learning evidence without customer data',()=>{
 const batch=buildQaLearningSignals(state({new_issues:[]}));
 assert.equal(batch.signals_total,2);
 assert.deepEqual(batch.signals.map(x=>x.signal_type).sort(),['ENGINE_RESULT','METRIC_OBSERVATION']);
 const ingress=buildUniversalLearningEventReport(batch);
 assert.equal(ingress.events_total,2);
 assert.ok(ingress.events.every(x=>x.prod_authorized===false&&x.trading_access===false&&x.additional_cost_eur===0));
});

test('green stable QA is idempotent no-op for learning dispatch',()=>{
 const batch=buildQaLearningSignals(state({new_issues:[],resolved_issue_fingerprints:[],quality_delta:0,quality_score:100,previous_quality_score:100}));
 assert.equal(batch.signals_total,0);
});

test('bridge fails closed if QA safety state drifts',()=>{
 assert.throws(()=>buildQaLearningSignals(state({safety:{prod_write:true,customer_data:false,trading:false,additional_subscription_eur:0}})),/safety boundary drift/);
});
