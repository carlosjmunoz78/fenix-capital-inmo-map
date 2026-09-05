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

function normalizedLines(text:string){return text.replace(/\r/g,'\n').split(/\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);}
function dateMatches(raw:string){return raw.match(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g)||[];}

function datedWorkRows(text:string){
 const lines=normalizedLines(text);
 const found:string[]=[];
 const add=(value:string)=>{const clean=value.replace(/\s+/g,' ').trim();if(clean&&!found.includes(clean))found.push(clean);};
 for(let i=0;i<lines.length;i++){
  if(/FECHA\s+DE\s+(?:ALTA|BAJA|EFECTO)/i.test(lines[i])&&dateMatches(lines[i]).length===0)continue;
  if(dateMatches(lines[i]).length>=2){add(lines[i]);continue;}
  // OCR de tablas de Vida Laboral suele partir una misma fila en 2-3 líneas.
  // Solo reconstruimos ventanas que contienen al menos dos fechas explícitas;
  // no inferimos fechas ni empleadores ausentes.
  for(let width=2;width<=3&&i+width<=lines.length;width++){
   const joined=lines.slice(i,i+width).join(' ');
   if(dateMatches(joined).length>=2){add(joined);break;}
  }
 }
 return found.slice(0,12);
}

function regimeFromExplicitEvidence(text:string,rows:string[]){
 const direct=text.match(/R[ÉE]GIMEN\s+(GENERAL|ESPECIAL\s+DE\s+TRABAJADORES\s+AUT[ÓO]NOMOS|AUT[ÓO]NOMOS?|AGRARIO|DEL?\s+MAR|EMPLEADOS?\s+DE\s+HOGAR)\b/i);
 if(direct?.[1])return direct[1].replace(/\s+/g,' ').trim();
 const window=(text.match(/R[ÉE]GIMEN[\s\S]{0,600}/i)||[])[0]||'';
 const named=window.match(/\b(GENERAL|AUT[ÓO]NOMOS?|RETA|AGRARIO|MAR|EMPLEADOS?\s+DE\s+HOGAR)\b/i);
 if(named?.[1])return named[1].replace(/\s+/g,' ').trim();
 const codes:string[]=[];
 for(const row of rows){
  const prefix=row.split(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/)[0]||'';
  const match=prefix.match(/(?:^|\s)(\d{3,4})(?=\s|$)/);
  if(match?.[1]&&!codes.includes(match[1]))codes.push(match[1]);
 }
 return codes.slice(0,4).join(', ');
}

function totalDaysFromExplicitEvidence(text:string){
 const number='(\\d{1,3}(?:[.\\s]\\d{3})+|\\d{1,6})';
 const patterns=[
  new RegExp(`(?:TOTAL(?:\\s+DE)?\\s+D[IÍ]AS|D[IÍ]AS\\s+(?:EN\\s+)?ALTA|D[IÍ]AS\\s+COTIZADOS?|D[IÍ]AS\\s+EFECTIVAMENTE\\s+COTIZADOS?)[^0-9]{0,120}${number}`,'i'),
  new RegExp(`(?:HA\\s+ESTADO\\s+DE\\s+ALTA|FIGURA\\s+EN\\s+SITUACI[ÓO]N\\s+DE\\s+ALTA)[^0-9]{0,140}${number}\\s+D[IÍ]AS`,'i'),
  new RegExp(`(?:ACREDITA|TOTALIZA|COMPUTA|RESULTAN?)[^0-9]{0,120}${number}\\s+D[IÍ]AS`,'i'),
  new RegExp(`TOTAL[^0-9]{0,80}${number}\\s+D[IÍ]AS`,'i'),
 ];
 for(const pattern of patterns){const match=text.match(pattern);if(match?.[1]){const n=Number(match[1].replace(/[.\s]/g,''));if(Number.isInteger(n)&&n>0&&n<100000)return n;}}
 return null;
}

function currentEmployerFromTable(rows:string[]){
 // No intentamos adivinar una empresa: solo devolvemos una fila de trayectoria
 // si contiene texto y fecha(s). La proyección visible mantiene la evidencia tal cual.
 for(const row of rows){
  const withoutDates=row.replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g,' ').replace(/\s+/g,' ').trim();
  if(/[A-ZÁÉÍÓÚÜÑ]{3,}/i.test(withoutDates)&&withoutDates.length>=5)return row.slice(0,500);
 }
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
 const rows=datedWorkRows(rawText);
 if(!String(fields.periodos_trabajados||'').trim()&&rows.length){fields.periodos_trabajados=rows.join(' | ').slice(0,1800);}
 if(!String(fields.regimen||'').trim()){
  const regimen=regimeFromExplicitEvidence(rawText,rows);
  if(regimen)fields.regimen=regimen;
 }
 if(fields.total_dias===undefined||fields.total_dias===null||fields.total_dias===''){
  const totalDays=totalDaysFromExplicitEvidence(rawText);
  if(totalDays!==null)fields.total_dias=totalDays;
 }
 if(!String(fields.empresa_actual||fields.empresa||'').trim()&&rows.length){
  const employerEvidence=currentEmployerFromTable(rows);
  if(employerEvidence)fields.empresa_actual=employerEvidence;
 }
 return{...result,documentType:'Vida laboral',fields};
}
