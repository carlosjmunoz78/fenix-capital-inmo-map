import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

const clean=(v:string,max=260)=>v.replace(/[ \t]+/g,' ').replace(/^[:–—\s]+/,'').trim().slice(0,max);
const lines=(text:string)=>text.replace(/\r/g,'\n').split(/\n+/).map(x=>clean(x,1200)).filter(Boolean);

function valueAfterExactLabel(text:string,labels:string[],max=260){
 const ls=lines(text);
 for(let i=0;i<ls.length;i++)for(const label of labels){
  const exact=new RegExp(`^(?:${label})\\s*[:\\-–—]?\\s*$`,'i');
  const inline=new RegExp(`^(?:${label})\\s*[:\\-–—]\\s*(.{1,${max}})$`,'i');
  const m=ls[i].match(inline);if(m?.[1])return clean(m[1],max);
  if(exact.test(ls[i])&&ls[i+1])return clean(ls[i+1],max);
 }
 return'';
}
function directLabeledLine(text:string,labels:string[],max=260){
 const ls=text.replace(/\r/g,'\n').split(/\n+/);
 for(const raw of ls)for(const label of labels){const m=raw.match(new RegExp(`^\\s*(?:${label})\\s*[:\\-–—]\\s*(.+?)\\s*$`,'i'));if(m?.[1])return clean(m[1],max);}
 return'';
}
function first(text:string,patterns:RegExp[],max=400){for(const pattern of patterns){const m=text.match(pattern);if(m?.[1])return clean(m[1],max);}return'';}
function safePerson(v:string){const s=clean(v,160);if(!s||s.length<5||s.length>140)return'';if(/r[eé]gimen|seguridad social|trabajadores|sistema|prestaci[oó]n|protecci[oó]n de datos|fecha de efecto|cuenta propia|aut[oó]nomos|cotizaci[oó]n|modelo\s+\d+|base\s+de\s+cotizaci[oó]n|empresa|pagador|iban/i.test(s))return'';const words=s.split(/\s+/);return words.length>=2&&words.length<=8?s:'';}
function safeCompany(v:string){const s=clean(v,220);if(!s||s.length<2)return'';if(/modelo\s+\d+|base\s+(?:de\s+)?cotizaci[oó]n|grupo\s+de\s+cotizaci[oó]n|periodo|devengos|deducciones|trabajador|empleado/i.test(s))return'';return s;}
function personAfterHonorific(text:string){const ls=lines(text);for(let i=0;i<ls.length;i++){if(/^(?:D\.?\s*\/?\s*D(?:ÑA|NA|ª)\.?|DON|DOÑA)\s*[:\-–—]?\s*$/i.test(ls[i])&&ls[i+1]){const p=safePerson(ls[i+1].replace(/\s*,.*$/,''));if(p)return p;}const m=ls[i].match(/^(?:D\.?\s*\/?\s*D(?:ÑA|NA|ª)\.?|DON|DOÑA)\s*[:\-–—]?\s+(.+)$/i);if(m?.[1]){const p=safePerson(m[1].replace(/\s*,.*$/,''));if(p)return p;}}return'';}

const MONTHS:Record<string,string>={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',setiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
function parseDate(raw:string){const m=raw.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\b/);if(m){const y=m[3].length===2?`20${m[3]}`:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}const w=raw.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${Object.keys(MONTHS).join('|')})\\s+de\\s+(20\\d{2})\\b`,'i'));return w?`${w[3]}-${MONTHS[w[2].toLowerCase()]}-${w[1].padStart(2,'0')}`:'';}
function strictDateRange(text:string){const labelled=valueAfterExactLabel(text,['PER[IÍ]ODO','PERIODO LIQUIDACI[ÓO]N','DESDE'],220);const source=labelled||text;const dates=[...source.matchAll(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g)].map(m=>parseDate(m[0])).filter(Boolean);const unique=[...new Set(dates)];return unique.length>=2?`${unique[0]} - ${unique[1]}`:'';}
function parseMoney(raw:string){const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i);if(!m)return null;const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function strictMoney(text:string,labels:string[]){const ls=lines(text);for(let i=0;i<ls.length;i++)for(const label of labels){const inline=new RegExp(`^(?:${label})\\s*[:\-–—]?\\s*(.+)$`,'i');const exact=new RegExp(`^(?:${label})\\s*[:\-–—]?\\s*$`,'i');const m=ls[i].match(inline);if(m?.[1]){const n=parseMoney(m[1]);if(n!==null)return n;}if(exact.test(ls[i])&&ls[i+1]&&!/^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ]{3,}:?$/i.test(ls[i+1])){const n=parseMoney(ls[i+1]);if(n!==null)return n;}}return null;}
function moneyOnLine(text:string,label:RegExp){for(const line of lines(text)){const m=line.match(label);if(!m)continue;const n=parseMoney(line.slice((m.index||0)+m[0].length));if(n!==null)return n;}return null;}
function moneyAfterLabelLine(text:string,label:RegExp){const ls=lines(text);for(let i=0;i<ls.length;i++){if(!label.test(ls[i]))continue;const tail=ls[i].replace(label,'');const decimals=[...tail.matchAll(/-?\d{1,3}(?:[.\s]\d{3})*,\d{1,2}|-?\d+,\d{1,2}/g)];if(decimals.length){const n=parseMoney(decimals[0][0]);if(n!==null)return n;}if(ls[i+1]){const next=parseMoney(ls[i+1]);if(next!==null)return next;}}return null;}
function relevantLines(text:string,rx:RegExp,limit=12){return lines(text).filter(x=>rx.test(x)).slice(0,limit).join(' | ');}
function maskedIban(text:string){const m=text.match(/\b(ES\d{2}(?:\s*\d{4}){5})\b/i);if(!m)return'';const raw=m[1].replace(/\s/g,'');return`ES** **** **** **** **** ${raw.slice(-4)}`;}
function sasPerceptorBlock(text:string){const m=text.match(/Nombre:\s*\n\s*NIF\/NIE:\s*\n\s*NAF:\s*\n\s*([^\n]+)\n\s*([0-9XYZ][0-9A-Z]{7,12})\s*\n\s*([0-9/]{8,20})/i);return m?{name:clean(m[1],180),nif:clean(m[2],40),naf:clean(m[3],40)}:null;}
function sasCompanyBlock(text:string){const m=text.match(/Centro n[oó]mina:\s*\n\s*CIF:\s*\n\s*Cod\.\s*Cta\.\s*Cotizaci[oó]n:\s*\n\s*([^\n]+)\n\s*([A-Z]\d{7,9}[A-Z0-9]?)\s*\n\s*([0-9/]{6,20})/i);return m?{center:clean(m[1],120),cif:clean(m[2],40),ccc:clean(m[3],40)}:null;}
function sasCategory(text:string){const ls=lines(text);const start=ls.findIndex(x=>/^Categor[ií]a\/puesto de desempe[ñn]o:\s*$/i.test(x));if(start<0)return'';for(let i=start+1;i<Math.min(ls.length,start+12);i++){const line=ls[i];if(/^\d{4,6}\s+-.*\([^)]{4,}\)/.test(line))return clean(line.replace(/\s+Grupo tarifa:.*$/i,''),320);}return'';}

function sanitizeVida(text:string,f:ExtractedFields){
 for(const k of ['titular','fecha_informe','situacion_actual','regimen','empresa_actual','fecha_alta_actual','antiguedad','total_dias','empresas_anteriores','periodos_trabajados','incidencias'])delete f[k];
 const titular=safePerson(directLabeledLine(text,['NOMBRE Y APELLIDOS','NOMBRE COMPLETO','TRABAJADOR(?:A)?','INTERESADO(?:A)?'],220)||valueAfterExactLabel(text,['NOMBRE Y APELLIDOS','NOMBRE COMPLETO','TRABAJADOR(?:A)?','INTERESADO(?:A)?'],220)||first(text,[/NOMBRE Y APELLIDOS\s+N[º°]?\s*SEGURIDAD SOCIAL[^\n]*\n\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ,.'-]{5,120}?)\s+\d{8,}/i,/(?:resulta que\s+D\/?D[ªA]?|resulta que\s+D\.\/Dª)\s*\n?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ,.'-]{5,120}?)\s*,\s*nacido/i],160)||personAfterHonorific(text));if(titular)f.titular=titular;
 const nss=first(text,[/(?:N[ÚU]MERO\s+(?:DE\s+)?LA?\s*SEGURIDAD\s+SOCIAL|N[º°]\s*SEGURIDAD\s+SOCIAL)\s*[:\-]?\s*([0-9][0-9\s\/-]{7,22})/i]);if(nss)f.nss=nss;
 const dni=first(text,[/(?:D\.N\.I\.|DNI|NIE)\s*[:\-]?\s*([0-9XYZ][0-9A-Z. -]{6,14})/i]);if(dni)f.dni_nie=dni;
 const reportDate=parseDate(first(text,[/al d[ií]a\s+([^,\n]{6,50})/i,/Fecha:\s*([^\n]{6,30})/i],80));if(reportDate)f.fecha_informe=reportDate;
 const current=text.match(/GENERAL\s+\d+\s+(SERVICIO ANDALUZ DE LA SALUD|SERVICIO ANDALUZ DE SALUD)\s+(\d{2}[.\/-]\d{2}[.\/-]\d{4})\s+\d{2}[.\/-]\d{2}[.\/-]\d{4}\s+---/i);if(current){f.situacion_actual='Alta';f.regimen='GENERAL';f.empresa_actual=clean(current[1],220);f.fecha_alta_actual=parseDate(current[2]);f.antiguedad=f.fecha_alta_actual;}
 const effective=first(text,[/total de d[ií]as efectivamente computables[\s\S]{0,180}?(\d{1,3}(?:\.\d{3})*)\s+d[ií]as/i]);const total=effective||first(text,[/ha figurado en situaci[oó]n de alta[\s\S]{0,180}?(\d{1,3}(?:\.\d{3})*)\s+d[ií]as/i]);if(total)f.total_dias=Number(total.replace(/\./g,''));
 const periods=relevantLines(text,/^(?:GENERAL|AUT[ÓO]NOMOS?|AGRARIO|MAR)\b.*\b\d{2}[.\/-]\d{2}[.\/-]\d{4}\b/i,20);if(periods)f.periodos_trabajados=periods;
 const companies=[...new Set(lines(text).filter(x=>/SERVICIO ANDALUZ|INSTITUT CATALA|ASISTENCIA LOS ANGELES|ATLAS SERVICIOS|RANDSTAD|TELEPIZZA|COMERCIAL PIEDRA|BAI PROMOCION/i.test(x)).map(x=>x.replace(/^.*?\b(?:\d{8,12}|-----------)\b\s*/,'').replace(/\s+\d{2}[.\/-].*$/,'').trim()).filter(Boolean))].slice(0,12);if(companies.length)f.empresas_anteriores=companies.join(' | ');
 const incidents=relevantLines(text,/pluriempleo|pluriactividad|solapamiento/i,4);if(incidents)f.incidencias=incidents;
}

function sanitizeNomina(text:string,f:ExtractedFields){
 for(const k of ['titular','trabajador','empresa','empresa_pagador','cif_empresa','periodo','mes','antiguedad','categoria_profesional','salario_base','complementos','pagas_extra','prorrata','bruto','total_devengado','base_cotizacion','irpf','deducciones','neto','liquido','embargos','anticipos'])delete f[k];
 const sasPerson=sasPerceptorBlock(text);
 const titular=safePerson(sasPerson?.name||directLabeledLine(text,['TRABAJADOR(?:A)?','EMPLEADO(?:A)?','NOMBRE Y APELLIDOS','NOMBRE'],260)||valueAfterExactLabel(text,['TRABAJADOR(?:A)?','EMPLEADO(?:A)?','NOMBRE Y APELLIDOS','NOMBRE'],260));if(titular){f.titular=titular;f.trabajador=titular;}
 const nif=sasPerson?.nif||directLabeledLine(text,['NIF\/NIE','NIF','NIE'],80)||valueAfterExactLabel(text,['NIF\/NIE','NIF','NIE'],80);if(nif)f.nif_nie=nif;
 const sasCompany=sasCompanyBlock(text);
 const cif=sasCompany?.cif||directLabeledLine(text,['CIF'],80)||valueAfterExactLabel(text,['CIF'],80);if(cif&&/^[A-Z]\d{7,9}[A-Z0-9]?$/i.test(cif)){f.cif=cif;f.cif_empresa=cif;}
 const explicitCompany=directLabeledLine(text,['RAZ[ÓO]N SOCIAL','EMPRESA','PAGADOR'],300)||valueAfterExactLabel(text,['RAZ[ÓO]N SOCIAL','EMPRESA','PAGADOR'],300);let empresa=safeCompany(explicitCompany);if(!empresa&&/Servicio Andaluz de Salud|Servicio Andaluz de la Salud|servicioandaluzdesalud/i.test(text))empresa='Servicio Andaluz de Salud';if(empresa){f.empresa=empresa;f.empresa_pagador=empresa;}
 const emission=valueAfterExactLabel(text,['FECHA EMISI[ÓO]N'],60);if(emission)f.mes=emission;
 const periodoRaw=valueAfterExactLabel(text,['PERIODO LIQUIDACI[ÓO]N'],120);const periodo=periodoRaw||strictDateRange(text);if(periodo)f.periodo=periodo;
 const category=sasCategory(text)||valueAfterExactLabel(text,['CATEGOR[IÍ]A\/PUESTO DE DESEMPE[ÑN]O','CATEGOR[IÍ]A','PUESTO'],320);if(category)f.categoria_profesional=category;
 const sueldo=moneyOnLine(text,/^(?:\d+\s+)?SUELDO\b/i)??strictMoney(text,['SALARIO BASE']);if(sueldo!==null)f.salario_base=sueldo;
 const bruto=strictMoney(text,['TOTAL DEVENGOS','TOTAL DEVENGADO']);if(bruto!==null){f.bruto=bruto;f.total_devengado=bruto;}
 const base=moneyOnLine(text,/^(?:\d+\s+)?CONTINGENCIAS COMUNES\b/i)??strictMoney(text,['BASE DE COTIZACI[ÓO]N']);if(base!==null)f.base_cotizacion=base;
 const neto=strictMoney(text,['L[IÍ]QUIDO A PERCIBIR','L[IÍ]QUIDO']);if(neto!==null){f.neto=neto;f.liquido=neto;}
 const irpfLine=lines(text).find(x=>/^(?:\d+\s+)?I\.R\.P\.F\./i.test(x));if(irpfLine){const nums=[...irpfLine.matchAll(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})/g)].map(x=>Number(x[0].replace(/\s/g,'').replace(/\./g,'').replace(',','.')));if(nums.length>=3){const pct=nums[nums.length-2],amount=nums[nums.length-1];f.irpf_porcentaje=pct;f.irpf_importe=amount;f.irpf=`${pct.toLocaleString('es-ES')} % · ${amount.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;}}
 const totalDiscount=strictMoney(text,['TOTAL DESCUENTOS']);if(totalDiscount!==null)f.deducciones=totalDiscount;
 const extras=relevantLines(text,/COMPLEMENTO|TRIENIOS|FACTOR\s+[A-Z]|CARRERA PROF/i,12);if(extras)f.complementos=extras;
 const prorrata=relevantLines(text,/PRORRATA|PAGA EXTRA/i,8);if(prorrata){f.pagas_extra=prorrata;f.prorrata=prorrata;}
 const emb=relevantLines(text,/EMBARGO/i,6);if(emb)f.embargos=emb;const ant=relevantLines(text,/ANTICIPO/i,6);if(ant)f.anticipos=ant;
}

function sanitizeIrpf(text:string,f:ExtractedFields){
 for(const k of ['titular','titulares','nif','ejercicio','modalidad','rendimientos_trabajo','rendimientos_actividad','rendimientos_capital','rendimientos_inmobiliarios','ganancias_perdidas','base_imponible','base_liquidable','resultado','resultado_declaracion','inmuebles','prestamos_hipotecas'])delete f[k];
 const titularRaw=directLabeledLine(text,['APELLIDOS Y NOMBRE','APELLIDOS Y NOMBRE \/ RAZ[ÓO]N SOCIAL'],220)||valueAfterExactLabel(text,['APELLIDOS Y NOMBRE','APELLIDOS Y NOMBRE \/ RAZ[ÓO]N SOCIAL'],220)||first(text,[/Apellidos y nombre(?:\s*\/\s*Raz[oó]n social)?\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ ,.'-]{5,120}?)(?:\s+\d{4}\b|\n|$)/i],180);const titular=safePerson(titularRaw.replace(/\s+\d{4}\s*$/,''));if(titular){f.titular=titular;f.titulares=titular;}
 const nif=first(text,[/\bNIF(?:\s+Presentador)?\s*[:\-]?\s*([0-9XYZ][0-9A-Z]{7,12})\b/i]);if(nif)f.nif=nif;
 const ejercicio=first(text,[/Ejercicio\s+(20\d{2})/i]);if(ejercicio)f.ejercicio=ejercicio;
 if(/Tributaci[oó]n individual/i.test(text))f.modalidad='Tributación individual';else if(/Tributaci[oó]n conjunta/i.test(text))f.modalidad='Tributación conjunta';
 const trabajo=moneyAfterLabelLine(text,/Total ingresos [íi]ntegros computables/i)??moneyAfterLabelLine(text,/Rendimiento neto reducido/i);if(trabajo!==null)f.rendimientos_trabajo=trabajo;
 const inmobiliario=moneyAfterLabelLine(text,/Suma de rendimientos netos reducidos del capital inmobiliario/i);if(inmobiliario!==null)f.rendimientos_inmobiliarios=inmobiliario;
 const base=moneyAfterLabelLine(text,/^Base imponible general\b/i);if(base!==null)f.base_imponible=base;
 const liquidable=moneyAfterLabelLine(text,/^Base liquidable general\b/i);if(liquidable!==null)f.base_liquidable=liquidable;
 const resultado=moneyAfterLabelLine(text,/^Resultado de la declaraci[oó]n\b/i)??moneyAfterLabelLine(text,/^Cuota diferencial\b/i);if(resultado!==null){f.resultado=resultado;f.resultado_declaracion=resultado;}
 const inmuebleParts=relevantLines(text,/Referencia catastral|Direcci[oó]n del inmueble|Porcentaje de propiedad|Arrendamiento/i,10);if(inmuebleParts)f.inmuebles=inmuebleParts;
 const gains=relevantLines(text,/Valor de transmisi[oó]n|Valor de adquisici[oó]n|Fecha de transmisi[oó]n|ganancias y p[eé]rdidas/i,8);if(gains)f.ganancias_perdidas=gains;
 const capital=relevantLines(text,/capital mobiliario|rendimientos del capital/i,6);if(capital)f.rendimientos_capital=capital;
 const activities=relevantLines(text,/actividades econ[oó]micas/i,6);if(activities)f.rendimientos_actividad=activities;
 const loans=relevantLines(text,/pr[eé]stamo|hipoteca/i,8);if(loans)f.prestamos_hipotecas=loans;
}

function sanitizeMovimientos(text:string,f:ExtractedFields){
 for(const k of ['titular','titulares','iban','periodo','nominas','ingresos_recurrentes','cuotas_prestamos','alquileres','pensiones','recibos','descubiertos','comisiones','transferencias'])delete f[k];
 const titularRaw=first(text,[/\bTitular(?:es)?\s*[:\-]?\s*(.+?)\s+IBAN\b/i],220);const titular=safePerson(titularRaw);if(titular){f.titular=titular;f.titulares=titular;}
 const iban=maskedIban(text);if(iban)f.iban=iban;
 const periodo=strictDateRange(text);if(periodo)f.periodo=periodo;
 const nominas=relevantLines(text,/\bN[ÓO]MINA\b/i,12);if(nominas)f.nominas=nominas;
 const transfers=relevantLines(text,/TRANSF\. A SU FAVOR|TRANSFERENCIA/i,12);if(transfers)f.transferencias=transfers;
 const income=relevantLines(text,/BIZUM RECIBIDO|TRANSF\. A SU FAVOR|\bN[ÓO]MINA\b/i,16);if(income)f.ingresos_recurrentes=income;
 const loans=relevantLines(text,/PR[ÉE]STAMO|FINANCIACION|CUOTA PREST/i,12);if(loans)f.cuotas_prestamos=loans;
 const rent=relevantLines(text,/ALQUILER|ARRENDAMIENTO/i,8);if(rent)f.alquileres=rent;
 const pension=relevantLines(text,/PENSI[ÓO]N/i,8);if(pension)f.pensiones=pension;
 const receipts=relevantLines(text,/ENDESA|MAPFRE|NETFLIX|WIFI|CUOTA/i,15);if(receipts)f.recibos=receipts;
 const fees=relevantLines(text,/COMISI[ÓO]N|COMISIONES/i,8);if(fees)f.comisiones=fees;
 const overdraft=relevantLines(text,/DESCUBIERTO|SALDO DEUDOR/i,8);if(overdraft)f.descubiertos=overdraft;
}

function looksLikeNomina(text:string){return /recibo\s+(?:individual\s+justificativo\s+del\s+pago\s+de\s+salarios|de\s+salarios)|justificante\s+de\s+n[oó]mina|n[oó]mina|l[ií]quido\s+a\s+percibir|total\s+devengado|devengos/i.test(text);}
function looksLikeVida(text:string){return /informe\s+de\s+vida\s+laboral|vida\s+laboral|n[uú]mero\s+(?:de\s+)?(?:la\s+)?seguridad\s+social/i.test(text);}

export function sanitizeCriticalDocumentFields(result:ExtractedDocument,rawText:string=result.rawText):ExtractedDocument{
 const fields:{[k:string]:string|number|boolean}={...result.fields};
 if(result.documentType==='Movimientos bancarios')sanitizeMovimientos(rawText,fields);
 else if(result.documentType==='IRPF')sanitizeIrpf(rawText,fields);
 else if(result.documentType==='Vida laboral')sanitizeVida(rawText,fields);
 else if(result.documentType==='Nómina')sanitizeNomina(rawText,fields);
 else if(looksLikeVida(rawText))sanitizeVida(rawText,fields);
 else if(looksLikeNomina(rawText))sanitizeNomina(rawText,fields);
 return{...result,fields};
}