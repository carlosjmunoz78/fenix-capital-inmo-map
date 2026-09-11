import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAlpacaPaperOrder,ALPACA_PAPER_RISK_CONTRACT} from '../training/alpaca-paper-risk-gate.mjs';

const context={company_id:'fenix',engine_id:'LAB-TRD',environment:'LAB',version:'0.1.0'};
const account={status:'ACTIVE',trading_blocked:false,account_blocked:false};
const clock={is_open:true};

test('contract is Paper-only zero-cost with conservative limits',()=>{
  assert.equal(ALPACA_PAPER_RISK_CONTRACT.paper_only,true);
  assert.equal(ALPACA_PAPER_RISK_CONTRACT.live_endpoint_blocked,true);
  assert.equal(ALPACA_PAPER_RISK_CONTRACT.additional_cost_target_eur,0);
  assert.equal(ALPACA_PAPER_RISK_CONTRACT.shorting_allowed,false);
  assert.equal(ALPACA_PAPER_RISK_CONTRACT.max_order_notional_usd,100);
});

test('allows only a safe Paper order plan and never authorizes execution',()=>{
  const r=evaluateAlpacaPaperOrder({context,account,clock,positions:[],order:{symbol:'SPY',side:'buy',notional_usd:25}});
  assert.equal(r.status,'GREEN');
  assert.equal(r.decision,'ALLOW_PAPER_ORDER_PLAN');
  assert.equal(r.execution_authorized,false);
  assert.equal(r.paper_only,true);
});

test('blocks live endpoint, closed market and kill switch',()=>{
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock,order:{symbol:'SPY',side:'buy',notional_usd:1},base_url:'https://api.alpaca.markets'}).reason,'POLICY_CONFLICT');
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock:{is_open:false},order:{symbol:'SPY',side:'buy',notional_usd:1}}).reason,'HIGH_RISK');
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock,order:{symbol:'SPY',side:'buy',notional_usd:1},kill_switch:true}).reason,'SECURITY_INCIDENT');
});

test('blocks oversized order and exposure',()=>{
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock,order:{symbol:'SPY',side:'buy',notional_usd:101}}).reason,'MONEY_LIMIT');
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock,positions:[{symbol:'SPY',market_value:'950'}],order:{symbol:'SPY',side:'buy',notional_usd:60}}).reason,'HIGH_RISK');
});

test('blocks shorting and bad account state',()=>{
  assert.equal(evaluateAlpacaPaperOrder({context,account,clock,positions:[],order:{symbol:'SPY',side:'sell',qty:1,notional_usd:10}}).reason,'HIGH_RISK');
  assert.equal(evaluateAlpacaPaperOrder({context,account:{...account,trading_blocked:true},clock,order:{symbol:'SPY',side:'buy',notional_usd:1}}).reason,'HIGH_RISK');
});
