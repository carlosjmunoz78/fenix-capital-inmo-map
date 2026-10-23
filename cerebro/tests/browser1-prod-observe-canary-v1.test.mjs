import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createCloudBrowserWorker } from '../runtime/cloud-browser-worker-v0.mjs';

const PHYSICAL = process.env.CEREBRO_PHYSICAL_BROWSER_E2E === '1';

async function noAuthFixture() {
  const server=http.createServer((req,res)=>{
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end('<!doctype html><html><head><title>CEREBRO PROD OBSERVE</title></head><body><h1>CEREBRO_PROD_OBSERVE_OK</h1><p>NO_AUTH_NO_MUTATION</p></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}/public-no-auth-canary`};
}

test('PROD no-auth observation canary physically opens and reads with Chromium without mutation', {timeout:90_000,skip:PHYSICAL?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'browser1-prod-observe-'));
  const {server,url}=await noAuthFixture();
  try {
    const worker=createCloudBrowserWorker({
      profiles_root:path.join(temp,'profiles'),
      artifacts_root:path.join(temp,'artifacts'),
      headless:true,
      max_tabs:2
    });
    const result=await worker.execute({
      request_id:'browser1-prod-observe-canary',
      audit_id:'browser1-prod-observe-canary',
      company_id:'fenix',
      identity_id:'public-canary',
      environment:'PROD',
      browser_profile_id:'browser1-prod-public-canary',
      profile_scope:{company_id:'fenix',identity_id:'public-canary',environment:'PROD'},
      engine_id:'SEO-001',
      canonical_engine_ids:['SEO-001'],
      browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},
      engine_authority:{browser_use_authorized:true},
      kill_switch_enabled:true,
      operation:{kind:'OBSERVE',incremental_spend_eur:0},
      actions:[
        {type:'NAVIGATE',url,wait_until:'domcontentloaded'},
        {type:'EXTRACT_TEXT',target:{selector:'h1'}},
        {type:'EXTRACT_TEXT',target:{selector:'p'}}
      ],
      capture_final_evidence:true,
      keep_session_open:false
    });
    assert.equal(result.ok,true);
    assert.equal(result.authorization.status,'AUTHORIZED');
    assert.equal(result.results[1],'CEREBRO_PROD_OBSERVE_OK');
    assert.equal(result.results[2],'NO_AUTH_NO_MUTATION');
    assert.equal(result.final_url,url);
    await fs.access(result.final_evidence);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});
