import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {executeAlpacaPaperOrder,ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT} from '../training/alpaca-paper-order-executor.mjs';

function secretFile(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpaca-paper-exec-'));
  const file=path.join(dir,'alpaca-paper.env');
  fs.writeFileSync(file,'ALPACA_PAPER_API_KEY=TEST_KEY_123\nALPACA_PAPER_API_SECRET=TEST_SECRET_456\nALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets\n',{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

const context={company_id:'fenix-capital',engine_id:'LAB-TRD',environment:'LAB',version:'0.1.0'};
const account={status:'ACTIVE',trading_blocked:false,account_blocked:false};
const clock={is_open:true};
const order={symbol:'SPY',side:'buy',notional_usd:1};

test('contract is Paper-only and fail-safe by default',()=>{
  assert.equal(ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT.paper_only,true);
  assert.equal(ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT.live_endpoint_blocked,true);
  assert.equal(ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT.default_execution,false);
  assert.equal(ALPACA_PAPER_ORDER_EXECUTOR_CONTRACT.additional_cost_target_eur,0);
});

test('dry run returns ready without network or credentials',async()=>{
  let called=false;
  const r=await executeAlpacaPaperOrder({context,account,clock,order,fetchImpl:async()=>{called=true;}});
  assert.equal(r.status,'GREEN');
  assert.equal(r.decision,'PAPER_ORDER_READY');
  assert.equal(r.execution_attempted,false);
  assert.equal(called,false);
});

test('closed market blocks before credentials or network',async()=>{
  let called=false;
  const r=await executeAlpacaPaperOrder({context,account,clock:{is_open:false},order,execute:true,fetchImpl:async()=>{called=true;}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.reason,'HIGH_RISK');
  assert.equal(r.detail,'market_closed');
  assert.equal(called,false);
});

test('kill switch blocks before network',async()=>{
  let called=false;
  const r=await executeAlpacaPaperOrder({context,account,clock,order,kill_switch:true,execute:true,fetchImpl:async()=>{called=true;}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.reason,'SECURITY_INCIDENT');
  assert.equal(called,false);
});

test('approved Paper order submits only POST to Paper endpoint and sanitizes response',async()=>{
  const file=secretFile();
  let url='',opts;
  const fetchImpl=async(u,o)=>{url=u;opts=o;return {ok:true,status:200,json:async()=>({id:'paper-order-id',client_order_id:'cerebro-test-1',symbol:'SPY',side:'buy',type:'market',time_in_force:'day',status:'accepted',notional:'1',qty:null,submitted_at:'2026-09-11T13:30:00Z',account_number:'SHOULD_NOT_LEAK'})}};
  const r=await executeAlpacaPaperOrder({context,account,clock,order:{...order,client_order_id:'cerebro-test-1'},execute:true,file,fetchImpl});
  assert.equal(url,'https://paper-api.alpaca.markets/v2/orders');
  assert.equal(opts.method,'POST');
  assert.equal(r.status,'GREEN');
  assert.equal(r.decision,'PAPER_ORDER_SUBMITTED');
  const text=JSON.stringify(r);
  assert.equal(text.includes('TEST_KEY_123'),false);
  assert.equal(text.includes('TEST_SECRET_456'),false);
  assert.equal(text.includes('SHOULD_NOT_LEAK'),false);
});

test('oversized order is blocked by risk gate before network',async()=>{
  let called=false;
  const r=await executeAlpacaPaperOrder({context,account,clock,order:{symbol:'SPY',side:'buy',notional_usd:101},execute:true,fetchImpl:async()=>{called=true;}});
  assert.equal(r.status,'HUMAN_REQUIRED');
  assert.equal(r.reason,'MONEY_LIMIT');
  assert.equal(called,false);
});
