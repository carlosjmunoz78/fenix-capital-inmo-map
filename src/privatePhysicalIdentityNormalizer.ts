import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

function identityNumber(text:string){
 const upper=text.toLocaleUpperCase('es');
 const exact=(upper.match(/\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/)||[])[0];
 if(exact)return exact;
 const dni=upper.match(/\b(\d(?:[\s.\-]?\d){7})[\s.\-]*([A-Z])\b/);
 if(dni)return`${dni[1].replace(/\D/g,'')}${dni[2]}`;
 const nie=upper.match(/\b([XYZ])[\s.\-]*(\d(?:[\s.\-]?\d){6})[\s.\-]*([A-Z])\b/);
 if(nie)return`${nie[1]}${nie[2].replace(/\D/g,'')}${nie[3]}`;
 return'';
}

function cleanPersonPart(value:string){
 return value.replace(/[<>]+/g,' ').replace(/[^A-ZÁÉÍÓÚÜÑ' -]/gi,' ').replace(/\s+/g,' ').trim();
}

function nextLineValue(text:string,label:RegExp){
 const lines=text.replace(/\r/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const inline=lines[i].match(new RegExp(`^(?:${label.source})\\s*[:\\-]?\\s+(.+)$`,label.flags));
  if(inline?.[1]){const v=cleanPersonPart(inline[1]);if(v.length>=2)return v;}
  if(new RegExp(`^(?:${label.source})\\s*[:\\-]?\\s*$`,label.flags).test(lines[i])&&lines[i+1]){
   const v=cleanPersonPart(lines[i+1]);if(v.length>=2)return v;
  }
 }
 return'';
}

function mrzName(text:string){
 const upper=text.toLocaleUpperCase('es');
 for(const raw of upper.split(/\n+/)){
  const line=raw.replace(/\s+/g,'').trim();
  const m=line.match(/([A-ZÁÉÍÓÚÜÑ]{2,}(?:<[A-ZÁÉÍÓÚÜÑ]{2,})*)<<([A-ZÁÉÍÓÚÜÑ]{2,}(?:<[A-ZÁÉÍÓÚÜÑ]{2,})*)/);
  if(!m)continue;
  const surnames=cleanPersonPart(m[1]);
  const names=cleanPersonPart(m[2]);
  if(surnames.length>=2&&names.length>=2)return`${names} ${surnames}`;
 }
 return'';
}

function identityName(text:string){
 const names=nextLineValue(text,/NOMBRE(?:S)?|NAME|GIVEN NAMES/i);
 const surnames=nextLineValue(text,/APELLIDOS?|SURNAME(?:S)?/i);
 if(names&&surnames)return`${names} ${surnames}`;
 return mrzName(text);
}

export function normalizePrivatePhysicalIdentity(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const identity=/DNI|NIE|IDENTIDAD|IDENTITY/i.test(declaredType)||result.documentType==='DNI/NIE';
 if(!identity)return result;
 const fields:ExtractedFields={...result.fields};
 if(!String(fields.documento_identidad||fields.dni_nie||fields.numero_documento||'').trim()){
  const number=identityNumber(rawText);
  if(number)fields.documento_identidad=number;
 }
 if(!String(fields.nombre_completo||fields.titular||fields.nombre||'').trim()){
  const name=identityName(rawText);
  if(name)fields.nombre_completo=name;
 }
 return{...result,fields};
}
