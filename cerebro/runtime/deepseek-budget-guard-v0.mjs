function euro(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`);
  return Math.round(n * 1e6) / 1e6;
}

export class DeepSeekBudgetGuardV0 {
  constructor({
    initialHardCapEur = 200,
    monthlyVariableCeilingEur = 10,
    autoRecharge = false,
  } = {}) {
    this.initialHardCapEur = euro(initialHardCapEur, 'initialHardCapEur');
    this.monthlyVariableCeilingEur = euro(monthlyVariableCeilingEur, 'monthlyVariableCeilingEur');
    this.autoRecharge = Boolean(autoRecharge);
    if (this.autoRecharge) throw new Error('BOOST-001 forbids automatic recharge');
  }

  authorize({ phase = 'bootstrap', spentEur = 0, projectedCostEur = 0 } = {}) {
    const spent = euro(spentEur, 'spentEur');
    const projected = euro(projectedCostEur, 'projectedCostEur');
    const cap = phase === 'post_bootstrap_month' ? this.monthlyVariableCeilingEur : this.initialHardCapEur;
    const projectedTotal = euro(spent + projected, 'projectedTotal');
    const allowed = projectedTotal <= cap;
    return {
      allowed,
      phase,
      cap_eur: cap,
      spent_eur: spent,
      projected_cost_eur: projected,
      projected_total_eur: projectedTotal,
      remaining_before_request_eur: euro(Math.max(0, cap - spent), 'remaining'),
      result: allowed ? 'ALLOW' : 'MONEY_LIMIT',
      auto_recharge: false,
    };
  }
}

export function budgetAlertLevel({ spentEur, capEur }) {
  const spent = euro(spentEur, 'spentEur');
  const cap = euro(capEur, 'capEur');
  if (cap === 0) return spent === 0 ? 0 : 100;
  const pct = (spent / cap) * 100;
  if (pct >= 100) return 100;
  if (pct >= 90) return 90;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  return 0;
}
