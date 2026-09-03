import {extractDocumentData as extractBase,type ExtractedDocument,type ExtractedFields} from './browserDocumentOcr';

function set(f:ExtractedFields,key:string,value:unknown){if(value!==null&&value!==undefined&&value!==''&&f[key]===undefined)f[key]=value as string|number|boolean;}
function setExplicit(f:ExtractedFields,key:string,value:unknown){if(value!==null&&value!==undefined&&value!=='')f[key]=value as string|number|boolean;}
function clean(v:string,max=1200){return v.replace(/[ \t]+/g,' ').replace(/^[:\-–—\s]+/,'').trim().slice(0,max);}
function looseValue(text:string,labels:string[],max=300){for(const label of labels){const rx=new RegExp(`(?:^|\\n|\\b)(?:${label})\\s*(?:[:\\-–—]|\\n)?\\s*([^\\n]{1,${max}})`,'i');const m=text.match(rx);if(m?.[1]){const v=clean(m[1],max);if(v)return v;}}return'';}
function nearby(text:string,labels:string[],span=220){for(const label of labels){const rx=new RegExp(`(?:${label})[\\s\\S]{0,${span}}`,'i');const m=text.match(rx);if(m?.[0])return m[0];}return'';}
function parseNumber(raw:string){const m=raw.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/);if(!m)return null;const token=m[0].replace(/\s/g,'');let normalized=token;if(token.includes(',')&&token.includes('.'))normalized=token.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');else if(token.includes(','))normalized=token.replace(',','.');const n=Number(normalized);return Number.isFinite(n)?n:null;}
function numberNear(text:string,labels:string[],span=180){const w=nearby(text,labels,span);return w?parseNumber(w):null;}
function parseMoney(raw:string){const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i);if(!m)return null;const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function moneyNear(text:string,labels:string[]){const w=nearby(text,labels);return w?parseMoney(w):null;}
function parsePercent(raw:string){const m=raw.match(/(-?\d{1,3}(?:[.,]\d{1,4})?)\s*%/);if(!m)return null;const n=Number(m[1].replace(',','.'));return Number.isFinite(n)?n:null;}
function percentNear(text:string,labels:string[]){const w=nearby(text,labels,160);return w?parsePercent(w):null;}
function parseDate(raw:string){const m=raw.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(m){const y=m[3].length===2?`20${m[3]}`:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}const months='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';const w=raw.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${months})\\s+de\\s+(20\\d{2})\\b`,'i'));if(!w)return'';const mm:{[k:string]:string}={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};return`${w[3]}-${mm[w[2].toLowerCase()]}-${w[1].padStart(2,'0')}`;}
function dateNear(text:string,labels:string[]){const w=nearby(text,labels,180);return w?parseDate(w):'';}
function first(text:string,patterns:RegExp[],max=500){for(const p of patterns){const m=text.match(p);if(m?.[1])return clean(m[1],max);}return'';}

const DECLARED_SEED:Record<string,string>={
 'dni':'DOCUMENTO NACIONAL DE IDENTIDAD','nie':'NIE IDENTITY CARD','dni/nie':'DOCUMENTO NACIONAL DE IDENTIDAD',
 'nómina':'RECIBO DE SALARIOS NÓMINA','nomina':'RECIBO DE SALARIOS NÓMINA','préstamo / deuda':'RECIBO PRÉSTAMO CUOTA CAPITAL PENDIENTE','prestamo / deuda':'RECIBO PRÉSTAMO CUOTA CAPITAL PENDIENTE',
 'vida laboral':'INFORME DE VIDA LABORAL','irpf':'IMPUESTO SOBRE LA RENTA IRPF','cirbe':'CENTRAL DE INFORMACIÓN DE RIESGOS CIRBE',
 'movimientos bancarios':'EXTRACTO MOVIMIENTOS CUENTA','nota simple':'NOTA SIMPLE REGISTRO DE LA PROPIEDAD','tarjeta de visita':'TARJETA DE VISITA',
 'contrato / arras':'CONTRATO DE ARRAS','contrato':'CONTRATO DE ARRAS','arras':'CONTRATO DE ARRAS','oferta bancaria':'OFERTA HIPOTECA',
 'fein / fiae':'FEIN FICHA EUROPEA DE INFORMACIÓN NORMALIZADA','fein':'FEIN FICHA EUROPEA DE INFORMACIÓN NORMALIZADA','fiae':'FEIN FICHA EUROPEA DE INFORMACIÓN NORMALIZADA',
 'seguro bancario':'PÓLIZA SEGURO COBERTURAS','tasación':'INFORME DE TASACIÓN VALOR DE TASACIÓN','tasacion':'INFORME DE TASACIÓN VALOR DE TASACIÓN',
 'documento notarial / registral':'ESCRITURA NOTARÍA PROTOCOLO','factura / recibo':'FACTURA TOTAL A PAGAR'
};
function declarationSeed(v:string){return DECLARED_SEED[v.trim().toLocaleLowerCase('es')]||'';}

function enrichVidaLaboral(text:string,f:ExtractedFields){
 set(f,'titular',looseValue(text,['NOMBRE Y APELLIDOS','NOMBRE COMPLETO','TRABAJADOR(?:A)?','INTERESADO(?:A)?'],220)||first(text,[/(?:D\.?\s*\/?\s*D(?:ÑA|NA|ª)\.?|DON|DOÑA)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ' -]{5,120})/i]));
 set(f,'nss',first(text,[/(?:N[ÚU]MERO\s+(?:DE\s+)?SEGURIDAD\s+SOCIAL|NSS|NAF)\s*[:\-]?\s*([0-9][0-9\s\/-]{7,22})/i]));
 const reportDate=dateNear(text,['FECHA DEL INFORME','FECHA DE EMISI[ÓO]N','A FECHA DE']);
 if(reportDate)setExplicit(f,'fecha_informe',reportDate);else set(f,'fecha_informe',dateNear(text,['FECHA']));
 set(f,'regimen',looseValue(text,['R[ÉE]GIMEN ACTUAL','R[ÉE]GIMEN'],180));
 set(f,'empresa_actual',looseValue(text,['EMPRESA ACTUAL','RAZ[ÓO]N SOCIAL ACTUAL','EMPRESA'],260));
 const altaDate=dateNear(text,['FECHA DE ALTA ACTUAL','FECHA DE ALTA','ALTA']);
 if(altaDate)setExplicit(f,'fecha_alta_actual',altaDate);
 set(f,'antiguedad',looseValue(text,['ANTIG[ÜU]EDAD'],180));
 set(f,'total_dias',first(text,[/(?:TOTAL(?:\s+DE)?\s+D[IÍ]AS|D[IÍ]AS\s+EN\s+ALTA|HA\s+ESTADO\s+DE\s+ALTA)[^0-9]{0,40}(\d{1,6})/i]));
 set(f,'periodos_trabajados',looseValue(text,['PER[IÍ]ODOS TRABAJADOS','SITUACIONES DE ALTA'],900));
 set(f,'empresas_anteriores',looseValue(text,['EMPRESAS ANTERIORES'],900));
 set(f,'incidencias',looseValue(text,['INCIDENCIAS','OBSERVACIONES','SOLAPAMIENTOS'],900));
}
function enrichFein(text:string,f:ExtractedFields){
 set(f,'titulares',looseValue(text,['NOMBRE DEL PRESTATARIO','PRESTATARIO(?:S)?','TITULAR(?:ES)?','CLIENTE(?:S)?','SOLICITANTE(?:S)?'],500));
 set(f,'entidad',looseValue(text,['ENTIDAD PRESTAMISTA','PRESTAMISTA','ENTIDAD','BANCO'],260));
 set(f,'producto',looseValue(text,['PRODUCTO','MODALIDAD','TIPO DE PR[ÉE]STAMO','TIPO DE HIPOTECA'],300));
 set(f,'importe_prestamo',moneyNear(text,['IMPORTE DEL PR[ÉE]STAMO','IMPORTE PR[ÉE]STAMO','CAPITAL','IMPORTE FINANCIADO']));
 set(f,'precio_compra',moneyNear(text,['PRECIO DE COMPRA','PRECIO COMPRAVENTA','VALOR DE COMPRAVENTA']));
 set(f,'valor_tasacion',moneyNear(text,['VALOR DE TASACI[ÓO]N','TASACI[ÓO]N CONSIDERADA']));
 set(f,'porcentaje_financiacion',percentNear(text,['PORCENTAJE DE FINANCIACI[ÓO]N','FINANCIACI[ÓO]N','LTV']));
 set(f,'tin',percentNear(text,['TIPO DE INTER[EÉ]S NOMINAL','TIN']));
 set(f,'tae',percentNear(text,['TASA ANUAL EQUIVALENTE','TAE']));
 set(f,'cuota',moneyNear(text,['CUOTA MENSUAL','CUOTA']));
 set(f,'diferencial',percentNear(text,['DIFERENCIAL']));
 set(f,'indice',looseValue(text,['[ÍI]NDICE DE REFERENCIA','[ÍI]NDICE'],180));
 set(f,'plazo',looseValue(text,['PLAZO DEL PR[ÉE]STAMO','DURACI[ÓO]N DEL PR[ÉE]STAMO','PLAZO'],180));
 const cuotasRaw=first(text,[/(?:N[ÚU]MERO DE CUOTAS|CUOTAS)\D{0,20}(\d{1,4})/i]);
 if(cuotasRaw)setExplicit(f,'numero_cuotas',Number(cuotasRaw));
 set(f,'vinculaciones',looseValue(text,['PRODUCTOS VINCULADOS','VINCULACIONES','BONIFICACIONES'],1000));
 set(f,'bonificaciones',looseValue(text,['BONIFICACIONES'],800));
 set(f,'comisiones',looseValue(text,['COMISIONES'],1000));
 set(f,'gastos',looseValue(text,['GASTOS'],1000));
 set(f,'impago',looseValue(text,['CONSECUENCIAS DE IMPAGO','IMPAGO'],1200));
 set(f,'amortizacion_anticipada',looseValue(text,['AMORTIZACI[ÓO]N ANTICIPADA','REEMBOLSO ANTICIPADO'],1200));
 set(f,'sistema_amortizacion',looseValue(text,['SISTEMA DE AMORTIZACI[ÓO]N','AMORTIZACI[ÓO]N'],300));
 const emissionDate=dateNear(text,['FECHA DE EMISI[ÓO]N DE LA FEIN','FECHA DE EMISI[ÓO]N','FECHA DE ENTREGA']);
 if(emissionDate)setExplicit(f,'fecha_emision',emissionDate);else set(f,'fecha_emision',dateNear(text,['FECHA']));
 set(f,'vigencia',looseValue(text,['V[ÁA]LIDA HASTA','VIGENCIA','VALIDEZ'],260));
}
function enrichOther(type:string,text:string,f:ExtractedFields){
 if(type==='Nómina'){set(f,'titular',looseValue(text,['TRABAJADOR(?:A)?','EMPLEADO(?:A)?','NOMBRE Y APELLIDOS','NOMBRE'],260));set(f,'empresa_pagador',looseValue(text,['EMPRESA','RAZ[ÓO]N SOCIAL','PAGADOR'],300));set(f,'neto',moneyNear(text,['L[IÍ]QUIDO A PERCIBIR','TOTAL L[IÍ]QUIDO','NETO']));set(f,'bruto',moneyNear(text,['TOTAL DEVENGADO','TOTAL DEVENGOS','BRUTO']));set(f,'base_cotizacion',moneyNear(text,['BASE DE COTIZACI[ÓO]N','BASE COTIZACI[ÓO]N','BASE CC']));set(f,'periodo',looseValue(text,['PER[IÍ]ODO','MES'],180));}
 if(type==='Préstamo / deuda'){set(f,'titular',looseValue(text,['TITULAR','CLIENTE'],260));set(f,'entidad',looseValue(text,['ENTIDAD','BANCO','ACREEDOR'],260));set(f,'cuota',moneyNear(text,['CUOTA','IMPORTE RECIBO','MENSUALIDAD']));set(f,'capital_pendiente',moneyNear(text,['CAPITAL PENDIENTE','SALDO PENDIENTE','PRINCIPAL PENDIENTE']));set(f,'tipo_interes',percentNear(text,['TIPO DE INTER[EÉ]S','TIN']));set(f,'vencimiento',dateNear(text,['VENCIMIENTO','FECHA FIN']));}
 if(type==='IRPF'){set(f,'titular',looseValue(text,['DECLARANTE','CONTRIBUYENTE','NOMBRE Y APELLIDOS'],260));set(f,'ejercicio',first(text,[/(?:EJERCICIO|PER[IÍ]ODO)\D{0,15}(20\d{2})/i]));set(f,'rendimientos_trabajo',moneyNear(text,['RENDIMIENTOS DEL TRABAJO','RENDIMIENTO NETO']));set(f,'base_imponible',moneyNear(text,['BASE IMPONIBLE']));set(f,'resultado_declaracion',moneyNear(text,['RESULTADO DE LA DECLARACI[ÓO]N','CUOTA DIFERENCIAL']));}
 if(type==='CIRBE'){set(f,'titular',looseValue(text,['TITULAR','PERSONA'],260));set(f,'riesgo_dispuesto',moneyNear(text,['RIESGO DISPUESTO','DISPUESTO TOTAL','RIESGO DIRECTO']));set(f,'riesgo_disponible',moneyNear(text,['RIESGO DISPONIBLE','L[IÍ]MITE DISPONIBLE']));}
 if(type==='Movimientos bancarios'){set(f,'titular',looseValue(text,['TITULAR','CLIENTE'],260));set(f,'iban',first(text,[/\b(ES\d{2}(?:\s?\d{4}){5})\b/i]));set(f,'entidad',looseValue(text,['ENTIDAD','BANCO'],220));set(f,'saldo',moneyNear(text,['SALDO FINAL','SALDO ACTUAL']));}
 if(type==='Nota simple'){set(f,'registro',looseValue(text,['REGISTRO DE LA PROPIEDAD','REGISTRO'],260));set(f,'numero_finca',looseValue(text,['N[ÚU]MERO DE FINCA','FINCA REGISTRAL','FINCA'],220));set(f,'cru',looseValue(text,['CRU','IDUFIR'],120));set(f,'titulares',looseValue(text,['TITULAR(?:ES)?','TITULARIDAD'],700));set(f,'referencia_catastral',first(text,[/(?:REFERENCIA CATASTRAL)\s*[:\-]?\s*([A-Z0-9]{14,20})/i]));set(f,'cargas',looseValue(text,['CARGAS','GRAV[ÁA]MENES'],1000));set(f,'fecha_expedicion',dateNear(text,['FECHA DE EXPEDICI[ÓO]N','FECHA']));}
 if(type==='Contrato / arras'){set(f,'comprador',looseValue(text,['PARTE COMPRADORA','COMPRADOR(?:A)?'],400));set(f,'vendedor',looseValue(text,['PARTE VENDEDORA','VENDEDOR(?:A)?'],400));set(f,'precio_compraventa',moneyNear(text,['PRECIO DE COMPRAVENTA','PRECIO']));set(f,'importe_arras',moneyNear(text,['IMPORTE DE ARRAS','ARRAS','SEÑAL']));set(f,'fecha_limite',dateNear(text,['FECHA L[IÍ]MITE','ANTES DEL','PLAZO']));set(f,'inmueble',looseValue(text,['INMUEBLE','VIVIENDA','DIRECCI[ÓO]N'],700));}
 if(type==='Tasación'){
  set(f,'tasadora',looseValue(text,['SOCIEDAD DE TASACI[ÓO]N','TASADORA','ENTIDAD TASADORA'],300));
  set(f,'tasador',looseValue(text,['TASADOR','T[ÉE]CNICO TASADOR','T[ÉE]CNICO'],260));
  set(f,'fecha_tasacion',dateNear(text,['FECHA DE TASACI[ÓO]N','FECHA DEL INFORME','FECHA']));
  set(f,'direccion',looseValue(text,['DIRECCI[ÓO]N DEL INMUEBLE','DIRECCI[ÓO]N','EMPLAZAMIENTO'],600));
  set(f,'referencia_catastral',looseValue(text,['REFERENCIA CATASTRAL'],120));
  const superficieUtil=numberNear(text,['SUPERFICIE [ÚU]TIL'],120);if(superficieUtil!==null)setExplicit(f,'superficie_util',superficieUtil);
  const superficieConstruida=numberNear(text,['SUPERFICIE CONSTRUIDA'],120);if(superficieConstruida!==null)setExplicit(f,'superficie_construida',superficieConstruida);
  set(f,'valor_tasacion',moneyNear(text,['VALOR DE TASACI[ÓO]N','VALOR TASACI[ÓO]N']));
  set(f,'valor_hipotecario',moneyNear(text,['VALOR HIPOTECARIO']));
  set(f,'finalidad',looseValue(text,['FINALIDAD DE LA TASACI[ÓO]N','FINALIDAD'],400));
  set(f,'condicionantes',looseValue(text,['CONDICIONANTES','CONDICIONES'],900));
  set(f,'observaciones',looseValue(text,['OBSERVACIONES DEL TASADOR','OBSERVACIONES'],900));
  set(f,'salvedades',looseValue(text,['SALVEDADES','ADVERTENCIAS'],900));
 }
 if(type==='Seguro bancario'){set(f,'aseguradora',looseValue(text,['ENTIDAD ASEGURADORA','ASEGURADORA','COMPAÑ[IÍ]A'],300));set(f,'tomador',looseValue(text,['TOMADOR'],300));set(f,'asegurado',looseValue(text,['ASEGURADO'],300));set(f,'prima',moneyNear(text,['PRIMA ANUAL','PRIMA MENSUAL','PRIMA']));set(f,'coberturas',looseValue(text,['COBERTURAS','GARANT[ÍI]AS'],1000));}
 if(type==='Documento notarial / registral'){set(f,'notario',looseValue(text,['NOTARIO(?:/A)?','ANTE M[IÍ]','NOTAR[IÍ]A'],300));set(f,'protocolo',looseValue(text,['N[ÚU]MERO DE PROTOCOLO','PROTOCOLO'],180));set(f,'fecha',dateNear(text,['FECHA DE OTORGAMIENTO','OTORGADA EL','FECHA']));set(f,'otorgantes',looseValue(text,['OTORGANTES','COMPARECIENTES'],1000));set(f,'inmueble',looseValue(text,['INMUEBLE','FINCA','VIVIENDA'],800));set(f,'precio',moneyNear(text,['PRECIO','VALOR DECLARADO','VALOR']));set(f,'cargas',looseValue(text,['CARGAS','GRAV[ÁA]MENES'],1000));}
}

export function extractDocumentData(rawText:string,confidence:number|null=null,declaredType=''):ExtractedDocument{
 const upper=rawText.toLocaleUpperCase('es');
 const highPriority=/FEIN|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA|OFERTA.*HIPOTEC|OFERTA VINCULANTE|CONDICIONES.*HIPOTEC|PROPUESTA.*FINANCIACI|P[ÓO]LIZA|PRIMA.*SEGURO|ASEGURAD[OA]|COBERTURAS/.test(upper);
 const normalized=highPriority?rawText.replace(/N[ÓO]MINA/gi,'VINCULACIÓN LABORAL'):rawText;
 let result=extractBase(normalized,confidence);
 const seed=declarationSeed(declaredType);
 if(seed&&['Documento','Documento personal'].includes(result.documentType)){result=extractBase(`${seed}\n${normalized}`,confidence);result.rawText=rawText;}
 if(result.documentType==='Vida laboral')enrichVidaLaboral(rawText,result.fields);
 else if(result.documentType==='Oferta bancaria'||result.documentType==='FEIN / FIAE')enrichFein(rawText,result.fields);
 else enrichOther(result.documentType,rawText,result.fields);
 return result;
}
