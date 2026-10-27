import test from 'node:test';
import assert from 'node:assert/strict';
import { DeepSeekLiveBalanceGuardV0 } from '../runtime/deepseek-live-balance-guard-v0.mjs';

function fakeFetch(payload, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, async json() { return payload; } });
}

const balance = (total, available = true) => ({
  is_available: available,
  balance_infos: [{ currency: 'USD', total_balance: String(total), granted_balance: '0', topped_up_balance: String(total) }],
});

test('authorizes against live balance and computes cumulative spend from the fixed baseline', async () => {
  const guard = new DeepSeekLiveBalanceGuardV0({ baselineUsd: 100 });
  const result = await guard.authorize({ apiKey: 'test-key', projectedCostUsd: 0.15, fetchImpl: fakeFetch(balance(99.85)) });
  assert.equal(result.allowed, true);
  assert.equal(result.spent_since_baseline_usd, 0.15);
  assert.equal(result.projected_spend_since_baseline_usd, 0.3);
  assert.equal(result.auto_recharge, false);
});

test('fails closed if a manual top-up moves balance above the approved baseline', async () => {
  const guard = new DeepSeekLiveBalanceGuardV0({ baselineUsd: 100 });
  const result = await guard.authorize({ apiKey: 'test-key', projectedCostUsd: 0.01, fetchImpl: fakeFetch(balance(120)) });
  assert.equal(result.allowed, false);
  assert.equal(result.result, 'MONEY_LIMIT');
  assert.equal(result.reason, 'BALANCE_REBASE_REQUIRED');
});

test('fails closed when balance is unavailable or insufficient', async () => {
  const guard = new DeepSeekLiveBalanceGuardV0({ baselineUsd: 100 });
  const unavailable = await guard.authorize({ apiKey: 'test-key', projectedCostUsd: 0.01, fetchImpl: fakeFetch(balance(50, false)) });
  assert.equal(unavailable.allowed, false);
  assert.equal(unavailable.reason, 'BALANCE_UNAVAILABLE');
  const insufficient = await guard.authorize({ apiKey: 'test-key', projectedCostUsd: 1, fetchImpl: fakeFetch(balance(0.5, true)) });
  assert.equal(insufficient.allowed, false);
  assert.equal(insufficient.reason, 'INSUFFICIENT_BALANCE');
});

test('never exposes the API key in returned evidence', async () => {
  const guard = new DeepSeekLiveBalanceGuardV0({ baselineUsd: 100 });
  const result = await guard.authorize({ apiKey: 'super-secret-key', projectedCostUsd: 0.01, fetchImpl: fakeFetch(balance(99.85)) });
  assert.equal(JSON.stringify(result).includes('super-secret-key'), false);
});

test('rejects automatic recharge configuration', () => {
  assert.throws(() => new DeepSeekLiveBalanceGuardV0({ autoRecharge: true }), /forbids automatic recharge/);
});
