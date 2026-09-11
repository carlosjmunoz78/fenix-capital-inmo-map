import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadAlpacaPaperSecrets,probeAlpacaPaper} from '../training/alpaca-paper-probe.mjs';

const TEST_KEY='TESTKEY_ABC123';
const TEST_SECRET='TESTSECRET_XYZ789';

function secretFile(base='https://paper-api.alpaca.markets'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpaca-paper-'));
  const file=path.join(dir,'alpaca-paper.env');
  fs.writeFileSync(file,`ALPACA_PAPER_API_KEY=${TEST_KEY}\nALPACA_PAPER_API_SECRET=${TEST_SECRET}\nALPACA_PAPER_BASE_URL=${base}\n`,{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

test('loads only private Paper secrets',()=>{
  const file=secretFile();
  const s=loadAlpacaPaperSecrets(file);
  assert.equal(s.baseUrl,'https://paper-api.alpaca.markets');
  assert.equal(s.apiKey,TEST_KEY);
});

test('blocks live endpoint',()=>{
  const file=secretFile('https://api.alpaca.markets');
  assert.throws(()=>loadAlpacaPaperSecrets(file),/only Alpaca Paper endpoint/);
});

test('blocks insecure secret permissions',()=>{
  const file=secretFile();
  fs.chmodSync(file,0o644);
  assert.throws(()=>loadAlpacaPaperSecrets(file),/permissions/);
});

test('probes Paper account and returns sanitized green evidence',async()=>{
  const file=secretFile();
  let calledUrl='';
  let headers;
  const fetchImpl=async(url,opts)=>{
    calledUrl=url;headers=opts.headers;
    return {ok:true,status:200,json:async()=>({status:'ACTIVE',currency:'USD',cash:'99999.97',equity:'99999.97',buying_power:'399999.88',trading_blocked:false,account_blocked:false})};
  };
  const r=await probeAlpacaPaper({file,fetchImpl});
  assert.equal(calledUrl,'https://paper-api.alpaca.markets/v2/account');
  assert.equal(headers['APCA-API-KEY-ID'],TEST_KEY);
  assert.equal(headers['APCA-API-SECRET-KEY'],TEST_SECRET);
  assert.equal(r.status,'GREEN');
  assert.equal(r.live_endpoint_blocked,true);
  assert.equal(r.credential_payload_logged,false);
  const serialized=JSON.stringify(r);
  assert.equal(serialized.includes(TEST_KEY),false);
  assert.equal(serialized.includes(TEST_SECRET),false);
});

test('fails closed on non-200',async()=>{
  const file=secretFile();
  const fetchImpl=async()=>({ok:false,status:401,json:async()=>({message:'unauthorized'})});
  await assert.rejects(()=>probeAlpacaPaper({file,fetchImpl}),/HTTP 401/);
});
