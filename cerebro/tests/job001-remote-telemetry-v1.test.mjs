import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildJob001RemoteTelemetryV1,
  publishJob001RemoteTelemetryV1,
  publishSupervisorHeartbeatFileV1,
  JOB001_REMOTE_TELEMETRY_V1_CONTRACT,
} from '../runtime/job001-remote-telemetry-v1.mjs';

const NOW = Date.parse('2026-10-28T17:00:00.000Z');
const HEARTBEAT = Object.freeze({
  schema_version: '1.8',
  service: 'CEREBRO Continuous Supervisor',
  status: 'GREEN',
  company_id: 'fenix',
  engine_id: 'RUNTIME-001',
  environment: 'PREPROD',
  version: 'v0',
  updated_at: '2026-10-28T16:59:30.000Z',
  useful_work: {
    scheduling_strategy: 'ADAPTIVE_USEFUL_THROUGHPUT',
    model_capacity: 8,
    target_active_backlog: 48,
    useful_queued: 40,
    useful_running: 8,
    queue_pressure: 1,
    starvation: false,
    secret_nested: 'must-not-escape',
  },
  dynamic_concurrency: {
    environment: 'PREPROD',
    target_global_concurrency: 48,
    max_global_concurrency: 64,
    max_company_concurrency: 48,
    max_resource_concurrency: { CPU: 32, IO: 48 },
    max_provider_concurrency: { deepseek: 8, secret_provider: 99 },
    max_repo_write_concurrency: 1,
    hard_cost_cap_eur: 100,
    decision: 'HOLD',
    arbitrary_secret_field: 'deny',
  },
  work_pump_mode: 'AUTO_KEY_PRESENT',
  kill_switch_present: true,
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
  payload: { prompt: 'do not expose' },
  token: 'do not expose',
});

const BROWSER = Object.freeze({
  status: 'HEALTHY',
  cloud_transport_status: 'ONLINE',
  paired: true,
  online: true,
  chrome_running: true,
  cookies: 'must-not-escape',
});

test('projection is PREPROD latest-only, TTL bounded and explicitly whitelisted', () => {
  const view = buildJob001RemoteTelemetryV1({ heartbeat: HEARTBEAT, device_id: 'desktop-test', browser_health: BROWSER, now_ms: NOW });
  assert.equal(view.state_type, 'CEREBRO_JOB001_SUPERVISOR_TELEMETRY_V1');
  assert.equal(view.environment, 'PREPROD');
  assert.equal(view.company_id, 'fenix');
  assert.equal(view.useful_work.target_active_backlog, 48);
  assert.equal(view.useful_work.useful_running, 8);
  assert.equal(view.dynamic_concurrency.target_global_concurrency, 48);
  assert.equal(view.dynamic_concurrency.max_global_concurrency, 64);
  assert.equal(view.dynamic_concurrency.max_company_concurrency, 48);
  assert.equal(view.dynamic_concurrency.max_deepseek_concurrency, 8);
  assert.equal(view.dynamic_concurrency.max_repo_write_concurrency, 1);
  assert.equal(view.browser_ok, true);
  assert.equal(view.browser_readiness, 'READY');
  assert.equal(Date.parse(view.expires_at) - Date.parse(view.updated_at), 120_000);
  assert.equal('payload' in view, false);
  assert.equal('token' in view, false);
  assert.equal('max_resource_concurrency' in view.dynamic_concurrency, false);
  assert.equal('secret_provider' in view.dynamic_concurrency, false);
  assert.equal('arbitrary_secret_field' in view.dynamic_concurrency, false);
  assert.equal('secret_nested' in view.useful_work, false);
  assert.equal(view.prod_authorized, false);
  assert.equal(view.prod_write_authorized, false);
  assert.equal(view.trading_access, false);
});

test('projection fails closed for PROD, Trading, stale data and TTL above 120s', () => {
  assert.throws(() => buildJob001RemoteTelemetryV1({ heartbeat: { ...HEARTBEAT, environment: 'PROD' }, device_id: 'd', now_ms: NOW }), /PREPROD_ONLY/);
  assert.throws(() => buildJob001RemoteTelemetryV1({ heartbeat: { ...HEARTBEAT, trading_access: true }, device_id: 'd', now_ms: NOW }), /TRADING_DENIED/);
  assert.throws(() => buildJob001RemoteTelemetryV1({ heartbeat: HEARTBEAT, device_id: 'd', now_ms: NOW + 180_000 }), /STALE/);
  assert.throws(() => buildJob001RemoteTelemetryV1({ heartbeat: HEARTBEAT, device_id: 'd', now_ms: NOW, ttl_ms: 121_000 }), /ttl_ms/);
});

test('publisher upserts only the canonical PREPROD latest-only table and never returns the key', async () => {
  let captured = null;
  const fetch_impl = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 204 };
  };
  const telemetry = buildJob001RemoteTelemetryV1({ heartbeat: HEARTBEAT, device_id: 'desktop-test', browser_health: BROWSER, now_ms: NOW });
  const receipt = await publishJob001RemoteTelemetryV1({ telemetry, supabase_url: 'https://exampleproject.supabase.co', api_key: 'server-secret-ref-value', fetch_impl });
  assert.equal(receipt.published, true);
  assert.match(captured.url, /cerebro_job001_telemetry_preprod/);
  assert.match(captured.url, /on_conflict=company_id,engine_id,environment,device_id/);
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.prefer, 'resolution=merge-duplicates,return=minimal');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.company_id, 'fenix');
  assert.equal(JSON.stringify(receipt).includes('server-secret-ref-value'), false);
  assert.equal(JSON.stringify(body).includes('server-secret-ref-value'), false);
});

test('heartbeat-file publisher is non-fatal when transport is absent or rejected', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-job001-remote-'));
  const file = path.join(dir, 'heartbeat.json');
  fs.writeFileSync(file, JSON.stringify(HEARTBEAT));
  const result = await publishSupervisorHeartbeatFileV1({
    heartbeat_file: file,
    device_id: 'desktop-test',
    supabase_url: 'https://exampleproject.supabase.co',
    api_key: 'server-secret-ref-value',
    now_ms: NOW,
    fetch_impl: async url => String(url).startsWith('http://127.0.0.1:8765/')
      ? { ok: true, async json() { return BROWSER; } }
      : { ok: false, status: 503 },
  });
  assert.equal(result.ok, false);
  assert.equal(result.non_fatal, true);
  assert.match(result.error_code, /PUBLISH_FAILED:503/);
});

test('contract preserves zero-cost and governance boundaries', () => {
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.ttl_ms, 120_000);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.latest_only, true);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.multi_company, true);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.dynamic_concurrency_whitelist_only, true);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.publisher_failure_is_fatal, false);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.additional_cost_eur, 0);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.prod_authorized, false);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.prod_write_authorized, false);
  assert.equal(JOB001_REMOTE_TELEMETRY_V1_CONTRACT.trading_access, false);
});
