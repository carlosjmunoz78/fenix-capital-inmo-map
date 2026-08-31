export const FORMULA_VERSION = 'CAL-FR-1.0.0';

export type CalcInput = {
  principal: number;
  annualRate: number;
  years: number;
  purchasePrice?: number;
  netIncome?: number;
  otherPayments?: number;
  mortgageType?: 'fixed' | 'mixed' | 'variable';
};

export type CalcResult = {
  monthlyPayment: number;
  totalPaid: number;
  estimatedInterest: number;
  payments: number;
  financingPct: number | null;
  effortPct: number | null;
  warnings: string[];
  projectionStatus: 'calculated' | 'assumptions_required';
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateMortgage(input: CalcInput): CalcResult {
  const type = input.mortgageType ?? 'fixed';
  if (input.principal <= 0 || input.years <= 0 || input.annualRate < 0) {
    throw new Error('invalid_input');
  }

  if (type !== 'fixed') {
    return {
      monthlyPayment: 0,
      totalPaid: 0,
      estimatedInterest: 0,
      payments: input.years * 12,
      financingPct: input.purchasePrice && input.purchasePrice > 0 ? round2(input.principal / input.purchasePrice * 100) : null,
      effortPct: null,
      warnings: ['Simulación futura no calculada sin supuestos explícitos'],
      projectionStatus: 'assumptions_required'
    };
  }

  const n = input.years * 12;
  const r = input.annualRate / 12 / 100;
  const monthly = r === 0 ? input.principal / n : input.principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const monthlyPayment = round2(monthly);
  const totalPaid = round2(monthly * n);
  const estimatedInterest = round2(totalPaid - input.principal);
  const financingPct = input.purchasePrice && input.purchasePrice > 0 ? round2(input.principal / input.purchasePrice * 100) : null;
  const effortPct = input.netIncome && input.netIncome > 0 ? round2((monthlyPayment + (input.otherPayments ?? 0)) / input.netIncome * 100) : null;
  const warnings: string[] = [];
  if (financingPct !== null && financingPct > 100) warnings.push('Financiación superior al precio informado');

  return { monthlyPayment, totalPaid, estimatedInterest, payments: n, financingPct, effortPct, warnings, projectionStatus: 'calculated' };
}
