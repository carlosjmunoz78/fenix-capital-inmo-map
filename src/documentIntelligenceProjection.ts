import {buildFieldValidation} from './documentFieldValidation';

export type IntelligenceRow=Record<string,unknown>;

type IntelligencePayload={
  declared_document_type?:unknown;
  detected_document_type?:unknown;
  summary?:unknown;
  fields?:Record<string,unknown>;
  confidence?:unknown;
  field_confidence?:Record<string,unknown>;
  evidence?:Record<string,unknown>;
  field_status?:Record<string,unknown>;
  conflicts?:unknown;
  processed_at?:unknown;
};

function cleanKey(key:string){return key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
function firstString(row:IntelligenceRow,keys:string[]){for(const key of keys){const v=row[key];if(typeof v==='string'&&v.trim())return v.trim();}return'';}
function parsePayload(row:IntelligenceRow):IntelligencePayload|null{
 const direct=(row.document_intelligence&&typeof row.document_intelligence==='object'&&!Array.isArray(row.document_intelligence))?row.document_intelligence as IntelligencePayload:null;
 if(direct)return direct;
 const notes=firstString(row,['Notas','notas','notes']);
 if(!notes||!notes.includes('[CEREBRO · LECTURA DOCUMENTAL]'))return null;
 const start=notes.indexOf('{');if(start<0)return null;
 try{const parsed=JSON.parse(notes.slice(start));return parsed&&typeof parsed==='object'?parsed:null;}catch{return null;}
}

const aliases:Record<string,string>={
 documento_identidad:'dni_nie',numero_documento:'dni_nie',direccion_inmueble:'direccion',domicilio_inmueble:'direccion',
 empresa_pagador:'empresa',nombre_contacto:'nombre',telefono_contacto:'telefono',email_contacto:'email',
 resultado_declaracion:'resultado',saldo:'saldo_final',riesgo_total_dispuesto:'riesgo_dispuesto',riesgo_total_disponible:'riesgo_disponible',
 finca_registral:'finca',numero_finca_registral:'numero_finca',titularidad:'titulares',titular:'titular',
 importe_tasacion:'valor_tasacion',valoracion:'valor_tasacion',valor_hipotecario_tasacion:'valor_hipotecario',
 metros_utiles:'superficie_util',m2_utiles:'superficie_util',metros_construidos:'superficie_construida',m2_construidos:'superficie_construida',
 observacion_tasador:'observaciones_tasador',anotaciones_tasador:'observaciones_tasador',observaciones_salvedades:'observaciones_tasador',salvedad:'salvedades',
 capital:'importe_prestamo',importe_financiado:'importe_prestamo',duracion:'plazo',duracion_meses:'plazo',plazo_meses:'plazo',
 tipo_interes:'tin',tipo_de_interes:'tin',vinculacion:'vinculaciones',productos_vinculados:'vinculaciones',
 entidad_fein:'entidad',entidad_prestamista:'entidad',prestatario:'prestatarios',prestatario_nombre:'prestatarios',
 nss_naf:'nss',naf:'nss',numero_seguridad_social:'nss',total_dias_cotizados:'total_dias',numero_periodos:'periodos_trabajados',
 financiacion:'porcentaje_financiacion',porcentaje_financiado:'porcentaje_financiacion',bonificacion:'bonificaciones',
 compania_seguro:'aseguradora',entidad_aseguradora:'aseguradora',prima_anual:'prima',tipo_poliza:'tipo_seguro',
 nombre_notario:'notario',numero_protocolo:'protocolo',fecha_otorgamiento:'fecha',
 capital_pendiente:'saldo_pendiente',principal_pendiente:'saldo_pendiente',
 causante_nombre:'causante',herederos_nombres:'herederos',fecha_defuncion:'fecha_fallecimiento',
 pension_alimenticia:'pension_alimentos',pension_compensatoria_mensual:'pension_compensatoria',
 estado_obra:'estado_ejecucion',porcentaje_ejecutado:'estado_ejecucion',coste_restante:'coste_pendiente'
};

function bindDerivedVisibleFields(out:Record<string,unknown>){
 const nombre=typeof out.nombre==='string'?out.nombre.trim():'';
 const apellidos=typeof out.apellidos==='string'?out.apellidos.trim():'';
 if(!out.nombre_completo&&nombre&&apellidos)out.nombre_completo=`${nombre} ${apellidos}`.replace(/\s+/g,' ').trim();
 if(!out.titular&&out.nombre_completo)out.titular=out.nombre_completo;
 return out;
}

function canonicalizeFields(fields:Record<string,unknown>){
 const out:Record<string,unknown>={};
 for(const [rawKey,value] of Object.entries(fields||{})){
  if(value===undefined||value===null||String(value).trim()==='')continue;
  const normalized=cleanKey(rawKey);const canonical=aliases[normalized]||normalized;
  if(out[canonical]===undefined)out[canonical]=value;
  if(out[normalized]===undefined)out[normalized]=value;
 }
 return bindDerivedVisibleFields(out);
}

function canonicalizeMeta(meta:Record<string,unknown>|undefined){if(!meta)return undefined;const out:Record<string,unknown>={};for(const [rawKey,value] of Object.entries(meta)){const normalized=cleanKey(rawKey);const canonical=aliases[normalized]||normalized;if(out[canonical]===undefined)out[canonical]=value;}return out;}

export function projectDocumentIntelligence(row:IntelligenceRow|null){
 if(!row)return null;
 const payload=parsePayload(row);
 const base=canonicalizeFields(row);
 if(!payload){
  const projected={...row,...base} as IntelligenceRow;
  const {quality,summary}=buildFieldValidation({fields:base,globalConfidence:row.confianza_extraccion,source:'document_row'});
  projected.field_quality=quality;projected.validation_summary=summary;projected.estado_validacion_documental=summary.status;
  return projected;
 }
 const canonicalFields=canonicalizeFields(payload.fields||{});
 const projected:IntelligenceRow={...row,...base,...canonicalFields};
 const declared=typeof payload.declared_document_type==='string'?payload.declared_document_type.trim():'';
 const detected=typeof payload.detected_document_type==='string'?payload.detected_document_type.trim():'';
 const current=firstString(row,['tipo_canónico','tipo_canonico','tipo','categoria','categoría']);
 if((!current||/^documento$/i.test(current))&&(declared||detected))projected['tipo_canónico']=detected||declared;
 if(typeof payload.summary==='string'&&payload.summary.trim())projected.resumen_documento=payload.summary.trim();
 if(payload.confidence!==undefined&&payload.confidence!==null)projected.confianza_extraccion=payload.confidence;
 if(typeof payload.processed_at==='string')projected.fecha_lectura_inteligente=payload.processed_at;
 const {quality,summary}=buildFieldValidation({fields:canonicalFields,globalConfidence:payload.confidence,fieldConfidence:canonicalizeMeta(payload.field_confidence),evidence:canonicalizeMeta(payload.evidence),fieldStatus:canonicalizeMeta(payload.field_status),conflicts:payload.conflicts,source:'document_intelligence'});
 projected.field_quality=quality;projected.validation_summary=summary;projected.estado_validacion_documental=summary.status;
 return projected;
}
