import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureSupervisor360V1,
  configureSupervisor180V1,
  configureSupervisor48V1,
  telemetryConfigFromEnvV1,
  canPublishRemoteTelemetryV1,
  startSupervisorEntrypointV1,
  CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT,
} from '../runtime/cerebro-supervisor-entrypoint-v1.mjs';

test('entrypoint aligns the existing V0 daemon to the verified 360/360/360/8/1 PREPROD contract', () => {
  const env = {};
  const result = configureSupervisor360V1(env);
  assert.equal(result.target_useful, 360);
  assert.equal(result.initial_global_concurrency, 360);
  assert.equal(result.max_global_concurrency, 360);
  assert.equal(result.max_company_concurrency, 360);
  assert.equal(result.max_deepseek_concurrency, 8);
  assert.equal(result.max_repo_write_concurrency, 1);
  assert.equal(env.CEREBRO_ENVIRONMENT, 'PREPROD');
  assert.equal(env.CEREBRO_SUPERVISOR_ENV, 'PREPROD');
  assert.equal(env.CEREBRO_INITIAL_CONCURRENCY, '360');
  assert.equal(env.CEREBRO_MAX_CONCURRENCY, '360');
  assert.equal(env.CEREBRO_MAX_PER_COMPANY, '360');
  assert.equal(env.CEREBRO_MAX_DEEPSEEK_CONCURRENCY, '8');
  assert.equal(env.CEREBRO_MAX_REPO_WRITE_CONCURRENCY, '1');
  assert.equal('CEREBRO_INITIAL_GLOBAL_CONCURRENCY' in env, false);
  assert.equal('CEREBRO_MAX_GLOBAL_CONCURRENCY' in env, false);
  assert.equal(result.prod_authorized, false);
  assert.equal(result.trading_access, false);
});

test('legacy supervisor exports remain compatibility aliases to the 360-cap contract', () => {
  for (const configure of [configureSupervisor180V1,configureSupervisor48V1]) {
    const env = {};
    const result = configure(env);
    assert.equal(result.max_global_concurrency, 360);
    assert.equal(env.CEREBRO_MAX_CONCURRENCY, '360');
  }
});

test('entrypoint preserves a stricter lower global safety cap', () => {
  const env = { CEREBRO_MAX_CONCURRENCY: '32' };
  const result = configureSupervisor360V1(env);
  assert.equal(result.initial_global_concurrency, 32);
  assert.equal(result.max_global_concurrency, 32);
  assert.equal(result.max_company_concurrency, 32);
  assert.equal(result.max_deepseek_concurrency, 8);
  assert.equal(env.CEREBRO_INITIAL_CONCURRENCY, '32');
  assert.equal(env.CEREBRO_MAX_PER_COMPANY, '32');
});

test('entrypoint refuses an explicit non-PREPROD environment through either supported guard', () => {
  assert.throws(() => configureSupervisor360V1({ CEREBRO_ENVIRONMENT: 'PROD' }), /PREPROD_ONLY/);
  assert.throws(() => configureSupervisor360V1({ CEREBRO_SUPERVISOR_ENV: 'PROD' }), /PREPROD_ONLY/);
});

test('publisher is armed before the long-lived V0 daemon import can settle', async () => {
  const env = {
    USERPROFILE: 'C:\\Users\\Carlos',
    CEREBRO_DEVICE_ID: 'desktop-test',
    CEREBRO_PREPROD_SUPABASE_URL: 'https://exampleproject.supabase.co',
    CEREBRO_PREPROD_SUPABASE_SERVICE_ROLE_KEY: 'secret-ref-value',
  };
  let releaseSupervisor;
  let published = 0;
  let scheduled = 0;
  const startPromise = startSupervisorEntrypointV1({
    env,
    import_supervisor: () => new Promise(resolve => { releaseSupervisor = resolve; }),
    publisher: async ({ api_key, device_id }) => {
      published += 1;
      assert.equal(api_key, 'secret-ref-value');
      assert.equal(device_id, 'desktop-test');
      return { ok: true, receipt: { published: true } };
    },
    set_interval: () => { scheduled += 1; return { unref() {} }; },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled, 1);
  assert.ok(published >= 1, 'publisher must start before the continuous daemon import resolves');
  releaseSupervisor();
  const runtime = await startPromise;
  assert.equal(runtime.second_daemon, false);
  assert.equal(runtime.second_scheduler, false);
  assert.equal(runtime.telemetry.publisher_failure_is_fatal, false);
});

test('remote telemetry requires existing server-side references and never requires a second daemon', async () => {
  const env = {
    USERPROFILE: 'C:\\Users\\Carlos',
    CEREBRO_DEVICE_ID: 'desktop-test',
    CEREBRO_PREPROD_SUPABASE_URL: 'https://exampleproject.supabase.co',
    CEREBRO_PREPROD_SUPABASE_SERVICE_ROLE_KEY: 'secret-ref-value',
  };
  const config = telemetryConfigFromEnvV1(env);
  assert.equal(canPublishRemoteTelemetryV1(config), true);
  let imported = 0;
  let scheduled = 0;
  let published = 0;
  const runtime = await startSupervisorEntrypointV1({
    env,
    import_supervisor: async () => { imported += 1; },
    publisher: async () => { published += 1; return { ok: true, receipt: { published: true } }; },
    set_interval: () => { scheduled += 1; return { unref() {} }; },
  });
  await runtime.tick();
  assert.equal(imported, 1);
  assert.equal(scheduled, 1);
  assert.ok(published >= 1);
  assert.equal(runtime.second_daemon, false);
  assert.equal(runtime.second_scheduler, false);
});

test('missing remote config does not prevent the existing daemon from starting', async () => {
  const env = {};
  let imported = 0;
  const runtime = await startSupervisorEntrypointV1({
    env,
    import_supervisor: async () => { imported += 1; },
    publisher: async () => { throw new Error('must not publish'); },
    set_interval: () => { throw new Error('must not schedule'); },
  });
  assert.equal(imported, 1);
  assert.equal(runtime.telemetry.configured, false);
  assert.equal(runtime.last_receipt.non_fatal, true);
});

test('publisher failures remain non-fatal to the supervisor process', async () => {
  const env = {
    CEREBRO_DEVICE_ID: 'desktop-test',
    CEREBRO_PREPROD_SUPABASE_URL: 'https://exampleproject.supabase.co',
    CEREBRO_PREPROD_SUPABASE_SERVICE_ROLE_KEY: 'secret-ref-value',
  };
  const runtime = await startSupervisorEntrypointV1({
    env,
    import_supervisor: async () => {},
    publisher: async () => ({ ok: false, non_fatal: true, error_code: 'TRANSPORT_DOWN' }),
    set_interval: () => ({ unref() {} }),
  });
  const receipt = await runtime.tick();
  assert.equal(receipt.ok, false);
  assert.equal(receipt.non_fatal, true);
  assert.equal(runtime.second_daemon, false);
});

test('contract declares exact V0 binding, rollback and verified 360-cap governance', () => {
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.wraps_existing_daemon_v0, true);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.preserves_v0_for_rollback, true);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.publisher_starts_before_long_lived_daemon_import, true);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.daemon_env_keys.max_global, 'CEREBRO_MAX_CONCURRENCY');
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.daemon_env_keys.initial_global, 'CEREBRO_INITIAL_CONCURRENCY');
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.daemon_env_keys.max_company, 'CEREBRO_MAX_PER_COMPANY');
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.target_useful, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_global, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_company, 360);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_deepseek, 8);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.max_repo_write, 1);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.publisher_failure_is_fatal, false);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.second_daemon, false);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.additional_cost_eur, 0);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.prod_authorized, false);
  assert.equal(CEREBRO_SUPERVISOR_ENTRYPOINT_V1_CONTRACT.trading_access, false);
});
