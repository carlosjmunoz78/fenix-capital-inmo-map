import test from 'node:test';
import assert from 'node:assert/strict';
import { DeepSeekBudgetGuardV0, budgetAlertLevel } from '../runtime/deepseek-budget-guard-v0.mjs';

test('BOOST-001 rejects automatic recharge', () => {
  assert.throws(() => new DeepSeekBudgetGuardV0({ autoRecharge: true }), /forbids automatic recharge/);
});

test('bootstrap hard cap allows bounded spend and rejects projected overflow', () => {
  const guard = new DeepSeekBudgetGuardV0({ initialHardCapEur: 200 });
  assert.equal(guard.authorize({ spentEur: 99, projectedCostEur: 1 }).result, 'ALLOW');
  const denied = guard.authorize({ spentEur: 199.5, projectedCostEur: 0.51 });
  assert.equal(denied.allowed, false);
  assert.equal(denied.result, 'MONEY_LIMIT');
  assert.equal(denied.auto_recharge, false);
});

test('post-bootstrap monthly ceiling is independently enforced at 10 EUR', () => {
  const guard = new DeepSeekBudgetGuardV0({ monthlyVariableCeilingEur: 10 });
  assert.equal(guard.authorize({ phase: 'post_bootstrap_month', spentEur: 9, projectedCostEur: 1 }).allowed, true);
  assert.equal(guard.authorize({ phase: 'post_bootstrap_month', spentEur: 9.99, projectedCostEur: 0.02 }).result, 'MONEY_LIMIT');
});

test('budget alert levels are deterministic', () => {
  assert.equal(budgetAlertLevel({ spentEur: 49.99, capEur: 100 }), 0);
  assert.equal(budgetAlertLevel({ spentEur: 50, capEur: 100 }), 50);
  assert.equal(budgetAlertLevel({ spentEur: 75, capEur: 100 }), 75);
  assert.equal(budgetAlertLevel({ spentEur: 90, capEur: 100 }), 90);
  assert.equal(budgetAlertLevel({ spentEur: 100, capEur: 100 }), 100);
});
