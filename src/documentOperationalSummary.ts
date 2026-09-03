export type SummaryRow=Record<string,unknown>;

function clean(v:unknown){return typeof v==='string'?v.trim():'';}
function first(row:SummaryRow,keys:string[]){for(const k of keys){const v=row[k];if(v!==null&&v!==undefined&&String(v).trim()!=='')return String(v).trim();}return'';}
function push(parts:string[],label:string,value:string){if(value)parts.push(`${label}: ${value}`);}
function parseCerebroNotes(row:SummaryRow){
 const notes=first(row,['resumen_documento','summary','resumen','notas','Notas','notes']);
 if(!notes)return'';
 if(!notes.includes('[CEREBRO · LECTURA DOCUMENTAL]'))return notes.length<=1200?notes:'';
 const idx=notes.indexOf('{');if(idx<0)return'';
 try{const parsed=JSON.parse(notes.slice(idx));return clean(parsed?.summary);}catch{return'';}
}
function typeOf(row:SummaryRow){return first(row,['tipo_canónico','tipo_canonico','tipo','categoria','categoría','document_type','detected_document_type']).toLocaleLowerCase('es');}
function generic(row:SummaryRow){
 const hidden=new Set(['id','synthetic','fuente','destino','url','archivo_url','url_archivo','file_url','source_url','original_url','pdf','url_pdf','documento_url','enlace','link','archivo','notas','Notas','notes']);
 const entries=Object.entries(row).filter(([k,v])=>!hidden.has(k)&&v!==null&&v!==undefined&&String(v).trim()!=='').slice(0,8);
 if(!entries.length)return'Documento registrado sin datos suficientes para elaborar un resumen operativo. No se han inferido datos ausentes.';
 return entries.map(([k,v])=>`${k.replaceAll('_',' ')}: ${String(v)}`).join(' · ')+'.';
}
export function buildDocumentOperationalSummary(row:SummaryRow|null){
 if(!row)return'';
 const stored=parseCerebroNotes(row);if(stored)return stored;
 const type=typeOf(row),parts:string[]=[];
 if(type.includes('vida laboral')){
  push(parts,'Titular',first(row,['titular','cliente','nombre']));push(parts,'Situación',first(row,['situacion_actual','situación_actual','situacion']));push(parts,'Empresa/alta relevante',first(row,['empresa_actual','empresa','empleador']));push(parts,'Antigüedad',first(row,['antiguedad','antigüedad','fecha_alta']));push(parts,'Días en alta',first(row,['total_dias','dias_alta','días_alta']));push(parts,'Periodo',first(row,['periodo','período']));
 }
 else if(type.includes('tasaci')){
  push(parts,'Inmueble',first(row,['inmueble','direccion','dirección','ubicacion','ubicación']));push(parts,'Superficie',first(row,['superficie','metros','metros_cuadrados','m2','superficie_construida','superficie_util']));push(parts,'Valor de tasación',first(row,['valor_tasacion','valor_tasación','importe','valor']));push(parts,'Fecha',first(row,['fecha_tasacion','fecha_tasación','fecha']));push(parts,'Finalidad',first(row,['finalidad']));push(parts,'Condicionantes',first(row,['condicionantes','condiciones','limitaciones']));push(parts,'Observaciones del tasador',first(row,['observaciones_tasador','observaciones','anotaciones','comentarios']));push(parts,'Excepciones',first(row,['excepciones','salvedades','advertencias']));
 }
 else if(type.includes('oferta')||type.includes('fein')||type.includes('fiae')){
  push(parts,'Entidad',first(row,['entidad','banco']));push(parts,'Producto',first(row,['producto','modalidad']));push(parts,'Importe',first(row,['importe_prestamo','importe_préstamo','importe']));push(parts,'Plazo',first(row,['plazo_meses','plazo','duracion']));push(parts,'TIN',first(row,['tin']));push(parts,'TAE',first(row,['tae']));push(parts,'Cuota',first(row,['cuota']));push(parts,'Vinculaciones',first(row,['vinculaciones','bonificaciones']));push(parts,'Comisiones/condiciones',first(row,['comisiones','condiciones','observaciones']));
 }
 else if(type.includes('nómina')||type.includes('nomina')){
  push(parts,'Titular',first(row,['titular','trabajador','cliente']));push(parts,'Pagador',first(row,['empresa_pagador','empresa','pagador']));push(parts,'Bruto',first(row,['bruto','total_devengado']));push(parts,'Neto',first(row,['neto','liquido','líquido']));push(parts,'Base de cotización',first(row,['base_cotizacion','base_cotización']));push(parts,'Periodo',first(row,['periodo','mes']));push(parts,'Antigüedad',first(row,['antiguedad','antigüedad']));
 }
 else if(type.includes('préstamo')||type.includes('prestamo')||type.includes('deuda')){
  push(parts,'Entidad',first(row,['entidad','banco','acreedor']));push(parts,'Titular',first(row,['titular','cliente']));push(parts,'Cuota',first(row,['cuota','mensualidad']));push(parts,'Capital pendiente',first(row,['capital_pendiente','saldo_pendiente']));push(parts,'Tipo de interés',first(row,['tipo_interes','tin']));push(parts,'Vencimiento',first(row,['vencimiento','fecha_fin']));
 }
 else if(type.includes('nota simple')){
  push(parts,'Registro',first(row,['registro']));push(parts,'Finca',first(row,['finca','numero_finca']));push(parts,'Titularidad',first(row,['titularidad','titular']));push(parts,'Referencia catastral',first(row,['referencia_catastral']));push(parts,'Cargas',first(row,['cargas','gravamenes','gravámenes']));push(parts,'Anotaciones',first(row,['anotaciones','observaciones']));
 }
 else if(type.includes('irpf')||type.includes('renta')){
  push(parts,'Titular',first(row,['titular','declarante','contribuyente']));push(parts,'Ejercicio',first(row,['ejercicio','periodo']));push(parts,'Rendimientos del trabajo',first(row,['rendimientos_trabajo']));push(parts,'Base imponible',first(row,['base_imponible']));push(parts,'Resultado',first(row,['resultado_declaracion','resultado']));
 }
 else if(type.includes('cirbe')){
  push(parts,'Titular',first(row,['titular']));push(parts,'Riesgo dispuesto',first(row,['riesgo_dispuesto']));push(parts,'Riesgo disponible',first(row,['riesgo_disponible']));push(parts,'Observaciones',first(row,['observaciones','anotaciones']));
 }
 else if(type.includes('seguro')){
  push(parts,'Aseguradora',first(row,['aseguradora','entidad']));push(parts,'Tomador',first(row,['tomador','titular']));push(parts,'Prima',first(row,['prima','prima_anual']));push(parts,'Coberturas',first(row,['coberturas']));push(parts,'Exclusiones/observaciones',first(row,['exclusiones','observaciones','condiciones']));
 }
 if(parts.length)return parts.join(' · ')+'.';
 return generic(row);
}
