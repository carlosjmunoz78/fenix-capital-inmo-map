export const FENIX_COMMERCIAL_KNOWLEDGE = {
  mortgage: {
    threshold: 180000,
    belowThresholdFeeEur: 3500,
    fromThresholdPercent: 0.02,
    vat: 'plus_vat' as const,
    rule: 'Importe hipotecario inferior a 180.000 €: 3.500 € + IVA. Desde 180.000 € inclusive: 2 % + IVA sobre el importe hipotecario.'
  },
  newBuild: {
    feeEur: 800,
    vat: 'plus_vat' as const,
    rule: 'Obra nueva: 800 € + IVA.'
  },
  inheritance: {
    directOneOrTwoFeeEur: 600,
    directMoreThanTwoFeeEur: 800,
    withIndirectFeeEur: 1000,
    complexMixedFeeEur: 1200,
    vat: 'plus_vat' as const,
    rule: 'Herencias: 1–2 herederos directos 600 € + IVA; más de 2 herederos directos 800 € + IVA; con herederos indirectos 1.000 € + IVA; expedientes con muchos herederos directos e indirectos 1.200 € + IVA.'
  }
} as const;

export type InheritanceFeeClass='direct_1_2'|'direct_3_plus'|'with_indirect'|'complex_mixed';
export type FeeQuote={baseEur:number;vat:'plus_vat';basis:string};

export function quoteMortgageFee(mortgageAmountEur:number):FeeQuote|null{
  if(!Number.isFinite(mortgageAmountEur)||mortgageAmountEur<=0)return null;
  if(mortgageAmountEur<FENIX_COMMERCIAL_KNOWLEDGE.mortgage.threshold){
    return{baseEur:FENIX_COMMERCIAL_KNOWLEDGE.mortgage.belowThresholdFeeEur,vat:'plus_vat',basis:'Hipoteca < 180.000 €'};
  }
  return{baseEur:mortgageAmountEur*FENIX_COMMERCIAL_KNOWLEDGE.mortgage.fromThresholdPercent,vat:'plus_vat',basis:'Hipoteca ≥ 180.000 € · 2 %'};
}

export function quoteNewBuildFee():FeeQuote{
  return{baseEur:FENIX_COMMERCIAL_KNOWLEDGE.newBuild.feeEur,vat:'plus_vat',basis:'Obra nueva'};
}

export function quoteInheritanceFee(feeClass:InheritanceFeeClass):FeeQuote{
  const fees:Record<InheritanceFeeClass,number>={
    direct_1_2:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.directOneOrTwoFeeEur,
    direct_3_plus:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.directMoreThanTwoFeeEur,
    with_indirect:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.withIndirectFeeEur,
    complex_mixed:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.complexMixedFeeEur
  };
  return{baseEur:fees[feeClass],vat:'plus_vat',basis:`Herencia · ${feeClass}`};
}

export const FENIX_COMMERCIAL_KNOWLEDGE_TEXT=[
  FENIX_COMMERCIAL_KNOWLEDGE.mortgage.rule,
  FENIX_COMMERCIAL_KNOWLEDGE.newBuild.rule,
  FENIX_COMMERCIAL_KNOWLEDGE.inheritance.rule,
  'No tipificar ni calcular honorarios cuando falten datos canónicos suficientes para clasificar la operación.'
].join(' ');
