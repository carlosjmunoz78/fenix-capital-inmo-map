import {extractDocumentData as extractCore} from './operationalDocumentExtractionCore';
import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';
import {autofillMasterSchemaFields} from './documentMasterSchemaAutofill';
import {normalizePhysicalFein} from './feinPhysicalNormalizer';
import {normalizePrivatePhysicalCritical} from './privatePhysicalCriticalNormalizer';
import {normalizePrivatePhysicalIdentity} from './privatePhysicalIdentityNormalizer';
import {normalizePrivatePhysicalPayroll} from './privatePhysicalPayrollNormalizer';

function present(v:unknown){return v!==undefined&&v!==null&&String(v).trim()!=='';}
function first(fields:ExtractedFields,...keys:string[]){for(const key of keys)if(present(fields[key]))return fields[key];return undefined;}

/**
 * Canonical aliases used by the participant projection layer.
 * We only derive aliases where the semantic meaning is equivalent; the original
 * extracted fields are kept intact for audit and future schema expansion.
 */
function normalizeParticipantFacts(input:ExtractedFields){
 const fields:ExtractedFields={...input};
 const aliases:Array<[string,string[]]>= [
  ['ingresos_netos_mensuales',['ingresos_netos_mensuales','neto','liquido']],
  ['antiguedad_laboral',['antiguedad_laboral','antiguedad_actual_anos','antiguedad']],
  ['empresa',['empresa','empresa_actual','empresa_pagador']],
  ['documento_identidad',['documento_identidad','dni_nie','numero_documento']],
  ['ahorros',['ahorros','ahorro_disponible']],
  ['tipo_contrato',['tipo_contrato','tipo_de_contrato']],
  ['modalidad_contrato',['modalidad_contrato','modalidad','modalidad_de_contrato']],
  ['fecha_inicio_contrato',['fecha_inicio_contrato','fecha_inicio_laboral','fecha_alta_actual']],
  ['fecha_fin_contrato',['fecha_fin_contrato','fecha_fin_laboral','fecha_vencimiento_contrato']],
  ['jornada',['jornada','tipo_jornada','jornada_laboral']],
  ['categoria_profesional',['categoria_profesional','categoria','grupo_profesional']],
  ['numero_pagas',['numero_pagas','pagas_anuales']]
 ];
 for(const[target,sources]of aliases){if(present(fields[target]))continue;const value=first(fields,...sources);if(present(value))fields[target]=value as string|number|boolean;}
 return fields;
}

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const core=extractCore(rawText,confidence,declaredType);
 const critical=normalizePrivatePhysicalCritical(core,rawText,declaredType);
 const identity=normalizePrivatePhysicalIdentity(critical,rawText,declaredType);
 const payroll=normalizePrivatePhysicalPayroll(identity,rawText,declaredType);
 const typeHint=declaredType||payroll.documentType;
 const normalizedFields=payroll.documentType==='FEIN / FIAE'||/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText)?normalizePhysicalFein(rawText,payroll.fields):payroll.fields;
 const fields=normalizeParticipantFacts(autofillMasterSchemaFields(rawText,normalizedFields,typeHint));
 return {...payroll,fields};
}
