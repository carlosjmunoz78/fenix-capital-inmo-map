import type {ExtractedFields} from './browserDocumentOcr';

function esNumber(raw:string){const n=Number(raw.replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:null;}
function dateEs(raw:string){const m=raw.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
function clean(raw:string,max=600){return raw.replace(/[ \t]+/g,' ').trim().slice(0,max);}

export function normalizePhysicalFein(rawText:string,input:ExtractedFields):ExtractedFields{
 const f:ExtractedFields={...input};
 if(!/\bFEIN\b|FICHA EUROPEA DE INFORMACI[ÓO]N NORMALIZADA/i.test(rawText))return f;
 const entity=rawText.match(/Identidad\s*\/\s*Nombre Comercial\s*:\s*([^\n]+)/i)?.[1];
 if(entity)f.entidad=clean(entity.replace(/\s*\(en adelante[\s\S]*$/i,''),260);
 const issue=rawText.match(/Fecha de emisi[oó]n\s*:\s*([^\n]+)/i)?.[1];
 const issueDate=issue?dateEs(issue):'';if(issueDate)f.fecha_emision=issueDate;
 const holderBlock=rawText.match(/El presente documento se extiende[\s\S]{0,120}?NIF\/NIE:\s*([\s\S]{1,900}?)\n\s*T\s*-\s*Titular/i)?.[1]||'';
 const holders=[...holderBlock.matchAll(/^\s*T\s+(.+?)\s+([0-9XYZ][0-9A-Z]{7,12})\s*$/gim)].map(m=>clean(`${m[1]} ${m[2]}`,220));
 if(holders.length)f.titulares=holders.join(' | ');
 const amount=rawText.match(/Importe y moneda del pr[eé]stamo por conceder\s*:\s*([\d.]+,\d{2})\s*euros/i)?.[1];const amountN=amount?esNumber(amount):null;if(amountN!==null)f.importe_prestamo=amountN;
 const duration=rawText.match(/duraci[oó]n del pr[eé]stamo es\s*(\d{1,4})\s*meses/i)?.[1];if(duration){f.plazo=`${duration} meses`;f.plazo_meses=Number(duration);}
 const regularPayments=rawText.match(/Periodicidad de reembolso en amortizaci[oó]n\s*:\s*Mensual[\s\S]{0,180}?N[uú]mero de pagos\s*:\s*(\d{1,4})/i)?.[1];if(regularPayments)f.numero_cuotas=Number(regularPayments);
 const tin=rawText.match(/A tipo fijo del\s*(\d{1,3}(?:[.,]\d{1,4})?)\s*%\s*nominal anual/i)?.[1];const tinN=tin?esNumber(tin):null;if(tinN!==null)f.tin=tinN;
 const tae=rawText.match(/TAE aplicable a su pr[eé]stamo es\s*(\d{1,3}(?:[.,]\d{1,4})?)\s*%/i)?.[1];const taeN=tae?esNumber(tae):null;if(taeN!==null)f.tae=taeN;
 const payment=rawText.match(/Importe cuota\s*:\s*([\d.]+,\d{2})\s*euros/i)?.[1];const paymentN=payment?esNumber(payment):null;if(paymentN!==null)f.cuota=paymentN;
 const ltv=rawText.match(/Un\s*(\d{1,3}(?:[.,]\d{1,4})?)\s*%\s*sobre el valor de inmueble seg[uú]n tasaci[oó]n/i)?.[1];const ltvN=ltv?esNumber(ltv):null;if(ltvN!==null)f.porcentaje_financiacion=ltvN;
 return f;
}
