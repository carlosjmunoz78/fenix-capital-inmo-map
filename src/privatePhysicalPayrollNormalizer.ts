import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

function parseMoney(raw:string){
 const m=raw.match(/(?:€|EUR)?\s*(-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|-?\d+(?:[.,]\d{2}))\s*(?:€|EUR)?/i);
 if(!m)return null;
 const n=Number(m[1].replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
 return Number.isFinite(n)?n:null;
}

function grossFromExplicitTotal(text:string){
 const lines=text.replace(/\r/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const label=/TOTAL\s+DEVENGAD[OA]S?|TOTAL\s+DEVENGOS|\bBRUTO\b/i;
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

export function normalizePrivatePhysicalPayroll(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const payroll=/N[ÓO]MINA|RECIBO DE SALARIOS/i.test(declaredType)||result.documentType==='Nómina';
 if(!payroll)return result;
 const fields:ExtractedFields={...result.fields};
 if(fields.bruto===undefined||fields.bruto===null||fields.bruto===''){
  const gross=grossFromExplicitTotal(rawText);
  if(gross!==null)fields.bruto=gross;
 }
 return{...result,fields};
}
