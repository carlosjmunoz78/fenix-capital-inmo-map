import { test, expect } from '@playwright/test';
import { calculateMortgage, FORMULA_VERSION } from '../src/calculator';

test('calculator derives LTV, effort, own funds, savings gap and 35% capacity', () => {
  const r=calculateMortgage({
    principal:180000,
    annualRate:3,
    years:30,
    purchasePrice:200000,
    purchaseCosts:20000,
    availableSavings:30000,
    netIncome:3000,
    otherPayments:150,
    targetEffortPct:35,
    mortgageType:'fixed'
  });
  expect(FORMULA_VERSION).toBe('CAL-FR-1.1.0');
  expect(r.financingPct).toBe(90);
  expect(r.acquisitionTotal).toBe(220000);
  expect(r.requiredOwnFunds).toBe(40000);
  expect(r.savingsGap).toBe(10000);
  expect(r.maxMonthlyMortgageAtTarget).toBe(900);
  expect(r.maxPrincipalAtTarget).toBeGreaterThan(210000);
  expect(r.effortPct).toBeGreaterThan(30);
  expect(r.warnings).toContain('Ahorro disponible inferior a los fondos propios estimados');
});

test('zero-rate capacity is deterministic and does not assume purchase costs', () => {
  const r=calculateMortgage({principal:120000,annualRate:0,years:20,purchasePrice:150000,netIncome:2500,otherPayments:0});
  expect(r.monthlyPayment).toBe(500);
  expect(r.requiredOwnFunds).toBe(30000);
  expect(r.maxMonthlyMortgageAtTarget).toBe(875);
  expect(r.maxPrincipalAtTarget).toBe(210000);
});
