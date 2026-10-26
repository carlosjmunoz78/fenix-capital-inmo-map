const DEFAULT_USD_PRICING = Object.freeze({
  'deepseek-flash': {
    off_peak: { input_cache_hit: 0.003, input_cache_miss: 0.15, output: 0.6 },
    peak: { input_cache_hit: 0.006, input_cache_miss: 0.3, output: 1.2 },
  },
  'deepseek-v4-pro': {
    off_peak: { input_cache_hit: 0.022, input_cache_miss: 0.66, output: 1.98 },
    peak: { input_cache_hit: 0.044, input_cache_miss: 1.32, output: 3.96 },
  },
});

function count(value, name) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be non-negative`);
  return n;
}

export function calculateDeepSeekTokenCostUsd({
  model,
  rateClass = 'off_peak',
  inputTokens = 0,
  cachedInputTokens = 0,
  outputTokens = 0,
  pricing = DEFAULT_USD_PRICING,
} = {}) {
  const rates = pricing?.[model]?.[rateClass];
  if (!rates) throw new Error(`No dated pricing snapshot for ${model}/${rateClass}`);
  const input = count(inputTokens, 'inputTokens');
  const cached = count(cachedInputTokens, 'cachedInputTokens');
  const output = count(outputTokens, 'outputTokens');
  if (cached > input) throw new Error('cachedInputTokens cannot exceed inputTokens');
  const miss = input - cached;
  const usd = (cached / 1_000_000) * rates.input_cache_hit
    + (miss / 1_000_000) * rates.input_cache_miss
    + (output / 1_000_000) * rates.output;
  return Math.round(usd * 1e9) / 1e9;
}

export function convertUsdToEur(usd, usdToEur) {
  const amount = count(usd, 'usd');
  const fx = Number(usdToEur);
  if (!Number.isFinite(fx) || fx <= 0) throw new Error('usdToEur must be a positive current FX rate');
  return Math.round(amount * fx * 1e9) / 1e9;
}

export const DEEPSEEK_PRICING_V0 = DEFAULT_USD_PRICING;
