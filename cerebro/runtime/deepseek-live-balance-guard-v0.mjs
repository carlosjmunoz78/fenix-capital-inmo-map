function money(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`);
  return Math.round(n * 1e6) / 1e6;
}

export class DeepSeekLiveBalanceGuardV0 {
  constructor({ baselineUsd = 100, autoRecharge = false, endpoint = 'https://api.deepseek.com/user/balance' } = {}) {
    this.baselineUsd = money(baselineUsd, 'baselineUsd');
    this.autoRecharge = Boolean(autoRecharge);
    this.endpoint = String(endpoint);
    if (this.autoRecharge) throw new Error('BOOST-001 forbids automatic recharge');
  }

  async read({ apiKey, fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation missing');

    const response = await fetchImpl(this.endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response?.ok) throw new Error(`DEEPSEEK_BALANCE_HTTP_${response?.status ?? 'UNKNOWN'}`);
    const payload = await response.json();
    const usd = Array.isArray(payload?.balance_infos)
      ? payload.balance_infos.find((item) => item?.currency === 'USD')
      : null;
    if (!usd) throw new Error('DEEPSEEK_USD_BALANCE_MISSING');

    return {
      is_available: Boolean(payload.is_available),
      currency: 'USD',
      total_balance_usd: money(usd.total_balance, 'total_balance_usd'),
      granted_balance_usd: money(usd.granted_balance ?? 0, 'granted_balance_usd'),
      topped_up_balance_usd: money(usd.topped_up_balance ?? 0, 'topped_up_balance_usd'),
    };
  }

  async authorize({ apiKey, projectedCostUsd = 0, fetchImpl = globalThis.fetch } = {}) {
    const projected = money(projectedCostUsd, 'projectedCostUsd');
    const balance = await this.read({ apiKey, fetchImpl });
    const tolerance = 0.01;
    const topUpDrift = balance.total_balance_usd > this.baselineUsd + tolerance;
    const spent = money(Math.max(0, this.baselineUsd - balance.total_balance_usd), 'spentUsd');
    const projectedSpend = money(spent + projected, 'projectedSpendUsd');
    const enoughBalance = balance.is_available && balance.total_balance_usd + tolerance >= projected;
    const allowed = !topUpDrift && enoughBalance && projectedSpend <= this.baselineUsd + tolerance;

    return {
      allowed,
      result: allowed ? 'ALLOW' : 'MONEY_LIMIT',
      reason: topUpDrift
        ? 'BALANCE_REBASE_REQUIRED'
        : (!balance.is_available ? 'BALANCE_UNAVAILABLE' : (!enoughBalance ? 'INSUFFICIENT_BALANCE' : 'HARD_CAP')),
      currency: 'USD',
      baseline_usd: this.baselineUsd,
      current_balance_usd: balance.total_balance_usd,
      spent_since_baseline_usd: spent,
      projected_cost_usd: projected,
      projected_spend_since_baseline_usd: projectedSpend,
      auto_recharge: false,
    };
  }
}
