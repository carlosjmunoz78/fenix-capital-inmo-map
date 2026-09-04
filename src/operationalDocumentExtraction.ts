import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';
import {normalizePhysicalFein} from './feinPhysicalNormalizer';
import {normalizePrivatePhysicalCritical} from './privatePhysicalCriticalNormalizer';
import {normalizePrivatePhysicalIdentity} from './privatePhysicalIdentityNormalizer';

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const core=extractCore(rawText,confidence,declaredType);
 const critical=normalizePrivatePhysicalCritical(core,rawText,declaredType);
 const identity=normalizePrivatePhysicalIdentity(critical,rawText,declaredType);
 const typeHint=declaredType||identity.documentType;
 const normalizedFields=identity.documentType==='FEIN / FIAE'||/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText)?normalizePhysicalFein(rawText,identity.fields):identity.fields;
 const fields=autofillMasterSchemaFields(rawText,normalizedFields,typeHint);
 return {...identity,fields};
}
