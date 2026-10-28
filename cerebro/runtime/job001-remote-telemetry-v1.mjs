import fs from 'node:fs';

const PREPROD = 'PREPROD';
const STATE_TYPE = 'CEREBRO_JOB001_SUPERVISOR_TELEMETRY_V1';
const DEFAULT_TTL_MS = 120_000;
const DEFAULT_TABLE = 'cerebro_job001_telemetry_preprod';

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function integerOrNull(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function bool(value) { return value === true; }

function sanitizeUsefulWork(value = {}) {
  return Object.freeze({
    scheduling_strategy: typeof value.scheduling_strategy === 'string' ? value.scheduling_strategy : null,
    model_capacity: integerOrNull(value.model_capacity),
    target_active_backlog: integerOrNull(value.target_active_backlog),
    useful_queued: integerOrNull(value.useful_queued),
    useful_running: integerOrNull(value.useful_running),
    queue_pressure: numberOrNull(value.queue_pressure),
    starvation: bool(value.starvation),
  });
}

export function sanitizeDynamicConcurrencyV1(value = {}) {
  const provider = value?.max_provider_concurrency;
  return Object.freeze({
    target_global_concurrency: integerOrNull(value.target_global_concurrency),
    max_global_concurrency: integerOrNull(value.max_global_concurrency),
    max_company_concurrency: integerOrNull(value.max_company_concurrency),
    max_deepseek_concurrency: integerOrNull(provider?.deepseek),
    max_repo_write_concurrency: integerOrNull(value.max_repo_write_concurrency),
    decision: typeof value.decision === 'string' ? value.decision : null,
  });
}

function browserReadiness(browserHealth) {
  if (!browserHealth || typeof browserHealth !== 'object' || Array.isArray(browserHealth)) {
    return Object.freeze({ browser_ok: false, browser_readiness: 'UNOBSERVED' });
  }
  const status = String(browserHealth.status || '').toUpperCase();
  const transport = String(browserHealth.cloud_transport_status || '').toUpperCase();
  const paired = browserHealth.paired !== false;
  const online = browserHealth.online !== false;
  const browserRunning = browserHealth.chrome_running !== false && browserHealth.browser_running !== false;
  const ok = ['GREEN', 'HEALTHY', 'OK'].includes(status) && transport === 'ONLINE' && paired && online && browserRunning;
  return Object.freeze({ browser_ok: ok, browser_readiness: ok ? 'READY' : 'DEGRADED' });
}

export function buildJob001RemoteTelemetryV1({ heartbeat, device_id, browser_health = null, ttl_ms = DEFAULT_TTL_MS, now_ms = Date.now() } = {}) {
  if (!heartbeat || typeof heartbeat !== 'object' || Array.isArray(heartbeat)) throw new TypeError('heartbeat required');
  if (heartbeat.environment !== PREPROD) throw new Error('JOB001_REMOTE_TELEMETRY_PREPROD_ONLY');
  if (heartbeat.trading_access === true) throw new Error('JOB001_REMOTE_TELEMETRY_TRADING_DENIED');
  if (heartbeat.prod_authorized === true || heartbeat.prod_write_authorized === true) throw new Error('JOB001_REMOTE_TELEMETRY_PROD_WRITE_DENIED');
  if (!Number.isSafeInteger(ttl_ms) || ttl_ms < 1_000 || ttl_ms > DEFAULT_TTL_MS) throw new TypeError('ttl_ms must be integer 1000..120000');
  const updatedAt = Date.parse(requiredString(heartbeat.updated_at, 'heartbeat.updated_at'));
  if (!Number.isFinite(updatedAt)) throw new Error('JOB001_REMOTE_TELEMETRY_TIMESTAMP_INVALID');
  const ageMs = Math.max(0, now_ms - updatedAt);
  if (ageMs > ttl_ms) throw new Error(`JOB001_REMOTE_TELEMETRY_STALE:${ageMs}`);
  const browser = browserReadiness(browser_health);
  const useful = sanitizeUsefulWork(heartbeat.useful_work);
  const dynamic = sanitizeDynamicConcurrencyV1(heartbeat.dynamic_concurrency);
  const expiresAt = new Date(updatedAt + ttl_ms).toISOString();
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: STATE_TYPE,
    company_id: requiredString(heartbeat.company_id, 'heartbeat.company_id'),
    engine_id: requiredString(heartbeat.engine_id, 'heartbeat.engine_id'),
    environment: PREPROD,
    version: requiredString(heartbeat.version, 'heartbeat.version'),
    device_id: requiredString(device_id, 'device_id'),
    updated_at: new Date(updatedAt).toISOString(),
    expires_at: expiresAt,
    status: typeof heartbeat.status === 'string' ? heartbeat.status : 'UNKNOWN',
    useful_work: useful,
    dynamic_concurrency: dynamic,
    browser_ok: browser.browser_ok,
    browser_readiness: browser.browser_readiness,
    work_pump_mode: typeof heartbeat.work_pump_mode === 'string' ? heartbeat.work_pump_mode : null,
    kill_switch_present: bool(heartbeat.kill_switch_present),
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
  });
}

function endpoint(baseUrl, table = DEFAULT_TABLE) {
  const base = requiredString(baseUrl, 'supabase_url').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)) throw new Error('JOB001_REMOTE_TELEMETRY_SUPABASE_URL_DENIED');
  if (table !== DEFAULT_TABLE) throw new Error('JOB001_REMOTE_TELEMETRY_TABLE_DENIED');
  return `${base}/rest/v1/${table}?on_conflict=company_id,engine_id,environment,device_id`;
}

export async function publishJob001RemoteTelemetryV1({ telemetry, supabase_url, api_key, fetch_impl = globalThis.fetch } = {}) {
  if (typeof fetch_impl !== 'function') throw new TypeError('fetch_impl required');
  const key = requiredString(api_key, 'api_key');
  if (!telemetry || telemetry.state_type !== STATE_TYPE || telemetry.environment !== PREPROD) throw new Error('JOB001_REMOTE_TELEMETRY_INVALID_PROJECTION');
  if (telemetry.prod_authorized !== false || telemetry.prod_write_authorized !== false || telemetry.trading_access !== false) throw new Error('JOB001_REMOTE_TELEMETRY_POLICY_DENIED');
  const response = await fetch_impl(endpoint(supabase_url), {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(telemetry),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response?.ok) throw new Error(`JOB001_REMOTE_TELEMETRY_PUBLISH_FAILED:${response?.status ?? 'NO_STATUS'}`);
  return Object.freeze({ published: true, transport: 'SUPABASE_PREPROD_LATEST_ONLY', status: response.status });
}

async function readBrowserHealth({ bridge_health_url = 'http://127.0.0.1:8765/health', fetch_impl = globalThis.fetch } = {}) {
  if (typeof fetch_impl !== 'function') return null;
  if (bridge_health_url !== 'http://127.0.0.1:8765/health') return null;
  try {
    const response = await fetch_impl(bridge_health_url, { method: 'GET', signal: AbortSignal.timeout(2_000) });
    if (!response?.ok) return null;
    const body = await response.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export async function publishSupervisorHeartbeatFileV1({ heartbeat_file, device_id, supabase_url, api_key, bridge_health_url, fetch_impl = globalThis.fetch, now_ms = Date.now() } = {}) {
  try {
    const heartbeat = JSON.parse(fs.readFileSync(requiredString(heartbeat_file, 'heartbeat_file'), 'utf8'));
    const browserHealth = await readBrowserHealth({ bridge_health_url, fetch_impl });
    const telemetry = buildJob001RemoteTelemetryV1({ heartbeat, device_id, browser_health: browserHealth, now_ms });
    const receipt = await publishJob001RemoteTelemetryV1({ telemetry, supabase_url, api_key, fetch_impl });
    return Object.freeze({ ok: true, telemetry, receipt });
  } catch (error) {
    return Object.freeze({ ok: false, non_fatal: true, error_code: String(error?.message || error).slice(0, 160) });
  }
}

export const JOB001_REMOTE_TELEMETRY_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/REMOTE-SANITIZED-TELEMETRY-V1',
  environment: PREPROD,
  state_type: STATE_TYPE,
  table: DEFAULT_TABLE,
  ttl_ms: DEFAULT_TTL_MS,
  latest_only: true,
  multi_company: true,
  dynamic_concurrency_whitelist_only: true,
  payloads_exposed: false,
  prompts_exposed: false,
  journals_exposed: false,
  tokens_exposed: false,
  cookies_exposed: false,
  storage_state_exposed: false,
  arbitrary_filesystem: false,
  arbitrary_shell: false,
  publisher_failure_is_fatal: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
});
