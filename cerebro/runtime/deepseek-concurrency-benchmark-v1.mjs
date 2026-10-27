import fs from 'node:fs';
import path from 'node:path';
import { DeepSeekProviderV0 } from './deepseek-provider-v0.mjs';
import { DeepSeekLiveBalanceGuardV0 } from './deepseek-live-balance-guard-v0.mjs';

function parseLevels(raw = '1,2,4,8,16,32,64') {
  const levels = String(raw).split(',').map(x => Number(x.trim())).filter(Number.isFinite);
  if (!levels.length || levels.some(x => !Number.isSafeInteger(x) || x < 1 || x > 256)) throw new Error('invalid benchmark levels');
  return [...new Set(levels)].sort((a, b) => a - b);
}

function percentile(values, q) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)];
}

function classify(error) {
  const text = String(error?.message || error || 'UNKNOWN');
  return { text: text.slice(0, 300), rate_limited: /429|rate[_ -]?limit|too many/i.test(text) };
}

const levels = parseLevels(process.env.CEREBRO_DEEPSEEK_BENCHMARK_LEVELS);
const baselineUsd = Number(process.env.DEEPSEEK_APPROVED_BASELINE_USD || 100);
const projectedPerRequestUsd = Number(process.env.CEREBRO_DEEPSEEK_BENCHMARK_PROJECTED_USD_PER_REQUEST || 0.01);
const maxP95Ms = Number(process.env.CEREBRO_DEEPSEEK_BENCHMARK_MAX_P95_MS || 30000);
const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing');
if (!Number.isFinite(projectedPerRequestUsd) || projectedPerRequestUsd <= 0) throw new Error('invalid projected per-request cost');

const totalPlannedRequests = levels.reduce((sum, n) => sum + n, 0);
const projectedCostUsd = totalPlannedRequests * projectedPerRequestUsd;
const balanceGuard = new DeepSeekLiveBalanceGuardV0({ baselineUsd, autoRecharge: false });
const authorization = await balanceGuard.authorize({ apiKey, projectedCostUsd });
if (!authorization.allowed) {
  console.log(JSON.stringify({ status: 'MONEY_LIMIT', authorization }, null, 2));
  process.exitCode = 3;
} else {
  const provider = new DeepSeekProviderV0({ apiKey });
  const report = {
    schema_version: '1.0', benchmark: 'DEEPSEEK_CONCURRENCY_V1', environment: 'PREPROD',
    baseline_usd: baselineUsd, projected_cost_usd: projectedCostUsd, auto_recharge: false,
    levels: [], recommended_max_concurrency: 0, stopped_reason: null, created_at: new Date().toISOString(),
  };

  let previousThroughput = null;
  for (const level of levels) {
    const started = Date.now();
    const calls = Array.from({ length: level }, (_, index) => {
      const requestId = `cerebro-deepseek-concurrency-v1-${level}-${index}-${Date.now()}`;
      const t0 = Date.now();
      return provider.respond({
        model: 'deepseek-flash',
        instructions: 'CEREBRO PREPROD concurrency benchmark. Return exactly OK. Do not use tools and do not add text.',
        input: 'Return exactly: OK',
        maxOutputTokens: 32,
      }, { requestId }).then(result => ({ ok: true, latency_ms: Date.now() - t0, usage: result.usage, output: result.output_text }))
        .catch(error => ({ ok: false, latency_ms: Date.now() - t0, error: classify(error) }));
    });
    const results = await Promise.all(calls);
    const elapsed = Math.max(1, Date.now() - started);
    const success = results.filter(r => r.ok).length;
    const failures = results.length - success;
    const rateLimited = results.filter(r => !r.ok && r.error?.rate_limited).length;
    const latencies = results.map(r => r.latency_ms);
    const throughput = success / (elapsed / 1000);
    const p95 = percentile(latencies, 0.95);
    const tokenIn = results.reduce((s, r) => s + Number(r.usage?.input_tokens || 0), 0);
    const tokenOut = results.reduce((s, r) => s + Number(r.usage?.output_tokens || 0), 0);
    const qualityFailures = results.filter(r => r.ok && String(r.output || '').trim() !== 'OK').length;
    const throughputImproved = previousThroughput === null || throughput >= previousThroughput * 0.98;
    const green = failures === 0 && rateLimited === 0 && qualityFailures === 0 && p95 <= maxP95Ms && throughputImproved;
    const sample = {
      concurrency: level, requests: level, success, failures, rate_limited: rateLimited,
      quality_failures: qualityFailures, elapsed_ms: elapsed,
      p50_ms: percentile(latencies, 0.50), p95_ms: p95,
      throughput_rps: Math.round(throughput * 1000) / 1000,
      input_tokens: tokenIn, output_tokens: tokenOut, green,
      errors: results.filter(r => !r.ok).slice(0, 5).map(r => r.error?.text || 'UNKNOWN'),
    };
    report.levels.push(sample);
    console.log(`CEREBRO_DEEPSEEK_BENCHMARK_LEVEL=${JSON.stringify(sample)}`);
    if (!green) {
      report.stopped_reason = rateLimited ? 'RATE_LIMIT_429' : failures ? 'ERROR_RATE' : qualityFailures ? 'QUALITY' : p95 > maxP95Ms ? 'P95' : 'THROUGHPUT_PLATEAU';
      break;
    }
    report.recommended_max_concurrency = level;
    previousThroughput = throughput;
  }

  const outDir = path.resolve(process.env.CEREBRO_BENCHMARK_ARTIFACT_DIR || 'artifacts/deepseek-concurrency-v1');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`CEREBRO_DEEPSEEK_RECOMMENDED_MAX_CONCURRENCY=${report.recommended_max_concurrency}`);
  console.log(`CEREBRO_DEEPSEEK_BENCHMARK_REPORT=${JSON.stringify(report)}`);
  if (report.recommended_max_concurrency < 1) process.exitCode = 2;
}
