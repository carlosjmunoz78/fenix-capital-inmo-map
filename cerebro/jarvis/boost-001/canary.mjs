import { DeepSeekProviderV0 } from '../../runtime/deepseek-provider-v0.mjs';
import { DeepSeekLiveBalanceGuardV0 } from '../../runtime/deepseek-live-balance-guard-v0.mjs';

if (process.env.CEREBRO_ALLOW_PAID_CANARY !== 'YES') {
  throw new Error('Paid canary disabled. Set CEREBRO_ALLOW_PAID_CANARY=YES only after funding, secret setup and pricing revalidation.');
}
if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing');

const projectedCanaryCostUsd = Number(process.env.DEEPSEEK_CANARY_PROJECTED_USD ?? '0.01');
const baselineUsd = Number(process.env.DEEPSEEK_APPROVED_BASELINE_USD ?? '100');
const liveGuard = new DeepSeekLiveBalanceGuardV0({ baselineUsd, autoRecharge: false });
const authorization = await liveGuard.authorize({
  apiKey: process.env.DEEPSEEK_API_KEY,
  projectedCostUsd: projectedCanaryCostUsd,
});
if (!authorization.allowed) throw new Error(`MONEY_LIMIT:${authorization.reason}`);

const started = Date.now();
const result = await new DeepSeekProviderV0().tinyCanary({ requestId: `jarvis-boost-001-canary-${Date.now()}` });
const semanticOk = result.output_text.trim() === 'DEEPSEEK_CANARY_OK';

console.log(JSON.stringify({
  semantic_ok: semanticOk,
  provider: result.provider,
  model: result.model,
  request_id: result.request_id,
  response_id: result.response_id,
  status: result.status,
  usage: result.usage,
  elapsed_ms: Date.now() - started,
  live_budget_authorization: authorization,
}, null, 2));

if (!semanticOk) process.exitCode = 2;
