import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';
import {normalizePhysicalFein} from './feinPhysicalNormalizer';

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const result=extractCore(rawText,confidence,declaredType);
 const typeHint=declaredType||result.documentType;
 const normalizedFields=result.documentType==='FEIN / FIAE'||/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText)?normalizePhysicalFein(rawText,result.fields):result.fields;
 const fields=autofillMasterSchemaFields(rawText,normalizedFields,typeHint);
 return {...result,fields};
}
