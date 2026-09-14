import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

function parseMoney(raw:string){
 const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|-?\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)?/i);
 if(!m)return null;
 const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
 return Number.isFinite(n)?n:null;
}

function moneyFromExplicitLabel(text:string,label:RegExp){
 const lines=text.replace(/\r/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const m=label.exec(lines[i]);
  if(!m)continue;
  const same=parseMoney(lines[i].slice((m.index??0)+m[0].length));
  if(same!==null)return same;
  for(let j=i+1;j<=Math.min(i+2,lines.length-1);j++){
   const next=parseMoney(lines[j]);
   if(next!==null)return next;
  }
 }
 return null;
}
function explicitPays(text:string){
 const m=text.match(/\b(12|13|14|15|16)\s+pagas?\b/i);
 return m?Number(m[1]):null;
}
function annualMoney(text:string){
 return moneyFromExplicitLabel(text,/SALARIO\s+(?:BRUTO\s+)?ANUAL|RETRIBUCI[ÓO]N\s+(?:BRUTA\s+)?ANUAL|REMUNERACI[ÓO]N\s+(?:BRUTA\s+)?ANUAL/i);
}

export function normalizePrivatePhysicalPayroll(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const payroll=/N[ÓO]MINA|RECIBO DE SALARIOS/i.test(declaredType)||result.documentType==='Nómina';
 const contract=/CONTRATO.*TRABAJO|CONTRATO LABORAL/i.test(declaredType)||result.documentType==='Contrato de trabajo';
 if(!payroll&&!contract)return result;
 const fields:ExtractedFields={...result.fields};
 if(payroll&& (fields.bruto===undefined||fields.bruto===null||fields.bruto==='')){
  const gross=moneyFromExplicitLabel(rawText,/TOTAL[\s:·._\-–—]*DEVENGAD[OA]S?|TOTAL[\s:·._\-–—]*DEVENGOS|\bBRUTO\b/i);
  if(gross!==null)fields.bruto=gross;
 }
 if(payroll&& (fields.neto===undefined||fields.neto===null||fields.neto==='')){
  const net=moneyFromExplicitLabel(rawText,/L[IÍ]QUIDO[\s:·._\-–—]*A[\s:·._\-–—]*PERCIBIR|TOTAL[\s:·._\-–—]*L[IÍ]QUIDO|\bL[IÍ]QUIDO\b|\bNETO\b/i);
  if(net!==null)fields.neto=net;
 }
 const pays=explicitPays(rawText);
 if(pays!==null&&fields.numero_pagas===undefined)fields.numero_pagas=pays;
 const prorated=/PAGAS?\s+EXTRA(?:ORDINARIAS?)?\s+PRORRATEAD|PRORRATA\s+DE\s+PAGAS?\s+EXTRA|PAGA(?:S)?\s+EXTRA(?:S)?\s+INCLUIDAS?\s+EN\s+(?:LA\s+)?N[ÓO]MINA/i.test(rawText);
 const notProrated=/PAGAS?\s+EXTRA(?:ORDINARIAS?)?\s+NO\s+PRORRATEAD|PAGAS?\s+EXTRA(?:S)?\s+SEPARADAS?|14\s+PAGAS?/i.test(rawText);
 if(prorated)fields.pagas_extra_prorrateadas=true;
 else if(notProrated)fields.pagas_extra_prorrateadas=false;
 const annual=annualMoney(rawText);
 if(annual!==null&&fields.salario_bruto_anual===undefined)fields.salario_bruto_anual=annual;
 const n=typeof fields.numero_pagas==='number'?fields.numero_pagas:null;
 if(n&&n>=12&&n<=16){
  if(typeof fields.neto==='number'&&fields.neto_anual_calculado===undefined)fields.neto_anual_calculado=Math.round(fields.neto*n*100)/100;
  if(typeof fields.bruto==='number'&&fields.bruto_anual_calculado===undefined)fields.bruto_anual_calculado=Math.round(fields.bruto*n*100)/100;
 }
 return{...result,fields};
}
