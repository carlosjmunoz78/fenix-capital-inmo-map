import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const result=extractCore(rawText,confidence,declaredType);
 const typeHint=declaredType||result.documentType;
 const fields=autofillMasterSchemaFields(rawText,result.fields,typeHint);
 return {...result,fields};
}
