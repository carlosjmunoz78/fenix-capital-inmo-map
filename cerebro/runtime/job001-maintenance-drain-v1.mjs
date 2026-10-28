import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DurableJobRuntimeV1 } from './durable-job-runtime-v1.mjs';
import { AdaptiveHierarchicalAgentWorkPumpV3 } from './adaptive-hierarchical-agent-work-pump-v3.mjs';

const PREPROD = 'PREPROD';
const PATCH_KEY = Symbol.for('cerebro.job001.maintenance-drain-v1');

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function maintenanceDrainConfigV1(env = process.env) {
  if (env.CEREBRO_SUPERVISOR_ENV && String(env.CEREBRO_SUPERVISOR_ENV).toUpperCase() !== PREPROD) {
    throw new Error('CEREBRO_MAINTENANCE_DRAIN_PREPROD_ONLY');
  }
  if (env.CEREBRO_ENVIRONMENT && String(env.CEREBRO_ENVIRONMENT).toUpperCase() !== PREPROD) {
    throw new Error('CEREBRO_MAINTENANCE_DRAIN_PREPROD_ONLY');
  }
  const userProfile = nonEmpty(env.USERPROFILE) || os.homedir();
  const stateDir = nonEmpty(env.CEREBRO_SUPERVISOR_STATE_DIR) || path.join(userProfile, 'AppData', 'Local', 'CEREBRO', 'SupervisorRuntime');
  const file = nonEmpty(env.CEREBRO_MAINTENANCE_DRAIN_FILE) || path.join(stateDir, 'DRAIN_MODE');
  return Object.freeze({
    environment: PREPROD,
    state_dir: path.resolve(stateDir),
    drain_file: path.resolve(file),
    prod_authorized: false,
    trading_access: false,
  });
}

export function isMaintenanceDrainActiveV1(config) {
  return Boolean(config?.drain_file && fs.existsSync(config.drain_file));
}

export function installMaintenanceDrainV1({ env = process.env } = {}) {
  const config = maintenanceDrainConfigV1(env);
  const already = globalThis[PATCH_KEY];
  if (already?.installed && already.config?.drain_file === config.drain_file) return already.receipt;
  if (already?.installed) already.uninstall();

  const originalClaim = DurableJobRuntimeV1.prototype.claim;
  const originalReconcile = AdaptiveHierarchicalAgentWorkPumpV3.prototype.reconcile;
  const originalSnapshot = AdaptiveHierarchicalAgentWorkPumpV3.prototype.snapshot;

  if (typeof originalClaim !== 'function' || typeof originalReconcile !== 'function' || typeof originalSnapshot !== 'function') {
    throw new Error('CEREBRO_MAINTENANCE_DRAIN_CONTRACT_MISMATCH');
  }

  const drainActive = () => isMaintenanceDrainActiveV1(config);

  DurableJobRuntimeV1.prototype.claim = function maintenanceDrainClaim(args) {
    if (drainActive()) return null;
    return originalClaim.call(this, args);
  };

  AdaptiveHierarchicalAgentWorkPumpV3.prototype.reconcile = function maintenanceDrainReconcile() {
    if (!drainActive()) return originalReconcile.call(this);
    const base = originalSnapshot.call(this);
    return Object.freeze({
      ...base,
      maintenance_drain: true,
      admission_open: false,
      enqueued_children_this_reconcile: 0,
      refill_suppressed: true,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
  };

  AdaptiveHierarchicalAgentWorkPumpV3.prototype.snapshot = function maintenanceDrainSnapshot() {
    const base = originalSnapshot.call(this);
    const active = drainActive();
    return Object.freeze({
      ...base,
      maintenance_drain: active,
      admission_open: !active,
      refill_suppressed: active,
      prod_authorized: false,
      prod_write_authorized: false,
      trading_access: false,
    });
  };

  const receipt = Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_JOB001_MAINTENANCE_DRAIN_V1',
    environment: PREPROD,
    drain_file: config.drain_file,
    installed: true,
    mode: drainActive() ? 'DRAIN' : 'OPEN',
    behavior: Object.freeze({
      running_jobs_cancelled: false,
      new_claims_blocked_while_drain_file_exists: true,
      adaptive_refill_suppressed_while_drain_file_exists: true,
      queued_jobs_preserved: true,
      resume_by_removing_drain_file: true,
    }),
    second_queue: false,
    second_scheduler: false,
    second_daemon: false,
    additional_cost_eur: 0,
    prod_authorized: false,
    trading_access: false,
  });

  const uninstall = () => {
    DurableJobRuntimeV1.prototype.claim = originalClaim;
    AdaptiveHierarchicalAgentWorkPumpV3.prototype.reconcile = originalReconcile;
    AdaptiveHierarchicalAgentWorkPumpV3.prototype.snapshot = originalSnapshot;
    if (globalThis[PATCH_KEY]?.config?.drain_file === config.drain_file) delete globalThis[PATCH_KEY];
  };

  globalThis[PATCH_KEY] = Object.freeze({ installed: true, config, receipt, uninstall });
  return receipt;
}

export function uninstallMaintenanceDrainV1ForTests() {
  const current = globalThis[PATCH_KEY];
  if (!current?.installed) return false;
  current.uninstall();
  return true;
}

export const JOB001_MAINTENANCE_DRAIN_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/MAINTENANCE-DRAIN-V1',
  environment: PREPROD,
  trigger: 'DRAIN_MODE sentinel file',
  finish_running_jobs: true,
  block_new_claims: true,
  suppress_adaptive_refill: true,
  preserve_queue: true,
  reversible_without_queue_mutation: true,
  resume_action: 'remove DRAIN_MODE sentinel file',
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
