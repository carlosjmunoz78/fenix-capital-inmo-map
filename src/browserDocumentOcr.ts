export type ExtractedDocument={
  documentType:'DNI/NIE'|'Documento personal'|'Documento';
  rawText:string;
  confidence:number|null;
  fields:{nombre?:string;apellidos?:string;documento_identidad?:string;fecha_nacimiento?:string};
  summary:string;
};

declare global{interface Window{Tesseract?:any;pdfjsLib?:any}}

const TESSERACT_SCRIPT='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
const PDF_SCRIPT='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDF_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

function loadScript(id:string,src:string){
  return new Promise<void>((resolve,reject)=>{
    if(document.getElementById(id)){resolve();return;}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.crossOrigin='anonymous';
    s.onload=()=>resolve();s.onerror=()=>reject(new Error(`No se pudo cargar ${id}`));document.head.appendChild(s);
  });
}
async function ensureTesseract(){if(!window.Tesseract)await loadScript('fenix-tesseract-runtime',TESSERACT_SCRIPT);if(!window.Tesseract)throw new Error('OCR no disponible');return window.Tesseract;}
async function ensurePdf(){if(!window.pdfjsLib)await loadScript('fenix-pdfjs-runtime',PDF_SCRIPT);if(!window.pdfjsLib)throw new Error('Lector PDF no disponible');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDF_WORKER;return window.pdfjsLib;}
async function recognize(source:Blob|HTMLCanvasElement){const T=await ensureTesseract();const r=await T.recognize(source,'spa');return{text:String(r?.data?.text||''),confidence:Number.isFinite(Number(r?.data?.confidence))?Number(r.data.confidence):null};}

export async function ocrFile(file:File,onProgress?:(text:string)=>void):Promise<{text:string;confidence:number|null}>{
  const mime=(file.type||'').toLowerCase();
  if(mime==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
    onProgress?.('Abriendo PDF…');const pdfjs=await ensurePdf();const data=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data}).promise;
    const pages=Math.min(Number(pdf.numPages||0),6);let full='';const scores:number[]=[];
    for(let i=1;i<=pages;i++){
      onProgress?.(`Leyendo página ${i} de ${pages}…`);const page=await pdf.getPage(i);const viewport=page.getViewport({scale:1.8});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la página');await page.render({canvasContext:ctx,viewport}).promise;
      const r=await recognize(canvas);full+=`${r.text}\n`;if(r.confidence!==null)scores.push(r.confidence);
    }
    return{text:full.trim(),confidence:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null};
  }
  if(mime.startsWith('image/')||/\.(png|jpe?g|webp)$/i.test(file.name)){onProgress?.('Leyendo imagen…');return recognize(file);}
  throw new Error('Para lectura inteligente usa una foto JPG/PNG/WEBP o un PDF.');
}

const LABEL_NOISE=/^(apellidos?|surname|nombre|name|sexo|sex|nacionalidad|nationality|nacimiento|date of birth|validez|valid|documento|document|dni|nie|id|firma|signature|españa|espana|reino de españa|reino de espana)$/i;
function cleanup(v:string){return v.replace(/[|]/g,'I').replace(/\s+/g,' ').replace(/^[^A-ZÁÉÍÓÚÜÑ0-9]+|[^A-ZÁÉÍÓÚÜÑ0-9'-]+$/gi,'').trim();}
function personCase(v:string){return cleanup(v).toLocaleLowerCase('es').replace(/(^|[\s'-])([a-záéíóúüñ])/g,(_,a,b)=>a+b.toLocaleUpperCase('es'));}
function linesOf(raw:string){return raw.split(/\r?\n/).map(cleanup).filter(Boolean);}
function valueNear(lines:string[],labels:RegExp[]){
  for(let i=0;i<lines.length;i++)for(const label of labels){
    if(!label.test(lines[i]))continue;
    const inline=cleanup(lines[i].replace(label,''));if(inline.length>=2&&!LABEL_NOISE.test(inline))return inline;
    for(let j=i+1;j<Math.min(lines.length,i+4);j++){const c=cleanup(lines[j]);if(c.length>=2&&!LABEL_NOISE.test(c)&&!/^(ESP|IDESP|ESPANA|ESPAÑA)$/i.test(c))return c;}
  }
  return'';
}
function isoDate(v:string){const m=v.match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/);if(!m)return'';return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}

export function extractDocumentData(rawText:string,confidence:number|null=null):ExtractedDocument{
  const normalized=rawText.normalize('NFKC').replace(/\u00a0/g,' ');const upper=normalized.toLocaleUpperCase('es');const lines=linesOf(normalized);
  const id=(upper.match(/\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/)||[])[0]||'';
  let apellidos=valueNear(lines,[/^(?:APELLIDOS?|SURNAME)\s*[:/-]?\s*/i]);
  let nombre=valueNear(lines,[/^(?:NOMBRE|NAME)\s*[:/-]?\s*/i]);
  const birthLabel=valueNear(lines,[/^(?:NACIMIENTO|FECHA DE NACIMIENTO|DATE OF BIRTH)\s*[:/-]?\s*/i]);
  let fecha=isoDate(birthLabel);
  if(!fecha){const around=normalized.match(/(?:NACIMIENTO|DATE OF BIRTH)[^\d]{0,30}(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i);fecha=around?isoDate(around[1]):'';}
  apellidos=apellidos?personCase(apellidos):'';nombre=nombre?personCase(nombre):'';
  const dniLike=Boolean(id)||/DOCUMENTO NACIONAL DE IDENTIDAD|DNI|NIE|IDENTITY CARD/i.test(normalized);
  const fields:ExtractedDocument['fields']={};if(nombre)fields.nombre=nombre;if(apellidos)fields.apellidos=apellidos;if(id)fields.documento_identidad=id;if(fecha)fields.fecha_nacimiento=fecha;
  const parts=[nombre||apellidos?[nombre,apellidos].filter(Boolean).join(' '):'',id?`documento ${id}`:'',fecha?`nacimiento ${fecha}`:''].filter(Boolean);
  const documentType=dniLike?'DNI/NIE':(nombre||apellidos||fecha?'Documento personal':'Documento');
  const summary=parts.length?`${documentType}: ${parts.join(' · ')}.`:`${documentType}: se ha leído el archivo, pero no hay datos personales suficientemente claros para autorrellenar.`;
  return{documentType,rawText:normalized.trim(),confidence,fields,summary};
}
