import {extractDocumentData as extractBase,type ExtractedDocument} from './browserDocumentOcr';

/**
 * La naturaleza global del documento manda sobre palabras incidentales.
 * Una oferta/FEIN/seguro puede mencionar «nómina» como vinculación sin ser una nómina.
 */
export function extractDocumentData(rawText:string,confidence:number|null=null):ExtractedDocument{
 const upper=rawText.toLocaleUpperCase('es');
 const highPriority=/FEIN|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA|OFERTA.*HIPOTEC|OFERTA VINCULANTE|CONDICIONES.*HIPOTEC|PROPUESTA.*FINANCIACI|P[ÓO]LIZA|PRIMA.*SEGURO|ASEGURAD[OA]|COBERTURAS/.test(upper);
 const normalized=highPriority?rawText.replace(/N[ÓO]MINA/gi,'VINCULACIÓN LABORAL'):rawText;
 return extractBase(normalized,confidence);
}
