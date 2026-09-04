import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';
import {normalizePhysicalFein} from './feinPhysicalNormalizer';
import {normalizePrivatePhysicalCritical} from './privatePhysicalCriticalNormalizer';
import {normalizePrivatePhysicalIdentity} from './privatePhysicalIdentityNormalizer';
import {normalizePrivatePhysicalPayroll} from './privatePhysicalPayrollNormalizer';

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const core=extractCore(rawText,confidence,declaredType);
 const critical=normalizePrivatePhysicalCritical(core,rawText,declaredType);
 const identity=normalizePrivatePhysicalIdentity(critical,rawText,declaredType);
 const payroll=normalizePrivatePhysicalPayroll(identity,rawText,declaredType);
 const typeHint=declaredType||payroll.documentType;
 const normalizedFields=payroll.documentType==='FEIN / FIAE'||/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText)?normalizePhysicalFein(rawText,payroll.fields):payroll.fields;
 const fields=autofillMasterSchemaFields(rawText,normalizedFields,typeHint);
 return {...payroll,fields};
}
