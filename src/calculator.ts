export const FORMULA_VERSION = 'CAL-FR-1.1.0';

export type CalcInput = {
  principal: number;
  annualRate: number;
  years: number;
  purchasePrice?: number;
  purchaseCosts?: number;
  availableSavings?: number;
  netIncome?: number;
  otherPayments?: number;
  targetEffortPct?: number;
  mortgageType?: 'fixed' | 'mixed' | 'variable';
};

export type CalcResult = {
  monthlyPayment: number;
  totalPaid: number;
  estimatedInterest: number;
  payments: number;
  financingPct: number | null;
  effortPct: number | null;
  acquisitionTotal: number | null;
  requiredOwnFunds: number | null;
  savingsGap: number | null;
  maxMonthlyMortgageAtTarget: number | null;
  maxPrincipalAtTarget: number | null;
  targetEffortPct: number;
  warnings: string[];
  projectionStatus: 'calculated' | 'assumptions_required';
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function principalFromPayment(payment:number,r:number,n:number){
  if(payment<=0)return 0;
  if(r===0)return payment*n;
  return payment*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n));
}

export function calculateMortgage(input: CalcInput): CalcResult {
  const type = input.mortgageType ?? 'fixed';
  const targetEffortPct = input.targetEffortPct ?? 35;
  if (input.principal <= 0 || input.years <= 0 || input.annualRate < 0 || targetEffortPct <= 0 || targetEffortPct > 100) {
    throw new Error('invalid_input');
  }

  const n = input.years * 12;
  const financingPct = input.purchasePrice && input.purchasePrice > 0 ? round2(input.principal / input.purchasePrice * 100) : null;
  const acquisitionTotal = input.purchasePrice && input.purchasePrice > 0
    ? round2(input.purchasePrice + Math.max(0,input.purchaseCosts ?? 0))
    : null;
  const requiredOwnFunds = acquisitionTotal !== null ? round2(Math.max(0,acquisitionTotal-input.principal)) : null;
  const savingsGap = requiredOwnFunds !== null && input.availableSavings !== undefined
    ? round2(Math.max(0,requiredOwnFunds-Math.max(0,input.availableSavings)))
    : null;

  if (type !== 'fixed') {
    return {
      monthlyPayment: 0,
      totalPaid: 0,
      estimatedInterest: 0,
      payments: n,
      financingPct,
      effortPct: null,
      acquisitionTotal,
      requiredOwnFunds,
      savingsGap,
      maxMonthlyMortgageAtTarget: null,
      maxPrincipalAtTarget: null,
      targetEffortPct,
      warnings: ['Simulación futura no calculada sin supuestos explícitos'],
      projectionStatus: 'assumptions_required'
    };
  }

  const r = input.annualRate / 12 / 100;
  const monthly = r === 0 ? input.principal / n : input.principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const monthlyPayment = round2(monthly);
  const totalPaid = round2(monthly * n);
  const estimatedInterest = round2(totalPaid - input.principal);
  const effortPct = input.netIncome && input.netIncome > 0 ? round2((monthlyPayment + Math.max(0,input.otherPayments ?? 0)) / input.netIncome * 100) : null;
  const maxMonthlyMortgageAtTarget = input.netIncome && input.netIncome > 0
    ? round2(Math.max(0,input.netIncome*(targetEffortPct/100)-Math.max(0,input.otherPayments ?? 0)))
    : null;
  const maxPrincipalAtTarget = maxMonthlyMortgageAtTarget !== null
    ? round2(principalFromPayment(maxMonthlyMortgageAtTarget,r,n))
    : null;
  const warnings: string[] = [];
  if (financingPct !== null && financingPct > 100) warnings.push('Financiación superior al precio informado');
  if (effortPct !== null && effortPct > targetEffortPct) warnings.push(`Esfuerzo superior al objetivo del ${targetEffortPct}%`);
  if (savingsGap !== null && savingsGap > 0) warnings.push('Ahorro disponible inferior a los fondos propios estimados');

  return {
    monthlyPayment,totalPaid,estimatedInterest,payments:n,financingPct,effortPct,
    acquisitionTotal,requiredOwnFunds,savingsGap,maxMonthlyMortgageAtTarget,maxPrincipalAtTarget,targetEffortPct,
    warnings,projectionStatus:'calculated'
  };
}
