import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureAlpacaPaperSnapshot,ALPACA_PAPER_SNAPSHOT_CONTRACT} from '../training/alpaca-paper-snapshot.mjs';

function secretFile(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpaca-paper-snapshot-'));
  const file=path.join(dir,'alpaca-paper.env');
  fs.writeFileSync(file,'ALPACA_PAPER_API_KEY=TEST_KEY_123\nALPACA_PAPER_API_SECRET=TEST_SECRET_456\nALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets\n',{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

test('snapshot contract is Paper-only read-only zero-cost',()=>{
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.paper_only,true);
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.read_only,true);
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.external_writes,false);
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.live_endpoint_blocked,true);
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.order_mutation_forbidden,true);
  assert.equal(ALPACA_PAPER_SNAPSHOT_CONTRACT.additional_cost_target_eur,0);
});

test('snapshot captures four sanitized GET resources deterministically',async()=>{
  const file=secretFile();
  const calls=[];
  const fetchImpl=async(u,o)=>{
    calls.push([u,o.method]);
    if(u.endsWith('/v2/account'))return {ok:true,status:200,json:async()=>({status:'ACTIVE',currency:'USD',cash:'10',equity:'11',buying_power:'40',trading_blocked:false,account_blocked:false,account_number:'HIDDEN'})};
    if(u.endsWith('/v2/positions'))return {ok:true,status:200,json:async()=>([])};
    if(u.endsWith('/v2/clock'))return {ok:true,status:200,json:async()=>({is_open:false,timestamp:'T'})};
    return {ok:true,status:200,json:async()=>([])};
  };
  const r=await captureAlpacaPaperSnapshot({file,fetchImpl,now:()=> '2026-09-11T11:00:00.000Z'});
  assert.equal(r.status,'GREEN');
  assert.equal(r.captured_at,'2026-09-11T11:00:00.000Z');
  assert.deepEqual(r.resources,['account','positions','clock','orders']);
  assert.equal(calls.length,4);
  assert.equal(calls.every(([,m])=>m==='GET'),true);
  const s=JSON.stringify(r);
  assert.equal(s.includes('HIDDEN'),false);
  assert.equal(s.includes('TEST_KEY_123'),false);
  assert.equal(s.includes('TEST_SECRET_456'),false);
});

test('snapshot fails closed if any read fails',async()=>{
  const file=secretFile();
  let count=0;
  const fetchImpl=async()=>{count++;return count===2?{ok:false,status:503,json:async()=>({message:'down'})}:{ok:true,status:200,json:async()=>({status:'ACTIVE'})};};
  await assert.rejects(()=>captureAlpacaPaperSnapshot({file,fetchImpl}),/HTTP 503/);
});
