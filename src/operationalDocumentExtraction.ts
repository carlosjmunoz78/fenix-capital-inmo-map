import {extractDocumentData as extractBase,type DocumentFamily,type ExtractedDocument,type ExtractedFields} from './browserDocumentOcr';

function set(f:ExtractedFields,key:string,value:unknown){if(value!==null&&value!==undefined&&value!==''&&f[key]===undefined)f[key]=value as string|number|boolean;}
function setExplicit(f:ExtractedFields,key:string,value:unknown){if(value!==null&&value!==undefined&&value!=='')f[key]=value as string|number|boolean;}
function clean(v:string,max=1200){return v.replace(/[ \t]+/g,' ').replace(/^[:\-–—\s]+/,'').trim().slice(0,max);}
function lines(text:string){return text.replace(/\r/g,'\n').split(/\n+/).map(x=>clean(x,1600)).filter(Boolean);}
function labelledLine(text:string,labels:string[],max=300){for(const line of lines(text)){for(const label of labels){const rx=new RegExp(`^(?:${label})\\s*(?:[:\\-–—]|\\s{2,})\\s*(.{1,${max}})$`,'i');const m=line.match(rx);if(m?.[1])return clean(m[1],max);}}return'';}
function nearby(text:string,labels:string[],span=220){for(const label of labels){const rx=new RegExp(`(?:${label})[\\s\\S]{0,${span}}`,'i');const m=text.match(rx);if(m?.[0])return m[0];}return'';}
function first(text:string,patterns:RegExp[],max=500){for(const p of patterns){const m=text.match(p);if(m?.[1])return clean(m[1],max);}return'';}
function parseNumber(raw:string){const m=raw.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/);if(!m)return null;const token=m[0].replace(/\s/g,'');let normalized=token;if(token.includes(',')&&token.includes('.'))normalized=token.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');else if(token.includes(','))normalized=token.replace(',','.');const n=Number(normalized);return Number.isFinite(n)?n:null;}
function numberNear(text:string,labels:string[],span=180){const w=nearby(text,labels,span);return w?parseNumber(w):null;}
function parseMoney(raw:string){const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i);if(!m)return null;const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function moneyNear(text:string,labels:string[],span=220){const w=nearby(text,labels,span);return w?parseMoney(w):null;}
function parsePercent(raw:string){const m=raw.match(/(-?\d{1,3}(?:[.,]\d{1,4})?)\s*%/);if(!m)return null;const n=Number(m[1].replace(',','.'));return Number.isFinite(n)?n:null;}
function percentNear(text:string,labels:string[],span=160){const w=nearby(text,labels,span);return w?parsePercent(w):null;}
function parseDate(raw:string){const numeric=/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/.exec(raw);const months='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';const words=new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${months})\\s+de\\s+(20\\d{2})\\b`,'i').exec(raw);if(!numeric&&!words)return'';if(words&&(!numeric||(words.index??Infinity)<(numeric.index??Infinity))){const mm:Record<string,string>={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};return`${words[3]}-${mm[words[2].toLowerCase()]}-${words[1].padStart(2,'0')}`;}const y=numeric![3].length===2?`20${numeric![3]}`:numeric![3];return`${y}-${numeric![2].padStart(2,'0')}-${numeric![1].padStart(2,'0')}`;}
function dateNear(text:string,labels:string[],span=180){const w=nearby(text,labels,span);return w?parseDate(w):'';}
function plausiblePerson(v:string){const s=clean(v,140);if(!s||s.length<5||s.length>120)return'';if(/r[eé]gimen|sistema|seguridad social|trabajadores|prestaci[oó]n|efecto del alta|protecci[oó]n de datos/i.test(s))return'';const words=s.split(/\s+/);if(words.length<2||words.length>8)return'';return s;}
function collectMatchingLines(text:string,rx:RegExp,limit=8){const found=lines(text).filter(x=>rx.test(x)).slice(0,limit);return found.join(' | ');}
function allDates(text:string){const out:string[]=[];for(const m of text.matchAll(/\b(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})\b/g)){const d=parseDate(m[1]);if(d&&!out.includes(d))out.push(d);}return out;}

const DECLARED_FAMILY:Record<string,DocumentFamily>={
 'dni':'DNI/NIE','nie':'DNI/NIE','dni/nie':'DNI/NIE','nómina':'Nómina','nomina':'Nómina','préstamo / deuda':'Préstamo / deuda','prestamo / deuda':'Préstamo / deuda','vida laboral':'Vida laboral','irpf':'IRPF','declaración de la renta / irpf':'IRPF','declaracion de la renta / irpf':'IRPF','cirbe':'CIRBE','movimientos bancarios':'Movimientos bancarios','nota simple':'Nota simple','tarjeta de visita':'Tarjeta de visita','contrato / arras':'Contrato / arras','contrato':'Contrato / arras','arras':'Contrato / arras','oferta bancaria':'Oferta bancaria','fein / fiae':'FEIN / FIAE','fein':'FEIN / FIAE','fiae':'FEIN / FIAE','seguro bancario':'Seguro bancario','tasación':'Tasación','tasacion':'Tasación','documento notarial / registral':'Documento notarial / registral','factura / recibo':'Factura / recibo'
};
function declaredFamily(v:string){return DECLARED_FAMILY[v.trim().toLocaleLowerCase('es')]||null;}

function enrichVidaLaboral(text:string,f:ExtractedFields){
 const titular=plausiblePerson(labelledLine(text,['NOMBRE Y APELLIDOS','NOMBRE COMPLETO','TRABAJADOR(?:A)?','INTERESADO(?:A)?'],180)||first(text,[/(?:D\.?\s*\/?\s*D(?:ÑA|NA|ª)\.?|DON|DOÑA)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ' -]{5,120})/i]));
 setExplicit(f,'titular',titular);
 set(f,'nss',first(text,[/(?:N[ÚU]MERO\s+(?:DE\s+)?SEGURIDAD\s+SOCIAL|NSS|NAF)\s*[:\-]?\s*([0-9][0-9\s\/-]{7,22})/i]));
 const reportDate=dateNear(text,['FECHA DEL INFORME','FECHA DE EMISI[ÓO]N','A FECHA DE']);if(reportDate)setExplicit(f,'fecha_informe',reportDate);
 set(f,'situacion_actual',labelledLine(text,['SITUACI[ÓO]N ACTUAL','SITUACI[ÓO]N'],220));
 set(f,'regimen',labelledLine(text,['R[ÉE]GIMEN ACTUAL','R[ÉE]GIMEN'],220));
 set(f,'empresa_actual',labelledLine(text,['EMPRESA ACTUAL','RAZ[ÓO]N SOCIAL ACTUAL','EMPRESA'],300));
 const altaDate=dateNear(text,['FECHA DE ALTA ACTUAL','FECHA DE ALTA']);if(altaDate)setExplicit(f,'fecha_alta_actual',altaDate);
 set(f,'antiguedad',labelledLine(text,['ANTIG[ÜU]EDAD'],180)||altaDate);
 set(f,'total_dias',first(text,[/(?:TOTAL(?:\s+DE)?\s+D[IÍ]AS|D[IÍ]AS\s+EN\s+ALTA|HA\s+ESTADO\s+DE\s+ALTA)[^0-9]{0,40}(\d{1,6})/i]));
 set(f,'periodos_trabajados',collectMatchingLines(text,/\b(?:R[ÉE]GIMEN|EMPRESA|SITUACI[ÓO]N)\b.*\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/i,12));
 set(f,'empresas_anteriores',collectMatchingLines(text,/\b(?:EMPRESA|C\.C\.C\.|CIF)\b/i,10));
 set(f,'incidencias',collectMatchingLines(text,/solap|incidencia|pluriactividad|pluriempleo/i,8));
}

function enrichNomina(text:string,f:ExtractedFields){
 setExplicit(f,'titular',plausiblePerson(labelledLine(text,['TRABAJADOR(?:A)?','EMPLEADO(?:A)?','NOMBRE Y APELLIDOS'],180)));
 set(f,'empresa',labelledLine(text,['EMPRESA','RAZ[ÓO]N SOCIAL','PAGADOR'],260));
 set(f,'empresa_pagador',f.empresa);
 set(f,'cif_empresa',first(text,[/(?:CIF|NIF)\s*(?:EMPRESA)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9-]{7,14})/i]));
 const period=labelledLine(text,['PER[IÍ]ODO','MES'],120)||first(text,[/\b((?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+20\d{2})\b/i,/\b(0?[1-9]|1[0-2])\s*[\/-]\s*(20\d{2})\b/i]);set(f,'periodo',period);
 set(f,'antiguedad',labelledLine(text,['ANTIG[ÜU]EDAD'],100)||dateNear(text,['FECHA DE ALTA']));
 set(f,'categoria_profesional',labelledLine(text,['CATEGOR[IÍ]A(?: PROFESIONAL)?','GRUPO PROFESIONAL'],180));
 set(f,'salario_base',moneyNear(text,['SALARIO BASE']));
 set(f,'complementos',moneyNear(text,['COMPLEMENTOS','COMPLEMENTO']));
 set(f,'pagas_extra',moneyNear(text,['PAGAS? EXTRA','PAGA EXTRA','PRORRATA']));
 set(f,'bruto',moneyNear(text,['TOTAL DEVENGADO','TOTAL DEVENGOS','BRUTO']));
 set(f,'base_cotizacion',moneyNear(text,['BASE DE COTIZACI[ÓO]N','BASE COTIZACI[ÓO]N','BASE CC']));
 set(f,'irpf',percentNear(text,['IRPF','RETENCI[ÓO]N IRPF']));
 set(f,'deducciones',moneyNear(text,['TOTAL DEDUCCIONES','DEDUCCIONES']));
 set(f,'neto',moneyNear(text,['L[IÍ]QUIDO A PERCIBIR','TOTAL L[IÍ]QUIDO','NETO']));
 const embargo=collectMatchingLines(text,/embargo|retenci[oó]n judicial|anticipo/i,5);if(embargo){setExplicit(f,'embargos',embargo);setExplicit(f,'anticipos',embargo);}
}

function enrichIrpf(text:string,f:ExtractedFields){
 setExplicit(f,'titular',plausiblePerson(labelledLine(text,['PRIMER DECLARANTE','DECLARANTE','CONTRIBUYENTE','NOMBRE Y APELLIDOS'],200)));
 set(f,'ejercicio',first(text,[/(?:EJERCICIO|PER[IÍ]ODO IMPOSITIVO)\D{0,20}(20\d{2})/i]));
 set(f,'modalidad',labelledLine(text,['MODALIDAD','TIPO DE DECLARACI[ÓO]N'],120));
 set(f,'rendimientos_trabajo',moneyNear(text,['RENDIMIENTOS DEL TRABAJO','RENDIMIENTO NETO DEL TRABAJO'],260));
 set(f,'rendimientos_actividad',moneyNear(text,['ACTIVIDADES ECON[ÓO]MICAS','RENDIMIENTO NETO ACTIVIDADES'],260));
 set(f,'rendimientos_capital',moneyNear(text,['RENDIMIENTOS DEL CAPITAL','CAPITAL MOBILIARIO'],260));
 set(f,'rendimientos_inmobiliarios',moneyNear(text,['CAPITAL INMOBILIARIO','RENDIMIENTOS INMOBILIARIOS'],260));
 set(f,'ganancias_perdidas',moneyNear(text,['GANANCIAS Y P[ÉE]RDIDAS','GANANCIAS PATRIMONIALES'],260));
 set(f,'base_imponible',moneyNear(text,['BASE IMPONIBLE GENERAL','BASE IMPONIBLE'],240));
 set(f,'base_liquidable',moneyNear(text,['BASE LIQUIDABLE GENERAL','BASE LIQUIDABLE'],240));
 set(f,'resultado',moneyNear(text,['RESULTADO DE LA DECLARACI[ÓO]N','CUOTA DIFERENCIAL','RESULTADO'],220));
 set(f,'resultado_declaracion',f.resultado);
 set(f,'inmuebles',collectMatchingLines(text,/referencia catastral|inmueble|vivienda habitual/i,8));
 set(f,'prestamos_hipotecas',collectMatchingLines(text,/pr[eé]stamo hipotecario|hipoteca|capital pendiente/i,6));
}

function enrichMovimientos(text:string,f:ExtractedFields){
 setExplicit(f,'titular',plausiblePerson(labelledLine(text,['TITULAR(?:ES)?','CLIENTE(?:S)?'],220)));
 set(f,'iban',first(text,[/\b(ES\d{2}(?:\s?\d{4}){5})\b/i]));
 set(f,'entidad',labelledLine(text,['ENTIDAD','BANCO'],220)||first(text,[/^\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9 .&-]{3,60})\s*$/m]));
 const dates=allDates(text);if(dates.length>=2)setExplicit(f,'periodo',`${dates[0]} - ${dates[dates.length-1]}`);
 set(f,'saldo_inicial',moneyNear(text,['SALDO INICIAL','SALDO ANTERIOR']));
 set(f,'saldo_final',moneyNear(text,['SALDO FINAL','SALDO ACTUAL']));
 set(f,'saldo_disponible',moneyNear(text,['SALDO DISPONIBLE']));
 set(f,'ingresos_recurrentes',collectMatchingLines(text,/n[oó]mina|pensi[oó]n|ingreso|abono/i,10));
 set(f,'nominas',collectMatchingLines(text,/n[oó]mina|haberes|salario/i,8));
 set(f,'cuotas_prestamos',collectMatchingLines(text,/pr[eé]stamo|financiaci[oó]n|cuota|cr[eé]dito/i,10));
 set(f,'alquileres',collectMatchingLines(text,/alquiler|arrendamiento/i,8));
 set(f,'pensiones',collectMatchingLines(text,/pensi[oó]n/i,8));
 set(f,'recibos',collectMatchingLines(text,/recibo|domiciliaci[oó]n/i,12));
 set(f,'descubiertos',collectMatchingLines(text,/descubierto|saldo deudor|n[uú]meros rojos/i,6));
 set(f,'comisiones',collectMatchingLines(text,/comisi[oó]n/i,8));
 set(f,'transferencias',collectMatchingLines(text,/transferencia|bizum/i,10));
}

function enrichFein(text:string,f:ExtractedFields){set(f,'prestatarios',labelledLine(text,['NOMBRE DEL PRESTATARIO','PRESTATARIO(?:S)?','TITULAR(?:ES)?'],500));set(f,'entidad',labelledLine(text,['ENTIDAD PRESTAMISTA','PRESTAMISTA','ENTIDAD','BANCO'],260));set(f,'importe_prestamo',moneyNear(text,['IMPORTE DEL PR[ÉE]STAMO','IMPORTE FINANCIADO']));set(f,'tin',percentNear(text,['TIPO DE INTER[EÉ]S NOMINAL','TIN']));set(f,'tae',percentNear(text,['TASA ANUAL EQUIVALENTE','TAE']));set(f,'cuota',moneyNear(text,['CUOTA MENSUAL','CUOTA']));set(f,'plazo',labelledLine(text,['PLAZO DEL PR[ÉE]STAMO','DURACI[ÓO]N DEL PR[ÉE]STAMO','PLAZO'],180));set(f,'numero_cuotas',numberNear(text,['N[ÚU]MERO DE CUOTAS'],100));set(f,'vinculaciones',collectMatchingLines(text,/vinculad|bonific|producto combinado/i,10));set(f,'comisiones',collectMatchingLines(text,/comisi[oó]n/i,8));set(f,'gastos',collectMatchingLines(text,/gastos/i,8));set(f,'impago',collectMatchingLines(text,/impago|vencimiento anticipado/i,8));set(f,'amortizacion_anticipada',collectMatchingLines(text,/amortizaci[oó]n anticipada|reembolso anticipado/i,8));set(f,'fecha_emision',dateNear(text,['FECHA DE EMISI[ÓO]N','FECHA DE ENTREGA']));set(f,'vigencia',labelledLine(text,['V[ÁA]LIDA HASTA','VIGENCIA','VALIDEZ'],260));}
function enrichOther(type:string,text:string,f:ExtractedFields){if(type==='Préstamo / deuda'){set(f,'titular',labelledLine(text,['TITULAR','CLIENTE'],260));set(f,'entidad',labelledLine(text,['ENTIDAD','BANCO','ACREEDOR'],260));set(f,'cuota',moneyNear(text,['CUOTA','IMPORTE RECIBO','MENSUALIDAD']));set(f,'capital_pendiente',moneyNear(text,['CAPITAL PENDIENTE','SALDO PENDIENTE','PRINCIPAL PENDIENTE']));set(f,'tipo_interes',percentNear(text,['TIPO DE INTER[EÉ]S','TIN']));set(f,'vencimiento',dateNear(text,['VENCIMIENTO','FECHA FIN']));}if(type==='CIRBE'){set(f,'titular',labelledLine(text,['TITULAR','PERSONA'],260));set(f,'riesgo_dispuesto',moneyNear(text,['RIESGO DISPUESTO','DISPUESTO TOTAL','RIESGO DIRECTO']));set(f,'riesgo_disponible',moneyNear(text,['RIESGO DISPONIBLE','L[IÍ]MITE DISPONIBLE']));}if(type==='Nota simple'){set(f,'registro',labelledLine(text,['REGISTRO DE LA PROPIEDAD','REGISTRO'],260));set(f,'numero_finca',labelledLine(text,['N[ÚU]MERO DE FINCA','FINCA REGISTRAL','FINCA'],220));set(f,'cru',labelledLine(text,['CRU','IDUFIR'],120));set(f,'titulares',labelledLine(text,['TITULAR(?:ES)?','TITULARIDAD'],700));set(f,'referencia_catastral',first(text,[/(?:REFERENCIA CATASTRAL)\s*[:\-]?\s*([A-Z0-9]{14,20})/i]));set(f,'cargas',collectMatchingLines(text,/carga|gravamen|hipoteca|embargo/i,10));}if(type==='Tasación'){set(f,'tasadora',labelledLine(text,['SOCIEDAD DE TASACI[ÓO]N','TASADORA','ENTIDAD TASADORA'],300));set(f,'tasador',labelledLine(text,['TASADOR','T[ÉE]CNICO TASADOR','T[ÉE]CNICO'],260));set(f,'fecha_tasacion',dateNear(text,['FECHA DE TASACI[ÓO]N','FECHA DEL INFORME']));set(f,'direccion',labelledLine(text,['DIRECCI[ÓO]N DEL INMUEBLE','DIRECCI[ÓO]N','EMPLAZAMIENTO'],600));set(f,'referencia_catastral',labelledLine(text,['REFERENCIA CATASTRAL'],120));const su=numberNear(text,['SUPERFICIE [ÚU]TIL'],120);if(su!==null)setExplicit(f,'superficie_util',su);const sc=numberNear(text,['SUPERFICIE CONSTRUIDA'],120);if(sc!==null)setExplicit(f,'superficie_construida',sc);set(f,'valor_tasacion',moneyNear(text,['VALOR DE TASACI[ÓO]N']));set(f,'valor_hipotecario',moneyNear(text,['VALOR HIPOTECARIO']));set(f,'condicionantes',collectMatchingLines(text,/condicionante|advertencia|salvedad/i,10));set(f,'observaciones_tasador',collectMatchingLines(text,/observaci[oó]n/i,8));}if(type==='Seguro bancario'){set(f,'aseguradora',labelledLine(text,['ENTIDAD ASEGURADORA','ASEGURADORA','COMPAÑ[IÍ]A'],300));set(f,'tomador',labelledLine(text,['TOMADOR'],300));set(f,'prima',moneyNear(text,['PRIMA ANUAL','PRIMA MENSUAL','PRIMA']));set(f,'coberturas',collectMatchingLines(text,/cobertura|garant[ií]a/i,10));}}

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const declared=declaredFamily(declaredType);
 let result=extractBase(rawText,confidence);
 if(declared&&declared!==result.documentType)result={...result,documentType:declared,fields:{}};
 if(result.documentType==='Vida laboral')enrichVidaLaboral(rawText,result.fields);
 else if(result.documentType==='Nómina')enrichNomina(rawText,result.fields);
 else if(result.documentType==='IRPF')enrichIrpf(rawText,result.fields);
 else if(result.documentType==='Movimientos bancarios')enrichMovimientos(rawText,result.fields);
 else if(result.documentType==='Oferta bancaria'||result.documentType==='FEIN / FIAE')enrichFein(rawText,result.fields);
 else enrichOther(result.documentType,rawText,result.fields);
 result.summary='';
 return result;
}
