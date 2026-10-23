import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createCloudBrowserWorker } from '../runtime/cloud-browser-worker-v0.mjs';

const PHYSICAL = process.env.CEREBRO_PHYSICAL_BROWSER_E2E === '1';

test('PROD public observation canary physically opens and reads a public page without mutation', {timeout:90_000,skip:PHYSICAL?false:'DEDICATED_PHYSICAL_BROWSER_GATE_ONLY'}, async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'browser1-prod-observe-'));
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
        {type:'NAVIGATE',url:'https://example.com/',wait_until:'domcontentloaded'},
        {type:'EXTRACT_TEXT',target:{selector:'h1'}}
      ],
      capture_final_evidence:true,
      keep_session_open:false
    });
    assert.equal(result.ok,true);
    assert.equal(result.authorization.status,'AUTHORIZED');
    assert.match(String(result.results[1]),/Example Domain/i);
    assert.match(result.final_url,/^https:\/\/example\.com\/?$/);
    await fs.access(result.final_evidence);
  } finally {
    await fs.rm(temp,{recursive:true,force:true});
  }
});
