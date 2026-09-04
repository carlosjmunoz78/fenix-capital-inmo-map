import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

const clean=(v:string,max=1600)=>v.replace(/[ \t]+/g,' ').replace(/^[:\-–—\s]+/,'').trim().slice(0,max);
const ls=(text:string)=>text.replace(/\r/g,'\n').split(/\n+/).map(x=>clean(x,1800)).filter(Boolean);
function set(f:ExtractedFields,k:string,v:unknown){if(v!==undefined&&v!==null&&String(v).trim()!=='')f[k]=v as string|number|boolean;}
function section(text:string,start:RegExp,stops:RegExp[],max=1800){const lines=ls(text);const i=lines.findIndex(x=>start.test(x));if(i<0)return'';const out:string[]=[];const hit=lines[i].match(start);const tail=hit?clean(lines[i].slice((hit.index||0)+hit[0].length),600):'';if(tail)out.push(tail);for(let j=i+1;j<lines.length;j++){if(stops.some(s=>s.test(lines[j])))break;out.push(lines[j]);if(out.join(' | ').length>=max)break;}return clean(out.join(' | '),max);}
function inlineOrNext(text:string,label:RegExp,max=500){const lines=ls(text);for(let i=0;i<lines.length;i++){const m=lines[i].match(label);if(!m)continue;const tail=clean(lines[i].slice((m.index||0)+m[0].length),max);if(tail)return tail;if(lines[i+1])return clean(lines[i+1],max);}return'';}
function parseMoney(raw:string){const all=[...raw.matchAll(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[.,]\d{2})/g)];if(!all.length)return null;const token=all[all.length-1][0];const n=Number(token.replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function moneyNear(text:string,labels:RegExp[],lookAhead=4){const lines=ls(text);for(let i=0;i<lines.length;i++)for(const label of labels){if(!label.test(lines[i]))continue;for(let j=i;j<Math.min(lines.length,i+lookAhead+1);j++){const n=parseMoney(lines[j]);if(n!==null)return n;}}return null;}
function knownEntity(text:string){const lines=ls(text).slice(0,120);const rx=/\b(BBVA|BANCO BILBAO VIZCAYA ARGENTARIA|CAIXABANK|BANCO SANTANDER|SANTANDER|BANCO SABADELL|SABADELL|UNICAJA(?: BANCO)?|ABANCA|BANKINTER|CAJAMAR|CAJA RURAL(?: DE [A-ZÁÉÍÓÚÜÑ .'-]{3,80})?|ING(?: BANK)?|OPENBANK|CETELEM|COFIDIS|WIZINK|YOUNITED(?: CREDIT)?|CARREFOUR(?: FINANZAS)?|PEPPER|ONEY|SANTANDER CONSUMER|CAIXABANK PAYMENTS|BBVA CONSUMER)\b/i;for(const line of lines){const m=line.match(rx);if(m?.[1])return clean(m[1],120);}return'';}

function normalizeNota(text:string,f:ExtractedFields){
 const registro=(ls(text).find(x=>/REGISTRO DE LA PROPIEDAD/i.test(x))||'').replace(/^.*?(REGISTRO DE LA PROPIEDAD)/i,'$1');set(f,'registro',registro);
 const finca=inlineOrNext(text,/\bFINCA(?:\s+REGISTRAL)?(?:\s+N[ÚU]MERO|\s+N[º°.]?)?\s*[:\-–—]?/i,120);if(finca)set(f,'numero_finca',finca.match(/[A-Z0-9][A-Z0-9./-]{0,40}/i)?.[0]||finca);
 const cru=(text.match(/\b(?:CRU|IDUFIR)\s*[:\-–—]?\s*([0-9A-Z -]{8,40})/i)||[])[1];if(cru)set(f,'cru',clean(cru,60));
 const ref=(text.match(/\b(?:REFERENCIA\s+CATASTRAL|REF\.?\s+CATASTRAL)\s*[:\-–—]?\s*([0-9A-Z]{14,22})/i)||[])[1]||(text.match(/\b\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2}\b/i)||[])[0];if(ref)set(f,'referencia_catastral',ref);
 let desc=section(text,/\b(?:DESCRIPCI[ÓO]N(?:\s+DE\s+LA\s+FINCA)?|DATOS\s+DE\s+LA\s+FINCA|DESCRIPCI[ÓO]N\s+FINCA)\b\s*[:\-–—]?/i,[/\bTITULAR(?:IDAD|IDADES|ES)?\b/i,/\bCARGAS\b/i,/\bASIENTOS\b/i],2400);
 if(!desc){const lines=ls(text);const i=lines.findIndex(x=>/\b(?:URBANA|R[ÚU]STICA)\b.*(?:VIVIENDA|CASA|FINCA|PARCELA|LOCAL|GARAJE)/i.test(x));if(i>=0)desc=clean(lines.slice(i,Math.min(lines.length,i+8)).join(' | '),2400);}
 if(desc)set(f,'descripcion_finca',desc);
 const titulares=section(text,/\bTITULAR(?:IDAD|IDADES|ES)?\b\s*[:\-–—]?/i,[/\bCARGAS\b/i,/\bASIENTOS\b/i,/\bLIMITACIONES\b/i],1800);if(titulares)set(f,'titulares',titulares);
 const cargas=section(text,/\bCARGAS(?:\s+DE\s+LA\s+FINCA)?\b\s*[:\-–—]?/i,[/\bASIENTOS\b/i,/\bINFORMACI[ÓO]N\b/i,/\bDOCUMENTOS\b/i,/^FECHA\b/i],2400);if(cargas){set(f,'cargas',cargas);if(/HIPOTECA/i.test(cargas))set(f,'hipotecas',cargas.match(/[^|]*HIPOTECA[^|]*/i)?.[0]||'Hipoteca consta en cargas');if(/EMBARGO/i.test(cargas))set(f,'embargos',cargas.match(/[^|]*EMBARGO[^|]*/i)?.[0]||'Embargo consta en cargas');}
 const surface=(text.match(/\bSUPERFICIE(?:\s+CONSTRUIDA|\s+ÚTIL|\s+TOTAL)?\s*[:\-–—]?\s*([^\n]{1,100})/i)||[])[1];if(surface)set(f,'superficie',clean(surface,120));
}

function normalizeDebt(text:string,f:ExtractedFields){
 const entity=inlineOrNext(text,/\b(?:ENTIDAD(?:\s+ACREEDORA)?|ACREEDOR|BANCO|PRESTAMISTA|FINANCIERA)\s*[:\-–—]?/i,180)||knownEntity(text);if(entity){set(f,'entidad',entity);set(f,'acreedor',entity);}
 const balance=moneyNear(text,[/CAPITAL\s+PENDIENTE/i,/SALDO\s+PENDIENTE/i,/PRINCIPAL\s+PENDIENTE/i,/DEUDA\s+PENDIENTE/i,/CAPITAL\s+VIVO/i,/SALDO\s+DEUDOR/i,/SALDO\s+ACTUAL/i,/CAPITAL\s+(?:A\s+FECHA|PENDIENTE\s+DE\s+AMORTIZAR)/i,/IMPORTE\s+(?:ADEUDADO|PENDIENTE)/i,/DEUDA\s+VIVA/i],5);if(balance!==null){set(f,'capital_pendiente',balance);set(f,'saldo_pendiente',balance);}
 const cuota=moneyNear(text,[/\bCUOTA(?:\s+MENSUAL)?\b/i,/IMPORTE\s+(?:DEL\s+)?RECIBO/i,/MENSUALIDAD/i,/PR[ÓO]XIMA\s+CUOTA/i],4);if(cuota!==null)set(f,'cuota',cuota);
 const tin=(text.match(/\b(?:TIN|TIPO DE INTER[EÉ]S NOMINAL)\b[^%\n]{0,80}(\d{1,2}(?:[.,]\d{1,4})?)\s*%/i)||[])[1];if(tin)set(f,'tin',Number(tin.replace(',','.')));
 const periodicidad=inlineOrNext(text,/\bPERIODICIDAD\s*[:\-–—]?/i,80);if(periodicidad)set(f,'periodicidad',periodicidad);
 const venc=inlineOrNext(text,/\b(?:VENCIMIENTO|FECHA\s+FIN|FECHA\s+DE\s+VENCIMIENTO)\s*[:\-–—]?/i,100);if(venc)set(f,'vencimiento',venc);
 const titular=inlineOrNext(text,/\b(?:TITULAR|CLIENTE|PRESTATARIO)\s*[:\-–—]?/i,220);if(titular)set(f,'titular',titular);
}

export function normalizePrivatePhysicalCritical(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const fields={...result.fields};const upper=rawText.toLocaleUpperCase('es');
 const note=/NOTA SIMPLE|REGISTRO DE LA PROPIEDAD/.test(upper)&&/FINCA|TITULAR/.test(upper);
 const debt=/CAPITAL\s+PENDIENTE|SALDO\s+PENDIENTE|DEUDA\s+PENDIENTE|CAPITAL\s+VIVO|SALDO\s+DEUDOR|RECIBO[^\n]{0,80}PR[ÉE]STAMO|CERTIFICADO[^\n]{0,80}DEUDA/.test(upper)||/pr[eé]stamo|deuda/i.test(declaredType);
 if(note){normalizeNota(rawText,fields);return{...result,documentType:'Nota simple',fields};}
 if(debt){normalizeDebt(rawText,fields);return{...result,documentType:'Préstamo / deuda',fields};}
 return{...result,fields};
}
