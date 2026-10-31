import os from 'node:os';
import path from 'node:path';
import { publishSupervisorHeartbeatFileV1 } from './job001-remote-telemetry-v1.mjs';
import { installMaintenanceDrainV1 } from './job001-maintenance-drain-v1.mjs';

const PREPROD = 'PREPROD';
const VERIFIED_GLOBAL_CAP = 360;
const DEEPSEEK_CAP = 8;
const REPO_WRITE_CAP = 1;

function integer(value, fallback, { min = 1, max = 1_000_000 } = {}) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function configureSupervisor360V1(env = process.env) {
  if (env.CEREBRO_SUPERVISOR_ENV && String(env.CEREBRO_SUPERVISOR_ENV).toUpperCase() !== PREPROD) {
    throw new Error('CEREBRO_SUPERVISOR_ENTRYPOINT_PREPROD_ONLY');
  }
  if (env.CEREBRO_ENVIRONMENT && String(env.CEREBRO_ENVIRONMENT).toUpperCase() !== PREPROD) {
    throw new Error('CEREBRO_SUPERVISOR_ENTRYPOINT_PREPROD_ONLY');
  }

  const maxGlobal = integer(env.CEREBRO_MAX_CONCURRENCY, VERIFIED_GLOBAL_CAP, { min: 1, max: VERIFIED_GLOBAL_CAP });
  const target = Math.min(VERIFIED_GLOBAL_CAP, maxGlobal);
  const maxDeepSeek = Math.min(DEEPSEEK_CAP, maxGlobal);

  env.CEREBRO_ENVIRONMENT = PREPROD;
  env.CEREBRO_SUPERVISOR_ENV = PREPROD;
  env.CEREBRO_MAX_CONCURRENCY = String(maxGlobal);
  env.CEREBRO_INITIAL_CONCURRENCY = String(target);
  env.CEREBRO_MAX_PER_COMPANY = String(target);
  env.CEREBRO_MAX_DEEPSEEK_CONCURRENCY = String(maxDeepSeek);
  env.CEREBRO_MAX_REPO_WRITE_CONCURRENCY = String(REPO_WRITE_CAP);

  return Object.freeze({
    environment: PREPROD,
    target_useful: VERIFIED_GLOBAL_CAP,
    initial_global_concurrency: target,
    max_global_concurrency: maxGlobal,
    max_company_concurrency: target,
    max_deepseek_concurrency: maxDeepSeek,
    max_repo_write_concurrency: REPO_WRITE_CAP,
    prod_authorized: false,
    trading_access: false,
  });
}

// Backward-compatible exports for older callers; semantics now follow the verified 360-cap contract.
export const configureSupervisor180V1 = configureSupervisor360V1;
export const configureSupervisor48V1 = configureSupervisor360V1;

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

export async function startSupervisorEntrypointV1({ env = process.env, import_supervisor = async () => import('./cerebro-supervisor-daemon-v0.mjs'), publisher = publishSupervisorHeartbeatFileV1, set_interval = setInterval, install_drain = installMaintenanceDrainV1 } = {}) {
  const limits = configureSupervisor360V1(env);
  const drain = install_drain({ env });
  const telemetry = telemetryConfigFromEnvV1(env);
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

  let telemetryTimer = null;
  if (canPublishRemoteTelemetryV1(telemetry)) {
    telemetryTimer = set_interval(() => { void tick(); }, telemetry.interval_ms);
    telemetryTimer?.unref?.();
    void tick();
  }

  await import_supervisor();

  return Object.freeze({
    status: 'EXITED',
    limits,
    drain,
    telemetry: Object.freeze({
      enabled: telemetry.enabled,
      configured: canPublishRemoteTelemetryV1(telemetry),
      interval_ms: telemetry.interval_ms,
      transport: 'SUPABASE_PREPROD_LATEST_ONLY',
      publisher_failure_is_fatal: false,
    }),
    tick,
    telemetry_timer_created: Boolean(telemetryTimer),
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
  publisher_starts_before_long_lived_daemon_import: true,
  maintenance_drain_installed_before_daemon_import: true,
  maintenance_drain_preserves_running_leases: true,
  maintenance_drain_blocks_new_claims: true,
  maintenance_drain_suppresses_adaptive_refill: true,
  maintenance_drain_resume_is_remove_sentinel: true,
  daemon_env_keys: Object.freeze({
    max_global: 'CEREBRO_MAX_CONCURRENCY',
    initial_global: 'CEREBRO_INITIAL_CONCURRENCY',
    max_company: 'CEREBRO_MAX_PER_COMPANY',
    max_deepseek: 'CEREBRO_MAX_DEEPSEEK_CONCURRENCY',
    max_repo_write: 'CEREBRO_MAX_REPO_WRITE_CONCURRENCY',
  }),
  target_useful: VERIFIED_GLOBAL_CAP,
  max_global: VERIFIED_GLOBAL_CAP,
  max_company: VERIFIED_GLOBAL_CAP,
  max_deepseek: DEEPSEEK_CAP,
  max_repo_write: REPO_WRITE_CAP,
  remote_telemetry: 'SANITIZED_LATEST_ONLY',
  remote_telemetry_ttl_ms: 120_000,
  publisher_failure_is_fatal: false,
  second_daemon: false,
  second_scheduler: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
