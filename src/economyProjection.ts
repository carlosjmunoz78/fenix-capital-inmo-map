import {quoteInheritanceFee,quoteMortgageEconomics,quoteNewBuildFee,type InheritanceFeeClass} from './fenixCommercialKnowledge';

export type EconomyRow=Record<string,unknown>;
export type MoneyBucket={grossBaseEur:number;marginBaseEur:number,count:number};
export type EconomyProjection={active:MoneyBucket;advanced:MoneyBucket;signed:MoneyBucket;collected:MoneyBucket;lost:MoneyBucket;typedCount:number;untypedCount:number;collectionKnown:boolean};

type Quoted={grossBaseEur:number;marginBaseEur:number};
const zero=():MoneyBucket=>({grossBaseEur:0,marginBaseEur:0,count:0});
function firstText(r:EconomyRow,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='string'&&v.trim())return v.trim()}return''}
function num(r:EconomyRow,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='number'&&Number.isFinite(v))return v;if(typeof v==='string'&&v.trim()){const normalized=v.trim().replace(/\s/g,'').replace(/€/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(normalized);if(Number.isFinite(n))return n}}return null}
function count(r:EconomyRow,numberKeys:string[],arrayKeys:string[]){const n=num(r,numberKeys);if(n!==null)return n;for(const k of arrayKeys){const v=r[k];if(Array.isArray(v))return v.length}return null}
function bool(r:EconomyRow,keys:string[]){for(const k of keys){const v=r[k];if(typeof v==='boolean')return v;if(typeof v==='string'){if(/^(sí|si|true|1)$/i.test(v.trim()))return true;if(/^(no|false|0)$/i.test(v.trim()))return false}}return null}
function status(r:EconomyRow){return [firstText(r,['estado','status']),firstText(r,['fase','phase']),firstText(r,['estado_economico'])].filter(Boolean).join(' ').toLowerCase()}
function isDemo(r:EconomyRow){return String(r.id??'').startsWith('demo-')||r.synthetic===true}
function isLost(r:EconomyRow){return /(ca[ií]d|cancel|anulad|perdid|archivad|rechazad|desist|no viable|cerrad[^\n]*sin)/i.test(status(r))}
function isSigned(r:EconomyRow){return /(firmad|devengad|completad)/i.test(status(r))}
function isAdvanced(r:EconomyRow){return isSigned(r)||/(fein|firma|notar|aprob)/i.test(status(r))}
function isCollected(r:EconomyRow){return bool(r,['cobrado','pagado','cobro_confirmado'])===true||/(cobrad|pagad)/i.test(status(r))}
function collectionSignal(r:EconomyRow){return ['cobrado','pagado','cobro_confirmado'].some(k=>Object.prototype.hasOwnProperty.call(r,k))||/(cobrad|pagad)/i.test(status(r))}
function add(bucket:MoneyBucket,q:Quoted){bucket.grossBaseEur+=q.grossBaseEur;bucket.marginBaseEur+=q.marginBaseEur;bucket.count++}
function negotiatedGross(r:EconomyRow){return num(r,['honorarios_finales_eur','honorarios_finales','honorarios_negociados_eur','honorarios_negociados','honorarios_base_eur','honorarios_base'])}
function fromAgency(r:EconomyRow){const explicit=bool(r,['origen_inmobiliaria','procede_inmobiliaria','es_inmobiliaria']);if(explicit!==null)return explicit;const origin=firstText(r,['origen','procedencia','canal','fuente']);if(/inmobiliaria|agencia/i.test(origin))return true;return Boolean(firstText(r,['inmobiliaria_id','inmobiliaria','agencia_id','agencia']))}
function mortgageQuote(r:EconomyRow):Quoted|null{
 const amount=num(r,['importe_hipoteca','importe_solicitado','importe_financiacion','capital_hipoteca','importe']);
 const agency=fromAgency(r);const commission=num(r,['comision_inmobiliaria_eur','comision_inmobiliaria','comision_agencia_eur','comision_agencia']);
 const negotiated=negotiatedGross(r);
 if(amount===null){if(negotiated===null)return null;const applied=agency?(commission!==null&&commission>=0?commission:1100):0;return{grossBaseEur:negotiated,marginBaseEur:negotiated-applied}}
 const q=quoteMortgageEconomics(amount,{fromRealEstateAgency:agency,agencyCommissionEur:commission??undefined,negotiatedFeeEur:negotiated??undefined});return q?{grossBaseEur:q.grossBaseEur,marginBaseEur:q.fenixMarginBaseEur}:null
}
function inheritanceClass(r:EconomyRow):InheritanceFeeClass|null{
 const raw=firstText(r,['clase_honorarios','categoria_honorarios','tipificacion_honorarios']).toLowerCase();
 if(raw){if(/complex_mixed|complejidad excepcional|muchos.*direct.*indirect/i.test(raw))return'complex_mixed';if(/with_indirect|indirect/i.test(raw))return'with_indirect';if(/direct_1_2|1\s*[-–]\s*2|uno.*dos/i.test(raw))return'direct_1_2';if(/direct_3_plus|más de 2|mas de 2|3\+/i.test(raw))return'direct_3_plus'}
 if(bool(r,['complejidad_excepcional','muchos_herederos'])===true)return'complex_mixed';
 const indirect=count(r,['numero_herederos_indirectos','herederos_indirectos_count'],['herederos_indirectos']);if(indirect!==null&&indirect>0)return'with_indirect';
 const direct=count(r,['numero_herederos_directos','herederos_directos_count'],['herederos_directos']);if(direct!==null){if(direct>=1&&direct<=2)return'direct_1_2';if(direct>2)return'direct_3_plus'}
 return null
}
function quote(r:EconomyRow,kind:'mortgage'|'inheritance'|'newBuild'):Quoted|null{
 const negotiated=negotiatedGross(r);
 if(kind==='mortgage')return mortgageQuote(r);
 if(kind==='newBuild'){const q=quoteNewBuildFee(negotiated??undefined);return{grossBaseEur:q.baseEur,marginBaseEur:q.baseEur}}
 const cls=inheritanceClass(r);if(!cls){return negotiated===null?null:{grossBaseEur:negotiated,marginBaseEur:negotiated}}
 const q=quoteInheritanceFee(cls,negotiated??undefined);return{grossBaseEur:q.baseEur,marginBaseEur:q.baseEur}
}

export function buildEconomyProjection(mortgages:EconomyRow[],inheritances:EconomyRow[]=[],newBuilds:EconomyRow[]=[]):EconomyProjection{
 const out:EconomyProjection={active:zero(),advanced:zero(),signed:zero(),collected:zero(),lost:zero(),typedCount:0,untypedCount:0,collectionKnown:false};
 const groups:[EconomyRow[],'mortgage'|'inheritance'|'newBuild'][]=[[mortgages,'mortgage'],[inheritances,'inheritance'],[newBuilds,'newBuild']];
 for(const[rows,kind]of groups)for(const r of rows){if(isDemo(r))continue;out.collectionKnown=out.collectionKnown||collectionSignal(r);const q=quote(r,kind);if(!q){if(!isLost(r))out.untypedCount++;continue}out.typedCount++;if(isLost(r)){add(out.lost,q);continue}if(isCollected(r)){add(out.collected,q);continue}add(out.active,q);if(isAdvanced(r))add(out.advanced,q);if(isSigned(r))add(out.signed,q)}
 return out
}
