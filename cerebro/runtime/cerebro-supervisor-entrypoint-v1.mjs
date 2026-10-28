import os from 'node:os';
import path from 'node:path';
import { publishSupervisorHeartbeatFileV1 } from './job001-remote-telemetry-v1.mjs';

const PREPROD = 'PREPROD';

function integer(value, fallback, { min = 1, max = 1_000_000 } = {}) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function configureSupervisor48V1(env = process.env) {
  if (env.CEREBRO_ENVIRONMENT && env.CEREBRO_ENVIRONMENT !== PREPROD) throw new Error('CEREBRO_SUPERVISOR_ENTRYPOINT_PREPROD_ONLY');
  const maxGlobal = integer(env.CEREBRO_MAX_GLOBAL_CONCURRENCY, 64, { min: 1, max: 64 });
  const target = Math.min(48, maxGlobal);
  env.CEREBRO_ENVIRONMENT = PREPROD;
  env.CEREBRO_MAX_GLOBAL_CONCURRENCY = String(maxGlobal);
  env.CEREBRO_INITIAL_GLOBAL_CONCURRENCY = String(target);
  env.CEREBRO_MAX_COMPANY_CONCURRENCY = String(Math.min(integer(env.CEREBRO_MAX_COMPANY_CONCURRENCY, 48, { min: 1, max: 64 }), 48));
  env.CEREBRO_MODEL_CAPACITY = String(Math.min(integer(env.CEREBRO_MODEL_CAPACITY, 8, { min: 1, max: 8 }), 8));
  return Object.freeze({
    environment: PREPROD,
    target_useful: 48,
    initial_global_concurrency: target,
    max_global_concurrency: maxGlobal,
    max_company_concurrency: Number(env.CEREBRO_MAX_COMPANY_CONCURRENCY),
    max_deepseek_concurrency: 8,
    max_repo_write_concurrency: 1,
    prod_authorized: false,
    trading_access: false,
  });
}

export function telemetryConfigFromEnvV1(env = process.env) {
  const userProfile = nonEmpty(env.USERPROFILE) || os.homedir();
  const stateDir = nonEmpty(env.CEREBRO_SUPERVISOR_STATE_DIR) || path.join(userProfile, 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime');
  const enabled = String(env.CEREBRO_REMOTE_TELEMETRY || 'AUTO').toUpperCase() !== 'NO';
  return Object.freeze({
    enabled,
    heartbeat_file: path.join(stateDir, 'heartbeat.json'),
    device_id: nonEmpty(env.CEREBRO_DEVICE_ID) || nonEmpty(env.CEREBRO_BROWSER_DEVICE_ID),
    supabase_url: nonEmpty(env.CEREBRO_PREPROD_SUPABASE_URL) || nonEmpty(env.SUPABASE_URL),
    api_key: nonEmpty(env.CEREBRO_PREPROD_SUPABASE_SERVICE_ROLE_KEY) || nonEmpty(env.SUPABASE_SERVICE_ROLE_KEY),
    bridge_health_url: 'http://127.0.0.1:8765/health',
    interval_ms: integer(env.CEREBRO_REMOTE_TELEMETRY_INTERVAL_MS, 15_000, { min: 5_000, max: 60_000 }),
  });
}

export function canPublishRemoteTelemetryV1(config) {
  return Boolean(config?.enabled && config?.device_id && config?.supabase_url && config?.api_key);
}

export async function startSupervisorEntrypointV1({ env = process.env, import_supervisor = async () => import('./cerebro-supervisor-daemon-v0.mjs'), publisher = publishSupervisorHeartbeatFileV1, set_interval = setInterval } = {}) {
  const limits = configureSupervisor48V1(env);
  const telemetry = telemetryConfigFromEnvV1(env);
  await import_supervisor();
  let inFlight = false;
  let lastReceipt = Object.freeze({ ok: false, non_fatal: true, error_code: canPublishRemoteTelemetryV1(telemetry) ? 'NOT_PUBLISHED_YET' : 'REMOTE_TELEMETRY_CONFIG_MISSING' });

  const tick = async () => {
    if (inFlight || !canPublishRemoteTelemetryV1(telemetry)) return lastReceipt;
    inFlight = true;
    try {
      lastReceipt = await publisher({
        heartbeat_file: telemetry.heartbeat_file,
        device_id: telemetry.device_id,
        supabase_url: telemetry.supabase_url,
        api_key: telemetry.api_key,
        bridge_health_url: telemetry.bridge_health_url,
      });
      return lastReceipt;
    } catch (error) {
      lastReceipt = Object.freeze({ ok: false, non_fatal: true, error_code: String(error?.message || error).slice(0, 160) });
      return lastReceipt;
    } finally {
      inFlight = false;
    }
  };

  if (canPublishRemoteTelemetryV1(telemetry)) {
    set_interval(() => { void tick(); }, telemetry.interval_ms)?.unref?.();
    void tick();
  }

  return Object.freeze({
    status: 'STARTED',
    limits,
    telemetry: Object.freeze({
      enabled: telemetry.enabled,
      configured: canPublishRemoteTelemetryV1(telemetry),
      interval_ms: telemetry.interval_ms,
      transport: 'SUPABASE_PREPROD_LATEST_ONLY',
      publisher_failure_is_fatal: false,
    }),
    tick,
    get last_receipt() { return lastReceipt; },
    second_daemon: false,
    second_scheduler: false,
    prod_authorized: false,
    trading_access: false,
  });
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('cerebro-supervisor-entrypoint-v1.mjs')) {
  startSupervisorEntrypointV1().catch(error => {
    console.error(`CEREBRO_SUPERVISOR_ENTRYPOINT_FATAL:${String(error?.message || error).slice(0, 200)}`);
    process.exitCode = 1;
  });
}

export const CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT = Object.freeze({
  capability: 'RUNTIME-001/JOB-001/SUPERVISOR-ENTRYPOINT-V1',
  environment: PREPROD,
  wraps_existing_daemon_v0: true,
  preserves_v0_for_rollback: true,
  target_useful: 48,
  max_global: 64,
  max_company: 48,
  max_deepseek: 8,
  max_repo_write: 1,
  remote_telemetry: 'SANITIZED_LATEST_ONLY',
  remote_telemetry_ttl_ms: 120_000,
  publisher_failure_is_fatal: false,
  second_daemon: false,
  second_scheduler: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
