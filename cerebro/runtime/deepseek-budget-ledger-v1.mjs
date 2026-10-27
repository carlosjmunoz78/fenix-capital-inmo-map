import { serialize, deserialize } from 'node:v8';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const KIND = 'BOOST-001-DEEPSEEK-BUDGET-LEDGER-V1';
const PREPROD = 'PREPROD';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function finite(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function clone(value) { return deserialize(serialize(value)); }

function replay(operations, hardCapEur) {
  let reservedEur = 0;
  const byKey = new Map();
  for (const operation of operations) {
    if (!operation || operation.op !== 'reserve' || !operation.reservation) throw new Error('invalid DeepSeek budget ledger operation');
    const reservation = operation.reservation;
    const key = nonEmpty(reservation.reservation_id, 'reservation.reservation_id');
    if (byKey.has(key)) throw new Error(`duplicate DeepSeek budget reservation: ${key}`);
    const amount = finite(reservation.projected_cost_eur, 'reservation.projected_cost_eur');
    reservedEur += amount;
    if (reservedEur > hardCapEur + 1e-9) throw new Error('DeepSeek budget ledger exceeds configured hard cap');
    byKey.set(key, clone(reservation));
  }
  return { reservedEur, byKey };
}

export class DeepSeekBudgetLedgerV1 {
  #journal;
  #operations;
  #reservedEur;
  #byKey;
  #hardCapEur;

  constructor({ file_path, hard_cap_eur = 10, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error('DeepSeek budget ledger V1 is PREPROD-only');
    this.#hardCapEur = finite(hard_cap_eur, 'hard_cap_eur', { min: 0.01, max: 10_000 });
    this.#journal = new AtomicV8Journal({ file_path: nonEmpty(file_path, 'file_path'), kind: KIND });
    this.#operations = this.#journal.load();
    const state = replay(this.#operations, this.#hardCapEur);
    this.#reservedEur = state.reservedEur;
    this.#byKey = state.byKey;
  }

  reserve({ reservation_id, projected_cost_eur, metadata = null, observed_at = new Date().toISOString() }) {
    const key = nonEmpty(reservation_id, 'reservation_id');
    const projected = finite(projected_cost_eur, 'projected_cost_eur', { min: 0, max: this.#hardCapEur });
    const existing = this.#byKey.get(key);
    if (existing) {
      if (Math.abs(existing.projected_cost_eur - projected) > 1e-9) throw new Error(`DeepSeek budget reservation mismatch for ${key}`);
      return Object.freeze({ allowed: true, duplicate: true, reservation: clone(existing), snapshot: this.snapshot() });
    }
    const projectedTotal = this.#reservedEur + projected;
    if (projectedTotal > this.#hardCapEur + 1e-9) {
      return Object.freeze({
        allowed: false,
        duplicate: false,
        reason: 'MONEY_LIMIT',
        projected_cost_eur: projected,
        projected_total_eur: projectedTotal,
        snapshot: this.snapshot(),
      });
    }
    const reservation = Object.freeze({
      reservation_id: key,
      projected_cost_eur: projected,
      projected_total_eur: projectedTotal,
      metadata: clone(metadata),
      observed_at: nonEmpty(observed_at, 'observed_at'),
      actual_cost_known: false,
    });
    const operations = [...this.#operations, { op: 'reserve', reservation }];
    const state = replay(operations, this.#hardCapEur);
    this.#journal.commit(operations);
    this.#operations = operations;
    this.#reservedEur = state.reservedEur;
    this.#byKey = state.byKey;
    return Object.freeze({ allowed: true, duplicate: false, reservation: clone(reservation), snapshot: this.snapshot() });
  }

  snapshot() {
    return Object.freeze({
      environment: PREPROD,
      hard_cap_eur: this.#hardCapEur,
      reserved_projected_eur: Number(this.#reservedEur.toFixed(6)),
      remaining_projected_eur: Number(Math.max(0, this.#hardCapEur - this.#reservedEur).toFixed(6)),
      reservation_count: this.#byKey.size,
      auto_recharge: false,
      actual_cost_known: false,
      prod_authorized: false,
    });
  }
}

export const DEEPSEEK_BUDGET_LEDGER_V1_CONTRACT = Object.freeze({
  capability: 'BOOST-001/deepseek-budget-ledger-v1',
  environment: PREPROD,
  durable_restart_safe_projected_reservations: true,
  idempotent_reservations: true,
  conservative_no_release_without_actual_cost_reconciliation: true,
  auto_recharge: false,
  additional_subscription_eur: 0,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});
