import type {ExtractedDocument,ExtractedFields} from './browserDocumentOcr';

function cleanName(raw:string){
 const value=raw.replace(/\s+/g,' ').replace(/^[:\-–—\s]+|[:\-–—\s]+$/g,'').trim();
 if(value.length<5||value.length>140)return'';
 if(/SEGURIDAD SOCIAL|R[ÉE]GIMEN|TRABAJADORES|INFORME|TESORER[IÍ]A|SECRETAR[IÍ]A|CON\s+N[ÚU]MERO/i.test(value))return'';
 const words=value.split(/\s+/).filter(Boolean);
 return words.length>=2&&words.length<=8?value:'';
}

function beforeNumberAnchor(raw:string){
 return raw.split(/\bCON\s+N[ÚU]MERO\b/i)[0].replace(/^[:\-–—\s]+/,'').trim();
}

function holderNearExplicitNameLabel(text:string){
 const lines=text.replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const label=/\b(?:NOMBRE\s+Y\s+APELLIDOS|NOMBRE\s+COMPLETO)\b/i;
 for(let i=0;i<lines.length;i++){
  const match=label.exec(lines[i]);
  if(!match)continue;
  const inline=cleanName(beforeNumberAnchor(lines[i].slice((match.index??0)+match[0].length)));
  if(inline)return inline;
  if(lines[i+1]){
   const next=cleanName(beforeNumberAnchor(lines[i+1]));
   if(next)return next;
  }
 }
 return'';
}

function holderFromExplicitPhrase(text:string){
 const byLabel=holderNearExplicitNameLabel(text);
 if(byLabel)return byLabel;
 const patterns=[
  /(?:D\.?\s*\/?\s*D(?:ÑA|NA|ª)\.?|DON|DOÑA)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ'\-]*(?:\s+[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ'\-]*){1,7})\s+(?=CON\s+(?:N[ÚU]MERO|N[º°.]|NSS|NAF)|N[ÚU]MERO\s+(?:DE\s+)?SEGURIDAD)/i,
  /(?:A\s+NOMBRE\s+DE|NOMBRE\s+Y\s+APELLIDOS)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ'\-]*(?:\s+[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ'\-]*){1,7})(?=\s+(?:CON\s+N[ÚU]MERO|NSS|NAF|N[ÚU]MERO\s+(?:DE\s+)?SEGURIDAD|DNI|NIF|$))/i,
 ];
 for(const pattern of patterns){const match=text.match(pattern);if(match?.[1]){const name=cleanName(match[1]);if(name)return name;}}
 return'';
}

export function normalizePrivatePhysicalVidaLaboral(result:ExtractedDocument,rawText:string,declaredType=''):ExtractedDocument{
 const isVida=result.documentType==='Vida laboral'||/VIDA\s+LABORAL/i.test(declaredType)||/INFORME(?:\s+DE)?\s+VIDA\s+LABORAL/i.test(rawText);
 if(!isVida)return result;
 const fields:ExtractedFields={...result.fields};
 if(!String(fields.titular||'').trim()){
  const titular=holderFromExplicitPhrase(rawText);
  if(titular)fields.titular=titular;
 }
 return{...result,documentType:'Vida laboral',fields};
}
