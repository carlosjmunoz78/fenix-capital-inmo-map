import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';
import {normalizePhysicalFein} from './feinPhysicalNormalizer';
import {normalizePrivatePhysicalCritical} from './privatePhysicalCriticalNormalizer';
import {normalizePrivatePhysicalIdentity} from './privatePhysicalIdentityNormalizer';
import {normalizePrivatePhysicalPayroll} from './privatePhysicalPayrollNormalizer';
import {normalizePrivatePhysicalVidaLaboral} from './privatePhysicalVidaLaboralNormalizer';

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const core=extractCore(rawText,confidence,declaredType);
 const critical=normalizePrivatePhysicalCritical(core,rawText,declaredType);
 const identity=normalizePrivatePhysicalIdentity(critical,rawText,declaredType);
 const payroll=normalizePrivatePhysicalPayroll(identity,rawText,declaredType);
 const vida=normalizePrivatePhysicalVidaLaboral(payroll,rawText,declaredType);
 const typeHint=declaredType||vida.documentType;
 const normalizedFields=vida.documentType==='FEIN / FIAE'||/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText)?normalizePhysicalFein(rawText,vida.fields):vida.fields;
 const fields=autofillMasterSchemaFields(rawText,normalizedFields,typeHint);
 return {...vida,fields};
}
