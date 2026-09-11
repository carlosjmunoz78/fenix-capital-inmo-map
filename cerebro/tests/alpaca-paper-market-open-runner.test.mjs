import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runPaperMarketOpenSmoke,waitForPaperMarketOpen,ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT} from '../training/alpaca-paper-market-open-runner.mjs';

function secretFile(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpaca-paper-market-open-'));
  const file=path.join(dir,'alpaca-paper.env');
  fs.writeFileSync(file,'ALPACA_PAPER_API_KEY=TEST_KEY_123\nALPACA_PAPER_API_SECRET=TEST_SECRET_456\nALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets\n',{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

function mockFetch({open=false,postOk=true}={}){
  const calls=[];
  const f=async(url,opts={})=>{
    calls.push([url,opts.method||'GET']);
    if(url.endsWith('/v2/account')) return {ok:true,status:200,json:async()=>({status:'ACTIVE',currency:'USD',cash:'100000',equity:'100000',buying_power:'400000',trading_blocked:false,account_blocked:false})};
    if(url.endsWith('/v2/positions')) return {ok:true,status:200,json:async()=>([])};
    if(url.includes('/v2/orders?')) return {ok:true,status:200,json:async()=>([])};
    if(url.endsWith('/v2/clock')) return {ok:true,status:200,json:async()=>({is_open:open,next_open:'2099-01-01T09:30:00-04:00'})};
    if(url.endsWith('/v2/orders')&&opts.method==='POST') return {ok:postOk,status:postOk?200:500,json:async()=>({id:'paper-order-1',client_order_id:'cerebro-test',symbol:'SPY',side:'buy',type:'market',time_in_force:'day',status:'accepted',notional:'1'})};
    throw new Error(`unexpected ${url}`);
  };
  f.calls=calls;
  return f;
}

test('contract is Paper-only and conservative',()=>{
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.paper_only,true);
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.live_endpoint_blocked,true);
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.smoke_notional_usd,1);
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.single_order_per_run,true);
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.dry_run_default,true);
  assert.equal(ALPACA_PAPER_MARKET_OPEN_RUNNER_CONTRACT.continuous_runtime_deployed,false);
});

test('closed market returns WAITING and never POSTs',async()=>{
  const fetchImpl=mockFetch({open:false});
  const r=await runPaperMarketOpenSmoke({symbol:'SPY',file:secretFile(),fetchImpl,execute:true});
  assert.equal(r.status,'WAITING');
  assert.equal(r.market_open,false);
  assert.equal(fetchImpl.calls.some(([,m])=>m==='POST'),false);
});

test('open market dry-run reaches ready state without POST',async()=>{
  const fetchImpl=mockFetch({open:true});
  const r=await runPaperMarketOpenSmoke({symbol:'SPY',file:secretFile(),fetchImpl,execute:false});
  assert.equal(r.status,'GREEN');
  assert.equal(r.result.decision,'PAPER_ORDER_READY');
  assert.equal(r.result.execution_attempted,false);
  assert.equal(fetchImpl.calls.some(([,m])=>m==='POST'),false);
});

test('open market execute submits one Paper order only',async()=>{
  const fetchImpl=mockFetch({open:true});
  const r=await runPaperMarketOpenSmoke({symbol:'SPY',file:secretFile(),fetchImpl,execute:true});
  assert.equal(r.status,'GREEN');
  assert.equal(r.result.decision,'PAPER_ORDER_SUBMITTED');
  assert.equal(fetchImpl.calls.filter(([,m])=>m==='POST').length,1);
  assert.equal(fetchImpl.calls.every(([u])=>u.startsWith('https://paper-api.alpaca.markets')),true);
});

test('wait loop respects minimum poll and max checks',async()=>{
  const fetchImpl=mockFetch({open:false});
  let sleeps=0;
  const r=await waitForPaperMarketOpen({symbol:'SPY',file:secretFile(),fetchImpl,execute:true,poll_interval_ms:60000,max_checks:2,sleep:async()=>{sleeps++;}});
  assert.equal(r.status,'WAITING');
  assert.equal(r.checks,2);
  assert.equal(sleeps,1);
  assert.equal(fetchImpl.calls.some(([,m])=>m==='POST'),false);
});
