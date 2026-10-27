import { DeepSeekProviderV0 } from '../../runtime/deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from '../../runtime/deepseek-budget-guard-v0.mjs';

if (process.env.CEREBRO_ALLOW_PAID_CANARY !== 'YES') {
  throw new Error('Paid canary disabled. Set CEREBRO_ALLOW_PAID_CANARY=YES only after funding, secret setup and pricing revalidation.');
}

const projectedCanaryCostEur = Number(process.env.DEEPSEEK_CANARY_PROJECTED_EUR ?? '0.01');
const guard = new DeepSeekBudgetGuardV0({ initialHardCapEur: 200, monthlyVariableCeilingEur: 10, autoRecharge: false });
const authorization = guard.authorize({ phase: 'bootstrap', spentEur: 0, projectedCostEur: projectedCanaryCostEur });
if (!authorization.allowed) throw new Error('MONEY_LIMIT');

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
  projected_budget_authorization: authorization,
}, null, 2));

if (!semanticOk) process.exitCode = 2;
