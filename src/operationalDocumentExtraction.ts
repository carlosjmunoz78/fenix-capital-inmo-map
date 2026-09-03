import {extractDocumentData as extractBase,type ExtractedDocument,type ExtractedFields} from './browserDocumentOcr';

function explicitPercent(rawText:string,label:'TIN'|'TAE'){
 const match=rawText.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]?\\s*(-?\\d{1,2}(?:[.,]\\d{1,4})?)\\s*%`,'i'));
 if(!match?.[1])return null;const value=Number(match[1].replace(',','.'));return Number.isFinite(value)?value:null;
}
function lineValue(text:string,labels:string[],max=240){for(const label of labels){const m=text.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:\\-]?\\s*([^\\n]{1,${max}})`,'i'));if(m?.[1])return m[1].trim();}return'';}
function numberValue(text:string,labels:string[]){const raw=lineValue(text,labels);if(!raw)return null;const m=raw.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/);if(!m)return null;const n=Number(m[0].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function dateValue(text:string,labels:string[]){const raw=lineValue(text,labels);const m=raw.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(!m)return'';return`${m[3].length===2?`20${m[3]}`:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
function set(f:ExtractedFields,key:string,value:unknown){if(value!==null&&value!==undefined&&value!==''&&f[key]===undefined)f[key]=value as string|number|boolean;}
function percentValue(text:string,labels:string[]){for(const label of labels){const raw=lineValue(text,[label]);const m=raw.match(/(-?\d{1,3}(?:[.,]\d{1,4})?)\s*%/);if(m){const n=Number(m[1].replace(',','.'));if(Number.isFinite(n))return n;}}return null;}

function enrich(type:string,text:string,f:ExtractedFields){
 if(type==='Vida laboral'){
  set(f,'fecha_informe',dateValue(text,['FECHA DEL INFORME','FECHA DE EMISI[ÓO]N']));set(f,'regimen',lineValue(text,['R[ÉE]GIMEN','R[ÉE]GIMEN ACTUAL']));set(f,'empresa_actual',lineValue(text,['EMPRESA ACTUAL','RAZ[ÓO]N SOCIAL ACTUAL','EMPRESA']));set(f,'fecha_alta_actual',dateValue(text,['FECHA DE ALTA ACTUAL','FECHA DE ALTA']));set(f,'antiguedad',lineValue(text,['ANTIG[ÜU]EDAD']));set(f,'periodos_trabajados',lineValue(text,['PER[IÍ]ODOS TRABAJADOS','SITUACIONES DE ALTA'],700));set(f,'empresas_anteriores',lineValue(text,['EMPRESAS ANTERIORES'],700));set(f,'incidencias',lineValue(text,['INCIDENCIAS','OBSERVACIONES','SOLAPAMIENTOS'],700));
 }
 if(type==='Tasación'){
  set(f,'tasadora',lineValue(text,['SOCIEDAD DE TASACI[ÓO]N','TASADORA','ENTIDAD TASADORA']));set(f,'tasador',lineValue(text,['TASADOR','T[ÉE]CNICO TASADOR','T[ÉE]CNICO']));set(f,'fecha_tasacion',dateValue(text,['FECHA DE TASACI[ÓO]N','FECHA DEL INFORME','FECHA']));set(f,'direccion',lineValue(text,['DIRECCI[ÓO]N DEL INMUEBLE','DIRECCI[ÓO]N','EMPLAZAMIENTO']));set(f,'referencia_catastral',lineValue(text,['REFERENCIA CATASTRAL']));set(f,'finalidad',lineValue(text,['FINALIDAD DE LA TASACI[ÓO]N','FINALIDAD']));set(f,'superficie_util',numberValue(text,['SUPERFICIE [ÚU]TIL','SUP\. [ÚU]TIL']));set(f,'superficie_construida',numberValue(text,['SUPERFICIE CONSTRUIDA','SUP\. CONSTRUIDA']));set(f,'superficie_parcela',numberValue(text,['SUPERFICIE DE PARCELA','PARCELA']));set(f,'uso',lineValue(text,['USO','DESTINO']));set(f,'estado_conservacion',lineValue(text,['ESTADO DE CONSERVACI[ÓO]N','CONSERVACI[ÓO]N']));set(f,'valor_tasacion',numberValue(text,['VALOR DE TASACI[ÓO]N','VALOR TASACI[ÓO]N']));set(f,'valor_hipotecario',numberValue(text,['VALOR HIPOTECARIO']));set(f,'comparables',lineValue(text,['COMPARABLES','TESTIGOS'],900));set(f,'condicionantes',lineValue(text,['CONDICIONANTES','CONDICIONES'],900));set(f,'advertencias',lineValue(text,['ADVERTENCIAS','ADVERTENCIA'],900));set(f,'observaciones_tasador',lineValue(text,['OBSERVACIONES DEL TASADOR','OBSERVACIONES'],900));set(f,'salvedades',lineValue(text,['SALVEDADES','EXCEPCIONES'],900));set(f,'documentacion_pendiente',lineValue(text,['DOCUMENTACI[ÓO]N PENDIENTE','DOCUMENTOS PENDIENTES'],700));set(f,'vigencia',lineValue(text,['VIGENCIA','CADUCIDAD']));
 }
 if(type==='Nota simple'){
  set(f,'numero_finca',lineValue(text,['N[ÚU]MERO DE FINCA','FINCA REGISTRAL','FINCA']));set(f,'cru',lineValue(text,['CRU','IDUFIR']));set(f,'descripcion_finca',lineValue(text,['DESCRIPCI[ÓO]N DE LA FINCA','DESCRIPCI[ÓO]N'],900));set(f,'superficie',numberValue(text,['SUPERFICIE','CABIDA']));set(f,'titulares',lineValue(text,['TITULAR(?:ES)?','TITULARIDAD'],700));set(f,'porcentaje_titularidad',lineValue(text,['PORCENTAJE DE TITULARIDAD','CUOTA DE TITULARIDAD']));set(f,'titulo_adquisicion',lineValue(text,['T[ÍI]TULO DE ADQUISICI[ÓO]N','T[ÍI]TULO'],700));set(f,'hipotecas',lineValue(text,['HIPOTECAS','HIPOTECA'],900));set(f,'embargos',lineValue(text,['EMBARGOS','EMBARGO'],900));set(f,'limitaciones',lineValue(text,['LIMITACIONES'],900));set(f,'servidumbres',lineValue(text,['SERVIDUMBRES','SERVIDUMBRE'],900));set(f,'anotaciones',lineValue(text,['ANOTACIONES PREVENTIVAS','ANOTACIONES'],900));set(f,'fecha_expedicion',dateValue(text,['FECHA DE EXPEDICI[ÓO]N','FECHA']));
 }
 if(type==='Oferta bancaria'||type==='FEIN / FIAE'){
  set(f,'titulares',lineValue(text,['PRESTATARIO(?:S)?','TITULAR(?:ES)?','CLIENTE(?:S)?'],500));set(f,'porcentaje_financiacion',percentValue(text,['PORCENTAJE DE FINANCIACI[ÓO]N','FINANCIACI[ÓO]N','LTV']));set(f,'valor_tasacion',numberValue(text,['VALOR DE TASACI[ÓO]N','TASACI[ÓO]N CONSIDERADA']));set(f,'modalidad',lineValue(text,['MODALIDAD','TIPO DE PR[ÉE]STAMO','TIPO DE HIPOTECA']));set(f,'cuota',numberValue(text,['CUOTA MENSUAL','CUOTA']));set(f,'diferencial',percentValue(text,['DIFERENCIAL']));set(f,'indice',lineValue(text,['[ÍI]NDICE DE REFERENCIA','[ÍI]NDICE']));set(f,'vinculaciones',lineValue(text,['PRODUCTOS VINCULADOS','VINCULACIONES','BONIFICACIONES'],900));set(f,'bonificaciones',lineValue(text,['BONIFICACIONES'],900));set(f,'comisiones',lineValue(text,['COMISIONES'],900));set(f,'productos',lineValue(text,['PRODUCTOS COMBINADOS','PRODUCTOS'],900));set(f,'condiciones',lineValue(text,['CONDICIONES ESPECIALES','CONDICIONES'],900));set(f,'numero_cuotas',numberValue(text,['N[ÚU]MERO DE CUOTAS','CUOTAS']));set(f,'sistema_amortizacion',lineValue(text,['SISTEMA DE AMORTIZACI[ÓO]N','AMORTIZACI[ÓO]N']));set(f,'coste_total',numberValue(text,['COSTE TOTAL','IMPORTE TOTAL ADEUDADO']));set(f,'gastos',lineValue(text,['GASTOS'],900));set(f,'impago',lineValue(text,['CONSECUENCIAS DE IMPAGO','IMPAGO'],900));set(f,'amortizacion_anticipada',lineValue(text,['AMORTIZACI[ÓO]N ANTICIPADA','REEMBOLSO ANTICIPADO'],900));set(f,'condiciones_revision',lineValue(text,['CONDICIONES DE REVISI[ÓO]N','REVISI[ÓO]N DEL TIPO'],900));set(f,'fecha_emision',dateValue(text,['FECHA DE EMISI[ÓO]N','FECHA']));set(f,'vigencia',lineValue(text,['VIGENCIA','VALIDEZ']));
 }
 if(type==='Seguro bancario'){
  set(f,'aseguradora',lineValue(text,['ASEGURADORA','ENTIDAD ASEGURADORA','COMPAÑ[IÍ]A']));set(f,'tomador',lineValue(text,['TOMADOR']));set(f,'asegurado',lineValue(text,['ASEGURADO']));set(f,'tipo_seguro',lineValue(text,['TIPO DE SEGURO','PRODUCTO','P[ÓO]LIZA']));set(f,'capital_asegurado',numberValue(text,['CAPITAL ASEGURADO','SUMA ASEGURADA']));set(f,'coberturas',lineValue(text,['COBERTURAS','GARANT[ÍI]AS'],900));set(f,'exclusiones',lineValue(text,['EXCLUSIONES'],900));set(f,'prima',numberValue(text,['PRIMA ANUAL','PRIMA MENSUAL','PRIMA']));set(f,'periodicidad',lineValue(text,['PERIODICIDAD','FORMA DE PAGO']));set(f,'duracion',lineValue(text,['DURACI[ÓO]N','VIGENCIA']));set(f,'bonificacion',lineValue(text,['BONIFICACI[ÓO]N HIPOTECARIA','BONIFICACI[ÓO]N']));
 }
 if(type==='Documento notarial / registral'){
  set(f,'notario',lineValue(text,['NOTARIO(?:/A)?','ANTE M[IÍ]','NOTAR[IÍ]A']));set(f,'protocolo',lineValue(text,['N[ÚU]MERO DE PROTOCOLO','PROTOCOLO']));set(f,'fecha',dateValue(text,['FECHA DE OTORGAMIENTO','OTORGADA EL','FECHA']));set(f,'otorgantes',lineValue(text,['OTORGANTES','COMPARECIENTES'],900));set(f,'inmueble',lineValue(text,['INMUEBLE','FINCA','VIVIENDA'],700));set(f,'precio',numberValue(text,['PRECIO','VALOR DECLARADO','VALOR']));set(f,'cargas',lineValue(text,['CARGAS','GRAV[ÁA]MENES'],900));set(f,'clausulas',lineValue(text,['CL[ÁA]USULAS RELEVANTES','ESTIPULACIONES'],1200));
 }
}

export function extractDocumentData(rawText:string,confidence:number|null=null):ExtractedDocument{
 const upper=rawText.toLocaleUpperCase('es');
 const highPriority=/FEIN|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA|OFERTA.*HIPOTEC|OFERTA VINCULANTE|CONDICIONES.*HIPOTEC|PROPUESTA.*FINANCIACI|P[ÓO]LIZA|PRIMA.*SEGURO|ASEGURAD[OA]|COBERTURAS/.test(upper);
 const normalized=highPriority?rawText.replace(/N[ÓO]MINA/gi,'VINCULACIÓN LABORAL'):rawText;
 const result=extractBase(normalized,confidence);
 if(result.documentType==='Oferta bancaria'||result.documentType==='FEIN / FIAE'){
  const tin=explicitPercent(rawText,'TIN'),tae=explicitPercent(rawText,'TAE');if(tin!==null&&result.fields.tin===undefined)result.fields.tin=tin;if(tae!==null&&result.fields.tae===undefined)result.fields.tae=tae;
 }
 enrich(result.documentType,rawText,result.fields);
 if(result.documentType==='Oferta bancaria'||result.documentType==='FEIN / FIAE'){
  const rawVinculaciones=lineValue(rawText,['PRODUCTOS VINCULADOS','VINCULACIONES','BONIFICACIONES'],900);if(rawVinculaciones)result.fields.vinculaciones=rawVinculaciones;
 }
 return result;
}
