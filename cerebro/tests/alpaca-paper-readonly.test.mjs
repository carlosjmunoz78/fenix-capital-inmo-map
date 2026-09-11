import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readAlpacaPaper,ALPACA_PAPER_READONLY_CONTRACT} from '../training/alpaca-paper-readonly.mjs';

function secretFile(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpaca-paper-readonly-'));
  const file=path.join(dir,'alpaca-paper.env');
  fs.writeFileSync(file,'ALPACA_PAPER_API_KEY=TEST_KEY_123\nALPACA_PAPER_API_SECRET=TEST_SECRET_456\nALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets\n',{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

test('contract is Paper-only GET-only zero-cost',()=>{
  assert.equal(ALPACA_PAPER_READONLY_CONTRACT.paper_only,true);
  assert.deepEqual(ALPACA_PAPER_READONLY_CONTRACT.methods,['GET']);
  assert.equal(ALPACA_PAPER_READONLY_CONTRACT.live_endpoint_blocked,true);
  assert.equal(ALPACA_PAPER_READONLY_CONTRACT.order_mutation_forbidden,true);
  assert.equal(ALPACA_PAPER_READONLY_CONTRACT.additional_cost_target_eur,0);
});

test('account read uses only Paper GET and sanitizes output',async()=>{
  const file=secretFile();
  let url='',opts;
  const fetchImpl=async(u,o)=>{url=u;opts=o;return {ok:true,status:200,json:async()=>({status:'ACTIVE',currency:'USD',cash:'1',equity:'2',buying_power:'3',trading_blocked:false,account_blocked:false,account_number:'SECRET_ACCOUNT'})}};
  const r=await readAlpacaPaper('account',{file,fetchImpl});
  assert.equal(url,'https://paper-api.alpaca.markets/v2/account');
  assert.equal(opts.method,'GET');
  assert.equal(r.status,'GREEN');
  assert.equal(r.order_mutation_forbidden,true);
  assert.equal(JSON.stringify(r).includes('SECRET_ACCOUNT'),false);
  assert.equal(JSON.stringify(r).includes('TEST_KEY_123'),false);
  assert.equal(JSON.stringify(r).includes('TEST_SECRET_456'),false);
});

test('positions clock and orders are read-only allowlisted',async()=>{
  const file=secretFile();
  const seen=[];
  const fetchImpl=async(u,o)=>{seen.push([u,o.method]);if(u.includes('/positions'))return {ok:true,status:200,json:async()=>([{symbol:'AAPL',qty:'1',side:'long'}])};if(u.includes('/clock'))return {ok:true,status:200,json:async()=>({is_open:true})};return {ok:true,status:200,json:async()=>([{symbol:'MSFT',side:'buy',type:'market',status:'filled',qty:'1'}])};
  for(const resource of ['positions','clock','orders']){const r=await readAlpacaPaper(resource,{file,fetchImpl});assert.equal(r.status,'GREEN');}
  assert.equal(seen.every(([,m])=>m==='GET'),true);
});

test('write-like or unknown resources fail closed before network',async()=>{
  const file=secretFile();
  let called=false;
  await assert.rejects(()=>readAlpacaPaper('submit_order',{file,fetchImpl:async()=>{called=true;}}),/not allowed/);
  assert.equal(called,false);
});

test('non-200 fails closed',async()=>{
  const file=secretFile();
  await assert.rejects(()=>readAlpacaPaper('account',{file,fetchImpl:async()=>({ok:false,status:401,json:async()=>({message:'unauthorized'})})}),/HTTP 401/);
});
