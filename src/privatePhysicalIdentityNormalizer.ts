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

export function normalizePrivatePhysicalIdentity(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const identity=/DNI|NIE|IDENTIDAD|IDENTITY/i.test(declaredType)||result.documentType==='DNI/NIE';
 if(!identity)return result;
 const fields:ExtractedFields={...result.fields};
 if(!String(fields.documento_identidad||fields.dni_nie||fields.numero_documento||'').trim()){
  const number=identityNumber(rawText);
  if(number)fields.documento_identidad=number;
 }
 return{...result,fields};
}
