import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createCloudBrowserWorker, getCloudBrowserWorkerCapabilities } from '../runtime/cloud-browser-worker-v0.mjs';

function authorizedJob(baseUrl, roots, overrides = {}) {
  return {
    request_id: `req-${Date.now()}`,
    audit_id: `audit-${Date.now()}`,
    company_id: 'fenix',
    identity_id: 'test-identity',
    environment: 'PREPROD',
    browser_profile_id: 'fenix-test-preprod',
    profile_scope: { company_id: 'fenix', identity_id: 'test-identity', environment: 'PREPROD' },
    engine_id: 'TEST-001',
    canonical_engine_ids: ['TEST-001'],
    kill_switch_enabled: true,
    browser_binding: { healthy: true, kill_switch_enabled: true, fresh_attestation: true },
    operation: { kind: 'ROUTINE_MUTATION', incremental_spend_eur: 0 },
    engine_authority: {
      browser_use_authorized: true,
      session_binding_authorized: true,
      operation_authorized: true,
      prod_mutation_authorized: false,
      promotion_gate_green: false,
      rollback_ready: true,
      observability_ready: true,
      audit_ready: true,
      idempotency_proven: true
    },
    capture_final_evidence: true,
    ...overrides
  };
}

async function fixtureServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/download.txt') {
      res.writeHead(200, { 'content-type': 'text/plain', 'content-disposition': 'attachment; filename="cerebro-test.txt"' });
      res.end('CEREBRO_BROWSER_DOWNLOAD_OK');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><body>
      <input id="name" aria-label="Nombre" />
      <button id="hello" onclick="document.querySelector('#out').textContent='Hola '+document.querySelector('#name').value">Saludar</button>
      <div id="out">EMPTY</div>
      <input id="file" type="file" aria-label="Archivo" onchange="document.querySelector('#fileout').textContent=this.files[0]?.name||'NONE'" />
      <div id="fileout">NONE</div>
      <button id="remember" onclick="localStorage.setItem('cerebroPersist','YES'); document.querySelector('#persist').textContent='YES'">Recordar</button>
      <div id="persist">NO</div>
      <a id="download" href="/download.txt" download>Descargar</a>
      <script>if(localStorage.getItem('cerebroPersist')==='YES') document.querySelector('#persist').textContent='YES';</script>
    </body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('capability contract is broad but fail-closed on bypasses', () => {
  const caps = getCloudBrowserWorkerCapabilities();
  assert.equal(caps.backend, 'PLAYWRIGHT_CHROMIUM');
  assert.equal(caps.persistent_profiles, true);
  assert.equal(caps.uploads, true);
  assert.equal(caps.downloads, true);
  assert.equal(caps.multi_tab, true);
  assert.equal(caps.captcha_bypass, false);
  assert.equal(caps.mfa_bypass, false);
  assert.equal(caps.arbitrary_page_javascript, false);
});

test('real Chromium performs navigation, form, upload, download, evidence and persistent session', { timeout: 90_000 }, async () => {
  const { server, baseUrl } = await fixtureServer();
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'cerebro-browser-'));
  const profiles = path.join(temp, 'profiles');
  const artifacts = path.join(temp, 'artifacts');
  const uploadFile = path.join(temp, 'upload.txt');
  await fs.writeFile(uploadFile, 'UPLOAD_OK');
  const audit = [];

  try {
    const worker1 = createCloudBrowserWorker({ profiles_root: profiles, artifacts_root: artifacts, headless: true, audit_sink: async e => audit.push(e) });
    const first = await worker1.execute(authorizedJob(baseUrl, { profiles, artifacts }, {
      actions: [
        { type: 'NAVIGATE', url: baseUrl },
        { type: 'FILL', target: { label: 'Nombre' }, value: 'CEREBRO' },
        { type: 'CLICK', target: { text: 'Saludar', exact: true } },
        { type: 'EXTRACT_TEXT', target: { selector: '#out' } },
        { type: 'UPLOAD', target: { label: 'Archivo' }, files: uploadFile },
        { type: 'EXTRACT_TEXT', target: { selector: '#fileout' } },
        { type: 'CLICK', target: { selector: '#remember' } },
        { type: 'DOWNLOAD_CLICK', target: { selector: '#download' } },
        { type: 'SCREENSHOT', label: 'first-run' }
      ]
    }));

    assert.equal(first.ok, true);
    assert.equal(first.results[3], 'Hola CEREBRO');
    assert.equal(first.results[5], 'upload.txt');
    assert.match(await fs.readFile(first.results[7].file, 'utf8'), /CEREBRO_BROWSER_DOWNLOAD_OK/);
    await fs.access(first.results[8].file);
    await fs.access(first.final_evidence);

    const worker2 = createCloudBrowserWorker({ profiles_root: profiles, artifacts_root: artifacts, headless: true, audit_sink: async e => audit.push(e) });
    const second = await worker2.execute(authorizedJob(baseUrl, { profiles, artifacts }, {
      request_id: 'req-persistence',
      audit_id: 'audit-persistence',
      actions: [
        { type: 'NAVIGATE', url: baseUrl },
        { type: 'EXTRACT_TEXT', target: { selector: '#persist' } }
      ]
    }));
    assert.equal(second.results[1], 'YES');
    assert.ok(audit.some(e => e.type === 'BROWSER_JOB_COMPLETED'));
    assert.ok(audit.some(e => e.type === 'BROWSER_ACTION'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('cross-company profile is denied before browser launch', async () => {
  const worker = createCloudBrowserWorker();
  await assert.rejects(() => worker.execute(authorizedJob('http://example.invalid', {}, {
    profile_scope: { company_id: 'other-company', identity_id: 'test-identity', environment: 'PREPROD' },
    actions: []
  })), /CROSS_COMPANY_PROFILE_DENIED/);
});

test('PROD routine mutation remains blocked until full promotion gate is green', async () => {
  const worker = createCloudBrowserWorker();
  const result = await worker.execute(authorizedJob('http://example.invalid', {}, {
    environment: 'PROD',
    profile_scope: { company_id: 'fenix', identity_id: 'test-identity', environment: 'PROD' },
    engine_authority: {
      browser_use_authorized: true,
      session_binding_authorized: true,
      operation_authorized: true,
      prod_mutation_authorized: false,
      promotion_gate_green: false,
      rollback_ready: true,
      observability_ready: true,
      audit_ready: true,
      idempotency_proven: true
    },
    actions: []
  }));
  assert.equal(result.ok, false);
  assert.equal(result.authorization.status, 'HOLD_PROD_ACTION_GATE_NOT_GREEN');
});
