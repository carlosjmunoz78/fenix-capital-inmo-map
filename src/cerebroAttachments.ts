export type CerebroAttachmentKind='text'|'docx'|'xlsx'|'pdf';
export type CerebroAttachment={
 id:string;
 name:string;
 mime:string;
 size:number;
 kind:CerebroAttachmentKind;
 sha256:string;
 text:string;
 truncated:boolean;
};

export const ATTACHMENT_LIMITS=Object.freeze({
 maxFiles:5,
 maxFileBytes:5*1024*1024,
 maxTotalBytes:12*1024*1024,
 maxCharsPerFile:2800,
 maxTotalContextChars:8200,
 maxGatewayChars:11500
});

const TEXT_EXTENSIONS=new Set(['txt','md','csv','json','xml','html','htm','log','yaml','yml','sql','ts','tsx','js','jsx','mjs','cjs','css','scss','py','sh','ps1','ini','env','toml']);
const MIME_TEXT_PREFIXES=['text/'];

function extension(name:string){const p=String(name||'').toLowerCase().split('.');return p.length>1?p.pop()||'':'';}
export function detectAttachmentKind(name:string,mime=''):CerebroAttachmentKind|null{
 const ext=extension(name);const m=String(mime||'').toLowerCase();
 if(TEXT_EXTENSIONS.has(ext)||MIME_TEXT_PREFIXES.some(prefix=>m.startsWith(prefix))||['application/json','application/xml','application/javascript'].includes(m))return'text';
 if(ext==='docx'||m==='application/vnd.openxmlformats-officedocument.wordprocessingml.document')return'docx';
 if(ext==='xlsx'||m==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')return'xlsx';
 if(ext==='pdf'||m==='application/pdf')return'pdf';
 return null;
}

export function sanitizeAttachmentText(value:string,maxChars=ATTACHMENT_LIMITS.maxCharsPerFile){
 const clean=String(value||'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').replace(/[\t ]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
 return{ text:clean.slice(0,maxChars),truncated:clean.length>maxChars };
}

function xmlText(xml:string){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.querySelector('parsererror'))throw new Error('XML_NO_VALIDO');
 return doc;
}
function decodeEntities(value:string){
 const area=document.createElement('textarea');area.innerHTML=value;return area.value;
}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256(buffer:ArrayBuffer){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)));}

async function inflateRaw(bytes:Uint8Array){
 if(typeof DecompressionStream==='undefined')throw new Error('DESCOMPRESION_NO_DISPONIBLE');
 const copy=Uint8Array.from(bytes).buffer;
 const stream=new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}

type ZipEntry={name:string;compression:number;compressedSize:number;localOffset:number};
function readZipEntries(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);const view=new DataView(buffer);let eocd=-1;
 for(let i=Math.max(0,bytes.length-65557);i<=bytes.length-22;i++){if(view.getUint32(i,true)===0x06054b50)eocd=i;}
 if(eocd<0)throw new Error('ZIP_EOCD_NO_ENCONTRADO');
 const total=view.getUint16(eocd+10,true);const centralOffset=view.getUint32(eocd+16,true);let p=centralOffset;const decoder=new TextDecoder();const entries:ZipEntry[]=[];
 for(let n=0;n<total;n++){
  if(p+46>bytes.length||view.getUint32(p,true)!==0x02014b50)throw new Error('ZIP_CENTRAL_NO_VALIDO');
  const compression=view.getUint16(p+10,true);const compressedSize=view.getUint32(p+20,true);const nameLen=view.getUint16(p+28,true);const extraLen=view.getUint16(p+30,true);const commentLen=view.getUint16(p+32,true);const localOffset=view.getUint32(p+42,true);
  const name=decoder.decode(bytes.slice(p+46,p+46+nameLen));entries.push({name,compression,compressedSize,localOffset});p+=46+nameLen+extraLen+commentLen;
 }
 return{bytes,view,entries};
}
async function readZipEntry(zip:ReturnType<typeof readZipEntries>,entry:ZipEntry){
 const {bytes,view}=zip;const p=entry.localOffset;if(p+30>bytes.length||view.getUint32(p,true)!==0x04034b50)throw new Error('ZIP_LOCAL_NO_VALIDO');
 const nameLen=view.getUint16(p+26,true);const extraLen=view.getUint16(p+28,true);const start=p+30+nameLen+extraLen;const compressed=bytes.slice(start,start+entry.compressedSize);
 if(entry.compression===0)return compressed;if(entry.compression===8)return inflateRaw(compressed);throw new Error('ZIP_COMPRESION_NO_SOPORTADA');
}
async function zipText(buffer:ArrayBuffer,name:string){const zip=readZipEntries(buffer);const entry=zip.entries.find(e=>e.name===name);if(!entry)throw new Error(`ZIP_ENTRADA_FALTANTE:${name}`);return new TextDecoder('utf-8').decode(await readZipEntry(zip,entry));}

async function extractDocx(buffer:ArrayBuffer){
 const xml=await zipText(buffer,'word/document.xml');const doc=xmlText(xml);const blocks:Array<string>=[];
 for(const paragraph of Array.from(doc.getElementsByTagNameNS('*','p'))){const parts:Array<string>=[];for(const node of Array.from(paragraph.getElementsByTagNameNS('*','t')))parts.push(node.textContent||'');const line=parts.join('').trim();if(line)blocks.push(line);}
 if(!blocks.length)throw new Error('DOCX_SIN_TEXTO');return blocks.join('\n');
}
async function extractXlsx(buffer:ArrayBuffer){
 const zip=readZipEntries(buffer);let shared:Array<string>=[];const sharedEntry=zip.entries.find(e=>e.name==='xl/sharedStrings.xml');
 if(sharedEntry){const doc=xmlText(new TextDecoder().decode(await readZipEntry(zip,sharedEntry)));shared=Array.from(doc.getElementsByTagNameNS('*','si')).map(si=>Array.from(si.getElementsByTagNameNS('*','t')).map(t=>t.textContent||'').join(''));}
 const sheets=zip.entries.filter(e=>/^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));const out:Array<string>=[];
 for(let si=0;si<sheets.length;si++){
  const doc=xmlText(new TextDecoder().decode(await readZipEntry(zip,sheets[si])));out.push(`[Hoja ${si+1}]`);
  for(const row of Array.from(doc.getElementsByTagNameNS('*','row'))){const cells:Array<string>=[];for(const c of Array.from(row.getElementsByTagNameNS('*','c'))){const type=c.getAttribute('t')||'';let value='';if(type==='inlineStr'){value=Array.from(c.getElementsByTagNameNS('*','t')).map(t=>t.textContent||'').join('');}else{const raw=c.getElementsByTagNameNS('*','v')[0]?.textContent||'';value=type==='s'?shared[Number(raw)]??raw:raw;}cells.push(value);}if(cells.some(Boolean))out.push(cells.join('\t'));}
 }
 if(out.length<=sheets.length)throw new Error('XLSX_SIN_DATOS');return out.join('\n');
}
function decodePdfLiteral(raw:string){
 let out='';for(let i=0;i<raw.length;i++){const ch=raw[i];if(ch!=='\\'){out+=ch;continue}const n=raw[++i]||'';const map:Record<string,string>={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','(':'(',')':')','\\':'\\'};if(map[n]!==undefined){out+=map[n];continue}if(/[0-7]/.test(n)){let oct=n;for(let j=0;j<2&&/[0-7]/.test(raw[i+1]||'');j++)oct+=raw[++i];out+=String.fromCharCode(parseInt(oct,8));continue}if(n==='\n')continue;out+=n;}return out;
}
function pdfOperatorsToText(content:string){
 const pieces:Array<string>=[];const literal=/\(((?:\\.|[^\\()])*)\)\s*Tj\b/g;let m:RegExpExecArray|null;while((m=literal.exec(content)))pieces.push(decodePdfLiteral(m[1]));
 const arrays=/\[((?:.|\n|\r)*?)\]\s*TJ\b/g;while((m=arrays.exec(content))){const inner=m[1];const vals:Array<string>=[];const strings=/\(((?:\\.|[^\\()])*)\)/g;let s:RegExpExecArray|null;while((s=strings.exec(inner)))vals.push(decodePdfLiteral(s[1]));if(vals.length)pieces.push(vals.join(''));}
 const hex=/<([0-9A-Fa-f]{4,})>\s*Tj\b/g;while((m=hex.exec(content))){const bytes=m[1].match(/../g)?.map(x=>parseInt(x,16))||[];const text=new TextDecoder('utf-8',{fatal:false}).decode(new Uint8Array(bytes)).replace(/\u0000/g,'');if(text.trim())pieces.push(text);}
 return decodeEntities(pieces.join('\n')).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,' ');
}
async function extractPdf(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);const latin=new TextDecoder('latin1').decode(bytes);const chunks:Array<string>=[pdfOperatorsToText(latin)];const stream=/stream\r?\n/g;let m:RegExpExecArray|null;
 while((m=stream.exec(latin))){const end=latin.indexOf('endstream',m.index+m[0].length);if(end<0)break;const start=m.index+m[0].length;const header=latin.slice(Math.max(0,m.index-700),m.index);if(!/\/FlateDecode\b/.test(header)){stream.lastIndex=end+9;continue}try{const raw=bytes.slice(start,end-(latin[end-1]==='\r'?1:0));const inflated=await inflateRaw(raw);chunks.push(pdfOperatorsToText(new TextDecoder('latin1').decode(inflated)));}catch{/* other PDF filters or unsupported stream */}stream.lastIndex=end+9;
 }
 const text=chunks.join('\n').replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();if(text.replace(/\s/g,'').length<12)throw new Error('PDF_SIN_TEXTO_EXTRAIBLE_O_REQUIERE_OCR');return text;
}

export async function extractCerebroAttachment(file:File):Promise<CerebroAttachment>{
 if(file.size<=0)throw new Error('ARCHIVO_VACIO');if(file.size>ATTACHMENT_LIMITS.maxFileBytes)throw new Error('ARCHIVO_SUPERA_5MB');const kind=detectAttachmentKind(file.name,file.type);if(!kind){if(file.type.startsWith('image/'))throw new Error('IMAGEN_REQUIERE_OCR');throw new Error('TIPO_DE_ARCHIVO_NO_SOPORTADO');}
 const buffer=await file.arrayBuffer();let raw='';if(kind==='text')raw=new TextDecoder('utf-8',{fatal:false}).decode(buffer);else if(kind==='docx')raw=await extractDocx(buffer);else if(kind==='xlsx')raw=await extractXlsx(buffer);else raw=await extractPdf(buffer);
 const safe=sanitizeAttachmentText(raw);if(!safe.text)throw new Error('ARCHIVO_SIN_CONTENIDO_EXTRAIBLE');return{id:crypto.randomUUID(),name:file.name,mime:file.type||'application/octet-stream',size:file.size,kind,sha256:await sha256(buffer),text:safe.text,truncated:safe.truncated};
}

export function composeCerebroMessage(prompt:string,attachments:CerebroAttachment[]){
 const cleanPrompt=String(prompt||'').trim();if(!cleanPrompt&&!attachments.length)return'';let remaining=ATTACHMENT_LIMITS.maxTotalContextChars;const sections:Array<string>=[];
 for(const a of attachments.slice(0,ATTACHMENT_LIMITS.maxFiles)){if(remaining<=0)break;const text=a.text.slice(0,remaining);remaining-=text.length;sections.push(`--- ARCHIVO: ${a.name} | tipo=${a.kind} | bytes=${a.size} | sha256=${a.sha256.slice(0,16)}${a.truncated||text.length<a.text.length?' | TRUNCADO':''} ---\n${text}\n--- FIN ARCHIVO ---`);}
 const intro=cleanPrompt||'Analiza los archivos adjuntos y responde con los hallazgos relevantes.';const combined=sections.length?`${intro}\n\nCONTEXTO DE ARCHIVOS ADJUNTOS (extraído localmente; no persistir como binario):\n${sections.join('\n\n')}`:intro;
 return combined.slice(0,ATTACHMENT_LIMITS.maxGatewayChars);
}
