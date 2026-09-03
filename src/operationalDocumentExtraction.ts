import {extractDocumentData as extractBase,type ExtractedDocument} from './browserDocumentOcr';

/**
 * La naturaleza global del documento manda sobre palabras incidentales.
 * Una oferta/FEIN/seguro puede mencionar «nómina» como vinculación sin ser una nómina.
 */
function explicitPercent(rawText:string,label:'TIN'|'TAE'){
 const match=rawText.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]?\\s*(-?\\d{1,2}(?:[.,]\\d{1,4})?)\\s*%`,'i'));
 if(!match?.[1])return null;
 const value=Number(match[1].replace(',','.'));
 return Number.isFinite(value)?value:null;
}

export function extractDocumentData(rawText:string,confidence:number|null=null):ExtractedDocument{
 const upper=rawText.toLocaleUpperCase('es');
 const highPriority=/FEIN|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA|OFERTA.*HIPOTEC|OFERTA VINCULANTE|CONDICIONES.*HIPOTEC|PROPUESTA.*FINANCIACI|P[ÓO]LIZA|PRIMA.*SEGURO|ASEGURAD[OA]|COBERTURAS/.test(upper);
 const normalized=highPriority?rawText.replace(/N[ÓO]MINA/gi,'VINCULACIÓN LABORAL'):rawText;
 const result=extractBase(normalized,confidence);
 if(result.documentType==='Oferta bancaria'||result.documentType==='FEIN / FIAE'){
  const tin=explicitPercent(rawText,'TIN');
  const tae=explicitPercent(rawText,'TAE');
  if(tin!==null&&result.fields.tin===undefined)result.fields.tin=tin;
  if(tae!==null&&result.fields.tae===undefined)result.fields.tae=tae;
 }
 return result;
}
