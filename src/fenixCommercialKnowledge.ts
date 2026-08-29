export const FENIX_COMMERCIAL_KNOWLEDGE = {
  mortgage: {
    threshold: 180000,
    belowThresholdFeeEur: 3500,
    fromThresholdPercent: 0.02,
    realEstateAgencyDefaultCommissionEur: 1100,
    vat: 'plus_vat' as const,
    rule: 'Importe hipotecario inferior a 180.000 €: 3.500 € + IVA. Desde 180.000 € inclusive: 2 % + IVA sobre el importe hipotecario.',
    agencyRule: 'Hipoteca procedente de inmobiliaria: comisión base por defecto 1.100 €, editable por operación cuando exista un importe canónico distinto. El IVA se mantiene separado del margen.'
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
export type MortgageEconomics={grossBaseEur:number;agencyCommissionEur:number;fenixMarginBaseEur:number;vat:'plus_vat';basis:string};

export function quoteMortgageFee(mortgageAmountEur:number):FeeQuote|null{
  if(!Number.isFinite(mortgageAmountEur)||mortgageAmountEur<=0)return null;
  if(mortgageAmountEur<FENIX_COMMERCIAL_KNOWLEDGE.mortgage.threshold){
    return{baseEur:FENIX_COMMERCIAL_KNOWLEDGE.mortgage.belowThresholdFeeEur,vat:'plus_vat',basis:'Hipoteca < 180.000 €'};
  }
  return{baseEur:mortgageAmountEur*FENIX_COMMERCIAL_KNOWLEDGE.mortgage.fromThresholdPercent,vat:'plus_vat',basis:'Hipoteca ≥ 180.000 € · 2 %'};
}

export function quoteMortgageEconomics(mortgageAmountEur:number,options:{fromRealEstateAgency?:boolean;agencyCommissionEur?:number}={}):MortgageEconomics|null{
  const quote=quoteMortgageFee(mortgageAmountEur);if(!quote)return null;
  const fromAgency=options.fromRealEstateAgency===true;
  const override=options.agencyCommissionEur;
  const agencyCommissionEur=fromAgency?(Number.isFinite(override)&&Number(override)>=0?Number(override):FENIX_COMMERCIAL_KNOWLEDGE.mortgage.realEstateAgencyDefaultCommissionEur):0;
  return{grossBaseEur:quote.baseEur,agencyCommissionEur,fenixMarginBaseEur:quote.baseEur-agencyCommissionEur,vat:'plus_vat',basis:`${quote.basis}${fromAgency?' · origen inmobiliaria':' · origen directo'}`};
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
  FENIX_COMMERCIAL_KNOWLEDGE.mortgage.agencyRule,
  FENIX_COMMERCIAL_KNOWLEDGE.newBuild.rule,
  FENIX_COMMERCIAL_KNOWLEDGE.inheritance.rule,
  'La previsión económica nace con el alta de la operación. Si la operación cae o se cancela, sale de la cartera activa y permanece como potencial perdido. Separar bruto, margen Fénix e IVA.',
  'No tipificar ni calcular honorarios cuando falten datos canónicos suficientes para clasificar la operación.'
].join(' ');
