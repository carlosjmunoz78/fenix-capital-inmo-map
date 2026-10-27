import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeepSeekTokenCostUsd, convertUsdToEur } from '../runtime/deepseek-cost-v0.mjs';

test('calculates flash off-peak token cost from dated snapshot', () => {
  const cost = calculateDeepSeekTokenCostUsd({
    model: 'deepseek-flash',
    rateClass: 'off_peak',
    inputTokens: 1_000_000,
    cachedInputTokens: 0,
    outputTokens: 1_000_000,
  });
  assert.equal(cost, 0.75);
});

test('cache hit receives its separate input rate', () => {
  const cost = calculateDeepSeekTokenCostUsd({
    model: 'deepseek-v4-pro',
    rateClass: 'off_peak',
    inputTokens: 1_000_000,
    cachedInputTokens: 1_000_000,
    outputTokens: 0,
  });
  assert.equal(cost, 0.022);
});

test('peak and off-peak are explicit, not inferred silently', () => {
  const offPeak = calculateDeepSeekTokenCostUsd({ model: 'deepseek-flash', inputTokens: 1_000_000 });
  const peak = calculateDeepSeekTokenCostUsd({ model: 'deepseek-flash', rateClass: 'peak', inputTokens: 1_000_000 });
  assert.equal(offPeak, 0.15);
  assert.equal(peak, 0.3);
});

test('rejects invalid usage and requires explicit current FX for EUR conversion', () => {
  assert.throws(() => calculateDeepSeekTokenCostUsd({ model: 'deepseek-flash', inputTokens: 1, cachedInputTokens: 2 }), /cannot exceed/);
  assert.throws(() => convertUsdToEur(1, 0), /positive current FX/);
  assert.equal(convertUsdToEur(2, 0.9), 1.8);
});
