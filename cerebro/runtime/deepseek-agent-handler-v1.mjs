import { DeepSeekProviderV0 } from './deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from './deepseek-budget-guard-v0.mjs';

const PREPROD = 'PREPROD';

function finite(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function positiveInt(value, label, { min = 1, max = 393216 } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be an integer between ${min} and ${max}`);
  return n;
}

export function createDeepSeekAgentHandlerV1({
  environment = PREPROD,
  provider = new DeepSeekProviderV0(),
  budget_guard = new DeepSeekBudgetGuardV0({ initialHardCapEur: 200, autoRecharge: false }),
  budget_ledger = null,
  initial_spent_eur = Number(process.env.CEREBRO_DEEPSEEK_SPENT_EUR || 0),
  default_projected_cost_eur = 0.05,
} = {}) {
  if (environment !== PREPROD) throw new Error('DeepSeek agent handler V1 is PREPROD-only');
  if (budget_ledger !== null && (typeof budget_ledger.reserve !== 'function' || typeof budget_ledger.snapshot !== 'function')) {
    throw new TypeError('budget_ledger must expose reserve() and snapshot()');
  }
  let reservedSpendEur = finite(initial_spent_eur, 'initial_spent_eur');
  const defaultProjected = finite(default_projected_cost_eur, 'default_projected_cost_eur');

  const handler = async ({ job, payload = {}, signal, checkpoint }) => {
    const input = payload.input;
    if (typeof input !== 'string' && !Array.isArray(input)) throw new TypeError('payload.input must be string or Responses API input array');
    const projectedCostEur = finite(payload.projected_cost_eur ?? defaultProjected, 'payload.projected_cost_eur');
    let authorization;

    if (budget_ledger) {
      const reservation = budget_ledger.reserve({
        reservation_id: `deepseek:${job.job_id}`,
        projected_cost_eur: projectedCostEur,
        metadata: {
          company_id: job.context?.company_id ?? null,
          engine_id: job.context?.engine_id ?? null,
          work_pump: payload.__work_pump ?? null,
        },
      });
      authorization = reservation.allowed
        ? { allowed: true, reason: 'DURABLE_PROJECTED_BUDGET_RESERVED', projected_total_eur: reservation.snapshot.reserved_projected_eur, ledger: reservation.snapshot }
        : { allowed: false, reason: 'MONEY_LIMIT', projected_total_eur: reservation.projected_total_eur, ledger: reservation.snapshot };
      if (!authorization.allowed) return { status: 'HUMAN_REQUIRED', reason: 'MONEY_LIMIT', authorization };
      reservedSpendEur = authorization.projected_total_eur;
    } else {
      authorization = budget_guard.authorize({
        phase: payload.budget_phase ?? 'bootstrap',
        spentEur: reservedSpendEur,
        projectedCostEur,
      });
      if (!authorization.allowed) return { status: 'HUMAN_REQUIRED', reason: 'MONEY_LIMIT', authorization };
      reservedSpendEur = authorization.projected_total_eur;
    }

    if (typeof checkpoint === 'function') checkpoint({
      stage: 'DEEPSEEK_RESERVED',
      projected_cost_eur: projectedCostEur,
      reserved_spend_eur: reservedSpendEur,
      durable_budget: budget_ledger ? budget_ledger.snapshot() : null,
      at: new Date().toISOString(),
    });

    const response = await provider.respond({
      model: payload.model ?? 'deepseek-flash',
      instructions: payload.instructions ?? 'You are a bounded CEREBRO worker. Return concrete work product only for the assigned task. Do not claim PROD authority.',
      input,
      maxOutputTokens: positiveInt(payload.max_output_tokens ?? 1024, 'payload.max_output_tokens'),
    }, { requestId: `cerebro-${job.job_id}`, signal });

    const tokens = Number(response.usage?.input_tokens ?? 0) + Number(response.usage?.output_tokens ?? 0);
    return {
      provider: response.provider,
      model: response.model,
      response_id: response.response_id,
      output_text: response.output_text,
      usage: response.usage,
      tokens,
      projected_cost_eur: projectedCostEur,
      authorization,
      governance_state: 'CANDIDATE_ONLY',
      prod_authorized: false,
      trading_access: false,
    };
  };

  handler.snapshot = () => Object.freeze({
    environment: PREPROD,
    reserved_spend_eur: budget_ledger ? budget_ledger.snapshot().reserved_projected_eur : reservedSpendEur,
    durable_budget: budget_ledger ? budget_ledger.snapshot() : null,
    auto_recharge: false,
    prod_authorized: false,
  });
  return handler;
}

export const DEEPSEEK_AGENT_HANDLER_V1_CONTRACT = Object.freeze({
  capability: 'BOOST-001/MODEL/deepseek-agent-handler-v1',
  environment: PREPROD,
  bounded_by_dynamic_provider_ceiling: true,
  aggregate_process_budget_reservation: true,
  durable_budget_ledger_supported: true,
  restart_safe_budget_when_ledger_configured: true,
  auto_recharge: false,
  arbitrary_shell_access: false,
  arbitrary_repo_write_access: false,
  work_product_is_candidate_only: true,
  direct_prod_mutation: false,
  trading_access: false,
});
