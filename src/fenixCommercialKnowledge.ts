export const FENIX_COMMERCIAL_KNOWLEDGE = {
  mortgage: {
    threshold: 180000,
    belowThresholdFeeEur: 3500,
    fromThresholdPercent: 0.02,
    realEstateAgencyDefaultCommissionEur: 1100,
    vat: 'plus_vat' as const,
    rule: 'Importe hipotecario inferior a 180.000 €: 3.500 € + IVA. Desde 180.000 € inclusive: 2 % + IVA sobre el importe hipotecario.',
    agencyRule: 'Hipoteca procedente de inmobiliaria: comisión base por defecto 1.100 €, editable por operación cuando exista un importe canónico distinto. El IVA se mantiene separado del margen.',
    negotiatedRule: 'La APP propone siempre el honorario según el tarifario vigente, pero Dirección puede sustituirlo por un honorario final negociado por operación. El importe negociado prevalece en previsión, firmado, cobrado e histórico mientras siga siendo el dato canónico de esa operación.'
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
export type FeeQuote={baseEur:number;vat:'plus_vat';basis:string;recommendedBaseEur:number;overridden:boolean};
export type MortgageEconomics={grossBaseEur:number;agencyCommissionEur:number;fenixMarginBaseEur:number;vat:'plus_vat';basis:string;recommendedGrossBaseEur:number;feeOverridden:boolean;commissionOverridden:boolean};

function validOverride(value:number|undefined){return Number.isFinite(value)&&Number(value)>=0?Number(value):null}

export function quoteMortgageFee(mortgageAmountEur:number,negotiatedFeeEur?:number):FeeQuote|null{
  if(!Number.isFinite(mortgageAmountEur)||mortgageAmountEur<=0)return null;
  const recommended=mortgageAmountEur<FENIX_COMMERCIAL_KNOWLEDGE.mortgage.threshold?FENIX_COMMERCIAL_KNOWLEDGE.mortgage.belowThresholdFeeEur:mortgageAmountEur*FENIX_COMMERCIAL_KNOWLEDGE.mortgage.fromThresholdPercent;
  const override=validOverride(negotiatedFeeEur);
  const baseEur=override??recommended;
  return{baseEur,vat:'plus_vat',basis:mortgageAmountEur<FENIX_COMMERCIAL_KNOWLEDGE.mortgage.threshold?'Hipoteca < 180.000 €':'Hipoteca ≥ 180.000 € · 2 %',recommendedBaseEur:recommended,overridden:override!==null};
}

export function quoteMortgageEconomics(mortgageAmountEur:number,options:{fromRealEstateAgency?:boolean;agencyCommissionEur?:number;negotiatedFeeEur?:number}={}):MortgageEconomics|null{
  const quote=quoteMortgageFee(mortgageAmountEur,options.negotiatedFeeEur);if(!quote)return null;
  const fromAgency=options.fromRealEstateAgency===true;
  const commissionOverride=validOverride(options.agencyCommissionEur);
  const agencyCommissionEur=fromAgency?(commissionOverride??FENIX_COMMERCIAL_KNOWLEDGE.mortgage.realEstateAgencyDefaultCommissionEur):0;
  return{grossBaseEur:quote.baseEur,agencyCommissionEur,fenixMarginBaseEur:quote.baseEur-agencyCommissionEur,vat:'plus_vat',basis:`${quote.basis}${fromAgency?' · origen inmobiliaria':' · origen directo'}${quote.overridden?' · honorario negociado':''}`,recommendedGrossBaseEur:quote.recommendedBaseEur,feeOverridden:quote.overridden,commissionOverridden:fromAgency&&commissionOverride!==null};
}

export function quoteNewBuildFee(negotiatedFeeEur?:number):FeeQuote{
  const recommended=FENIX_COMMERCIAL_KNOWLEDGE.newBuild.feeEur;const override=validOverride(negotiatedFeeEur);
  return{baseEur:override??recommended,vat:'plus_vat',basis:'Obra nueva',recommendedBaseEur:recommended,overridden:override!==null};
}

export function quoteInheritanceFee(feeClass:InheritanceFeeClass,negotiatedFeeEur?:number):FeeQuote{
  const fees:Record<InheritanceFeeClass,number>={
    direct_1_2:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.directOneOrTwoFeeEur,
    direct_3_plus:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.directMoreThanTwoFeeEur,
    with_indirect:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.withIndirectFeeEur,
    complex_mixed:FENIX_COMMERCIAL_KNOWLEDGE.inheritance.complexMixedFeeEur
  };
  const recommended=fees[feeClass];const override=validOverride(negotiatedFeeEur);
  return{baseEur:override??recommended,vat:'plus_vat',basis:`Herencia · ${feeClass}`,recommendedBaseEur:recommended,overridden:override!==null};
}

export const FENIX_COMMERCIAL_KNOWLEDGE_TEXT=[
  FENIX_COMMERCIAL_KNOWLEDGE.mortgage.rule,
  FENIX_COMMERCIAL_KNOWLEDGE.mortgage.agencyRule,
  FENIX_COMMERCIAL_KNOWLEDGE.mortgage.negotiatedRule,
  FENIX_COMMERCIAL_KNOWLEDGE.newBuild.rule,
  FENIX_COMMERCIAL_KNOWLEDGE.inheritance.rule,
  'Los importes anteriores son los valores por defecto que la APP debe proponer automáticamente. Cualquier operación puede guardar un honorario final negociado distinto; nunca se borra la referencia al importe recomendado que lo originó.',
  'La previsión económica nace con el alta de la operación. Si la operación cae o se cancela, sale de la cartera activa y permanece como potencial perdido. Separar bruto, margen Fénix e IVA.',
  'No tipificar ni calcular honorarios cuando falten datos canónicos suficientes para clasificar la operación.'
].join(' ');
