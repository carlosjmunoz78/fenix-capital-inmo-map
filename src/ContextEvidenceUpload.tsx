import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileAudio,FileUp,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';
import legacyMap from '../data/legacy-expediente-destination-map.json';

const BUCKET=IS_PRODUCTION?'fenix-prod-documents':'fenix-preprod-documents-test';
const FUNCTION=IS_PRODUCTION?'fenix-evidence-api':'fenix-evidence-universal-test';
const PROD_SUPPORTED_ORIGINS=new Set(['expediente','contacto','firma']);
const PROD_ALLOWED_MIME=new Set([
 'application/pdf','image/png','image/jpeg','image/webp','text/plain','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const PROD_ACCEPT='.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx';
const PROD_MAX_MB=50,PROD_ANALYSIS_MAX_MB=20,PROD_CONCURRENCY=3;
const AUDIO_EXTENSIONS=['.mp3','.m4a','.wav','.webm','.ogg','.oga','.opus','.aac','.flac'];
const MIME_BY_EXT:Record<string,string>={
 '.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml',
 '.txt':'text/plain','.csv':'text/csv','.json':'application/json','.xml':'application/xml','.zip':'application/zip','.doc':'application/msword',
 '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 '.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 '.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.webm':'audio/webm','.ogg':'audio/ogg','.oga':'audio/ogg','.opus':'audio/opus','.aac':'audio/aac','.flac':'audio/flac'
};

type OriginCtx={type:string;code:string;label:string;staging:boolean};
type Prepare={ok?:boolean;upload_id?:string;storage_path?:string;token?:string;max_bytes?:number;error?:string;status?:number};
type Complete={ok?:boolean;reused?:boolean;document_page_id?:string;error?:string;status?:number};
type Queue={originType:string;label:string;files:File[]};
type LegacyMapEntry={dedupe_key?:string;destination_page_id?:string};
type Person={id:string;nombre?:string;apellidos?:string;comprador?:string;rol_operacion?:string};
type DocRule={type:string;family:string;re:RegExp;personRequired:boolean};
type RoutedFile={file:File;type:string;family:string;person:string;contactCode:string};
type FileResult={file:string;ok:boolean;reused?:boolean;error?:string;type?:string;person?:string};

const DOC_RULES:DocRule[]=[
 {type:'Vida laboral',family:'work_history',re:/\b(vida\s*laboral|informe\s*vida)\b/i,personRequired:true},
 {type:'Movimientos bancarios',family:'bank_statement',re:/\b(movimientos?|extractos?|cuenta\s*bancaria|banco\s*mov)\b/i,personRequired:true},
 {type:'Certificado bancario',family:'bank_certificate',re:/\b(certificado\s*bancario|titularidad\s*bancaria|certificado\s*cuenta)\b/i,personRequired:true},
 {type:'Nómina',family:'payroll',re:/\b(n[oó]minas?|nominas?|recibo\s*salario)\b/i,personRequired:true},
 {type:'Contrato laboral',family:'employment_contract',re:/\b(contrato\s*(laboral|trabajo)|contrato\s*indefinido|contrato\s*temporal)\b/i,personRequired:true},
 {type:'DNI/NIE',family:'identity',re:/\b(dni|nie|pasaporte|identidad)\b/i,personRequired:true},
 {type:'IRPF',family:'tax_return',re:/\b(irpf|renta|modelo\s*100|declaraci[oó]n\s*renta)\b/i,personRequired:true},
 {type:'Certificado retenciones',family:'withholding_certificate',re:/\b(retenciones?|certificado\s*retenciones?)\b/i,personRequired:true},
 {type:'CIRBE',family:'loan_debt',re:/\b(cirbe|pr[eé]stamos?|deudas?)\b/i,personRequired:true},
 {type:'Autónomos',family:'self_employed_tax',re:/\b(aut[oó]nomo|modelo\s*130|modelo\s*131|modelo\s*303|modelo\s*390)\b/i,personRequired:true},
 {type:'Certificado Hacienda/SS',family:'tax_ss_certificate',re:/\b(hacienda|seguridad\s*social|corriente\s*de\s*pago|certificado\s*ss)\b/i,personRequired:true},
 {type:'Sentencia divorcio',family:'divorce_judgment',re:/\b(divorcio|sentencia|convenio\s*regulador)\b/i,personRequired:true},
 {type:'Contrato alquiler',family:'rental_contract',re:/\b(alquiler|arrendamiento)\b/i,personRequired:true},
 {type:'Nota simple',family:'land_registry',re:/\b(nota\s*simple|registro\s*propiedad)\b/i,personRequired:false},
 {type:'Arras',family:'sale_contract',re:/\b(arras|compraventa|contrato\s*reserva)\b/i,personRequired:false},
 {type:'Catastro',family:'cadastre',re:/\b(catastro|catastral)\b/i,personRequired:false},
 {type:'Tasación',family:'appraisal',re:/\b(tasaci[oó]n|tasacion|valoraci[oó]n)\b/i,personRequired:false}
];

function norm(v:string){return v.replaceAll('-','').trim().toLowerCase();}
function words(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9ñ]+/g,' ').trim();}
function resolveCanonicalExpedienteCode(value:string){
 const entries=((legacyMap as {expedientes?:LegacyMapEntry[]}).expedientes??[]),wanted=norm(value);
 const hit=entries.find(entry=>{const dedupe=String(entry.dedupe_key??''),legacySuffix=dedupe.replace(/^exp-legado-/i,'');return norm(String(entry.destination_page_id??''))===wanted||norm(dedupe)===wanted||norm(legacySuffix)===wanted;});
 return String(hit?.dedupe_key||value);
}
function routeContext(pathname:string):OriginCtx|null{
 const path=pathname.replace(/\/+$/,'')||'/';
 const defs=[
  {base:'/herencias',newPaths:['/herencias/nuevo'],type:'herencia',label:'esta herencia'},
  {base:'/obras-nuevas',newPaths:['/obras-nuevas/nuevo'],type:'obra_nueva',label:'esta obra nueva'},
  {base:'/expedientes',newPaths:['/expedientes/nuevo'],type:'expediente',label:'este expediente'},
  {base:'/contactos',newPaths:['/contactos/nuevo'],type:'contacto',label:'este contacto'},
  {base:'/notarias',newPaths:['/notarias/nueva','/notarias/nuevo'],type:'notaria',label:'esta notaría'},
  {base:'/registros-propiedad',newPaths:['/registros-propiedad/nuevo','/registros-propiedad/nueva'],type:'registro',label:'este registro de la propiedad'},
  {base:'/firmas',newPaths:['/firmas/nuevo','/firmas/nueva'],type:'firma',label:'esta firma'}
 ];
 for(const def of defs){
  if(def.newPaths.includes(path))return{type:def.type,code:'',label:def.label,staging:true};
  if(path.startsWith(`${def.base}/`)){const rawId=decodeURIComponent(path.slice(def.base.length+1)),id=def.type==='expediente'?resolveCanonicalExpedienteCode(rawId):rawId;if(id&&!['nuevo','nueva'].includes(id))return{type:def.type,code:id,label:def.label,staging:false};}
 }
 if(path==='/documentacion')return{type:'documentacion_general',code:'general',label:'Documentación',staging:false};
 if(path==='/firmas')return{type:'firmas_general',code:'general',label:'Firmas',staging:false};
 return null;
}
function isAudio(file:File){const mime=(file.type||'').toLowerCase();if(mime.startsWith('audio/'))return true;const name=file.name.toLowerCase();return AUDIO_EXTENSIONS.some(ext=>name.endsWith(ext));}
function mimeOf(file:File){const direct=(file.type||'').trim().toLowerCase(),lower=file.name.toLowerCase();if(lower.endsWith('.pdf'))return'application/pdf';if(direct&&direct!=='application/octet-stream')return direct;for(const[ext,mime]of Object.entries(MIME_BY_EXT))if(lower.endsWith(ext))return mime;return direct||'application/octet-stream';}
function fileRule(name:string){const n=words(name);return DOC_RULES.find(rule=>rule.re.test(n))??null;}
function personAliases(p:Person){const full=words(`${p.nombre??''} ${p.apellidos??''}`),display=words(p.comprador??''),first=words(p.nombre??'').split(' ')[0]??'';return [...new Set([full,display,first].filter(x=>x.length>=2))].sort((a,b)=>b.length-a.length);}
function personForFile(name:string,people:Person[]){const n=` ${words(name)} `;const matches=people.filter(p=>personAliases(p).some(alias=>n.includes(` ${alias} `)));return matches.length===1?matches[0]:null;}

async function authHeaders(){const{data:{session}}=await supabase.auth.getSession();return session?.access_token?{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'}:null;}
async function evidenceFetch<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{const headers=await authHeaders();if(!headers)return{status:401,data:null};let response:Response;try{response=await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}${path}`,{...init,headers});}catch{return{status:0,data:null};}let data:T|null=null;try{data=await response.json()}catch{}return{status:response.status,data};}
async function expedientePeople(expedienteCode:string):Promise<Person[]>{const headers=await authHeaders();if(!headers)return[];try{const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-expediente-people?expediente=${encodeURIComponent(expedienteCode)}`,{headers});const b=await r.json().catch(()=>null);return r.ok&&Array.isArray(b?.items)?b.items:[];}catch{return[];}}
async function reread(uploadId:string,route:RoutedFile,documentPageId?:string){const headers=await authHeaders();if(!headers)return{ok:false,error:'session_expired'};for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(`${SUPABASE_URL}/functions/v1/fenix-document-reread`,{method:'POST',headers,body:JSON.stringify({upload_id:uploadId,document_page_id:documentPageId||null,document_family:route.family,declared_document_type:route.type,declared_person:route.person,declared_contact_code:route.contactCode||null})});const b=await r.json().catch(()=>null);if(r.ok&&b?.ok===true)return{ok:true};if(r.status<500&&r.status!==429)return{ok:false,error:String(b?.error||`reread_${r.status}`)};}catch{}if(attempt<2)await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));}return{ok:false,error:'reread_retry_exhausted'};}

export default function ContextEvidenceUpload(){
 const location=useLocation(),navigate=useNavigate();
 const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
 const explicit=useMemo<OriginCtx|null>(()=>{const comprador=params.get('comprador')||'',expediente=params.get('expediente')||'';if(comprador)return{type:'comprador',code:comprador,label:'esta persona y su expediente',staging:false};if(expediente)return{type:'expediente',code:resolveCanonicalExpedienteCode(expediente),label:'este expediente',staging:false};return null;},[params]);
 const rawContext=explicit??routeContext(location.pathname),context=IS_PRODUCTION&&rawContext&&!PROD_SUPPORTED_ORIGINS.has(rawContext.type)?null:rawContext;
 const legacyOpen=location.pathname==='/documentacion'&&params.get('upload')==='1'&&Boolean(explicit)&&Boolean(context);
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[queue,setQueue]=useState<Queue|null>(null),[inlineHost,setInlineHost]=useState<HTMLElement|null>(null),[selectedFiles,setSelectedFiles]=useState<File[]>([]);
 const autoUploading=useRef(false);

 useEffect(()=>{if(legacyOpen)setOpen(true)},[legacyOpen]);
 useEffect(()=>{if(!context){setInlineHost(null);return;}const host=document.createElement('div');host.className='context-evidence-inline-host';const place=()=>{const content=document.querySelector<HTMLElement>('.ops-content,.dir-content,.detail-exp-content');if(!content)return;const kpis=content.querySelector<HTMLElement>(':scope > .tas-kpis, :scope > .firmas-kpis, :scope > .fin-kpis, :scope > .vis-kpis, :scope > .inmo-kpis, :scope > [class$="-kpis"]'),hero=content.querySelector<HTMLElement>(':scope > [class*="-ana-hero"], :scope > .vis-ana, :scope > .ops-ana-card, :scope > .dir-priority-copy'),anchor=kpis??hero;if(anchor){if(anchor.nextElementSibling!==host)content.insertBefore(host,anchor.nextElementSibling)}else if(host.parentElement!==content)content.insertBefore(host,content.firstChild);if(content.closest('.firmas-root')){host.style.gridColumn='1';host.style.gridRow='4'}else{host.style.gridColumn='';host.style.gridRow=''}for(const duplicate of document.querySelectorAll<HTMLElement>('.firma-upload-inline,.doc-upload-inline'))duplicate.style.setProperty('display','none','important');};place();setInlineHost(host);const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();host.remove();setInlineHost(null)};},[location.pathname,Boolean(context)]);
 useEffect(()=>{if(!queue||!context||context.staging||!context.code||queue.originType!==context.type||busy||autoUploading.current)return;autoUploading.current=true;const files=queue.files;setQueue(null);setOpen(true);setMsg(`Procesando ${files.length} archivo${files.length===1?'':'s'}…`);void uploadFiles(files,context).finally(()=>{autoUploading.current=false});},[location.pathname,context?.type,context?.code,context?.staging,queue,busy]);
 if(!context)return null;
 const activeContext:OriginCtx=context;

 async function routesFor(files:File[],target:OriginCtx){
  if(!IS_PRODUCTION||target.type!=='expediente')return files.map(file=>({file,type:'Otro',family:'other',person:'Expediente',contactCode:''}));
  const people=await expedientePeople(target.code);if(!people.length)throw new Error('Añade primero las personas del expediente y su rol antes de subir el paquete documental.');
  return files.map(file=>{const rule=fileRule(file.name);if(!rule)throw new Error(`No reconozco el tipo por el nombre de archivo: ${file.name}. Renómbralo indicando DNI, nómina, vida laboral, movimientos, IRPF, CIRBE, arras, nota simple, catastro o tasación.`);const person=rule.personRequired?personForFile(file.name,people):null;if(rule.personRequired&&!person)throw new Error(`No puedo asignar ${file.name} a una única persona. Incluye en el nombre del archivo el nombre de la persona tal como aparece en Intervinientes.`);return{file,type:rule.type,family:rule.family,person:person?.comprador||[person?.nombre,person?.apellidos].filter(Boolean).join(' ')||'Expediente',contactCode:person?.id||''};});
 }

 async function processOne(route:RoutedFile,target:OriginCtx):Promise<FileResult>{
  const file=route.file,mime=mimeOf(file),audio=isAudio(file);if(IS_PRODUCTION&&(audio||!PROD_ALLOWED_MIME.has(mime)))return{file:file.name,ok:false,error:'Formato no admitido'};
  const prepared=await evidenceFetch<Prepare>('/prepare',{method:'POST',body:JSON.stringify({origin_type:target.type,origin_code:target.code,evidence_kind:audio?'audio_conversacion':'documento',filename:file.name,mime_type:mime})});
  if(prepared.status!==200||!prepared.data?.upload_id||!prepared.data.storage_path||!prepared.data.token)return{file:file.name,ok:false,error:prepared.status===401?'Sesión caducada':prepared.status===403?'Sin permiso':prepared.status===404?'Expediente no localizado':'No se pudo preparar la subida'};
  if(prepared.data.max_bytes&&file.size>prepared.data.max_bytes)return{file:file.name,ok:false,error:`Supera ${PROD_MAX_MB} MB`};
  const uploaded=await supabase.storage.from(BUCKET).uploadToSignedUrl(prepared.data.storage_path,prepared.data.token,file,{contentType:mime});if(uploaded.error)return{file:file.name,ok:false,error:'No se pudo transferir el archivo'};
  const done=await evidenceFetch<Complete>('/complete',{method:'POST',body:JSON.stringify({upload_id:prepared.data.upload_id,title:file.name,tipo:route.type})});if(done.status!==200||!done.data?.ok)return{file:file.name,ok:false,error:'Subido, pero no vinculado'};
  if(file.size>PROD_ANALYSIS_MAX_MB*1024*1024)return{file:file.name,ok:false,error:`Subido correctamente, pero el análisis automático admite hasta ${PROD_ANALYSIS_MAX_MB} MB`};
  const ai=await reread(prepared.data.upload_id,route,done.data.document_page_id);if(!ai.ok)return{file:file.name,ok:false,error:`Subido; lectura pendiente (${ai.error})`,type:route.type,person:route.person};
  const result={file:file.name,ok:true,reused:Boolean(done.data.reused),type:route.type,person:route.person};
  window.dispatchEvent(new CustomEvent('fenix:document-processed',{detail:{originType:target.type,originCode:target.code,...result}}));
  return result;
 }

 async function uploadFiles(files:File[],target:OriginCtx){
  if(!target.code)return false;setBusy(true);setSelectedFiles(files);setMsg(`Preparando ${files.length} documento${files.length===1?'':'s'} para clasificar, subir y leer automáticamente…`);
  let routes:RoutedFile[];try{routes=await routesFor(files,target);}catch(error){setBusy(false);setMsg(error instanceof Error?error.message:'No se pudo clasificar el lote.');return false;}
  const results:FileResult[]=new Array(routes.length);let next=0,completed=0;
  const worker=async()=>{while(true){const i=next++;if(i>=routes.length)return;results[i]=await processOne(routes[i],target);completed++;const ok=results.filter(Boolean).filter(x=>x.ok).length;setMsg(`Procesados ${completed}/${routes.length} · ${ok} correctos · ${completed-ok} pendientes/error`);}};
  await Promise.all(Array.from({length:Math.min(PROD_CONCURRENCY,routes.length)},()=>worker()));setBusy(false);setSelectedFiles([]);
  const okCount=results.filter(x=>x?.ok).length,failed=results.filter(x=>x&&!x.ok);if(failed.length){setMsg(`${okCount}/${results.length} documentos completos. Pendientes: ${failed.map(x=>`${x.file}: ${x.error}`).join(' · ')}`);}else setMsg(`${okCount} documento${okCount===1?'':'s'} clasificado${okCount===1?'':'s'}, leído${okCount===1?'':'s'} y guardado${okCount===1?'':'s'} automáticamente.`);
  window.dispatchEvent(new CustomEvent('fenix:document-batch-finished',{detail:{originType:target.type,originCode:target.code,results}}));
  if(okCount){window.setTimeout(()=>window.location.reload(),700);}
  return failed.length===0&&okCount===routes.length;
 }

 async function choose(e:ChangeEvent<HTMLInputElement>){const files=[...(e.target.files??[])];e.target.value='';if(!files.length)return;if(activeContext.staging){const allowed=IS_PRODUCTION?files.filter(file=>!isAudio(file)&&PROD_ALLOWED_MIME.has(mimeOf(file))):files,blocked=files.length-allowed.length;if(!allowed.length){setMsg(blocked?'Formato no admitido en producción.':'No se seleccionaron archivos.');return;}setQueue({originType:activeContext.type,label:activeContext.label,files:allowed});setMsg(`${allowed.length} archivo${allowed.length===1?'':'s'} preparado${allowed.length===1?'':'s'}. Se procesará${allowed.length===1?'':'n'} automáticamente al crear y abrir la ficha.`);return;}const allowed=IS_PRODUCTION?files.filter(file=>!isAudio(file)&&PROD_ALLOWED_MIME.has(mimeOf(file))):files;if(!allowed.length){setMsg('Formato no admitido en producción.');return;}setSelectedFiles(allowed);await uploadFiles(allowed,activeContext);}
 function close(){if(busy)return;setOpen(false);setSelectedFiles([]);if(legacyOpen){const q=new URLSearchParams(location.search);q.delete('upload');const suffix=q.toString();navigate(location.pathname+(suffix?'?'+suffix:''),{replace:true});}}
 const staged=queue?.originType===activeContext.type?queue.files.length:0,label=activeContext.staging?`Preparar archivos para ${activeContext.label}`:`Subir paquete documental a ${activeContext.label}`;
 const launcher=<button type="button" data-testid="context-evidence-open" onClick={()=>setOpen(true)} style={{width:'100%',border:'1px solid #f4741f',borderRadius:12,padding:'12px 16px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,background:'#f4741f',color:'#fff',fontWeight:800,boxShadow:'none',cursor:'pointer'}}><FileUp size={17}/>{staged?`${staged} archivo${staged===1?'':'s'} preparado${staged===1?'':'s'}`:IS_PRODUCTION?'Subir paquete de documentos':'Subir documentos / audio'}</button>;
 return <>{inlineHost&&createPortal(launcher,inlineHost)}{open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(20,16,24,.42)',display:'grid',placeItems:'center',padding:18}}><section className="ops-message" style={{display:'grid',gap:14,border:'2px solid #870064',width:'min(720px,100%)',maxHeight:'88vh',overflow:'auto',background:'var(--panel,#fff)',boxShadow:'0 24px 70px rgba(0,0,0,.28)'}} aria-label="Subir archivos contextuales"><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><strong style={{fontSize:18}}>{label}</strong><p style={{margin:'5px 0 0'}}>{IS_PRODUCTION?'Selecciona todos los documentos de una vez. En expedientes, el nombre del archivo debe incluir el tipo y, cuando sea un documento personal, el nombre del interviniente. La app los coloca de forma nativa y la IA solo lee el contenido.':'Admite cualquier tipo de archivo, incluido audio.'}</p></div><button type="button" onClick={close} aria-label="Cerrar" disabled={busy}><X size={16}/></button></div>{activeContext.staging&&<div style={{padding:11,borderRadius:12,background:'rgba(135,0,100,.07)'}}><strong>La ficha aún no existe.</strong><div>El paquete se mantendrá preparado y se procesará automáticamente al existir la ficha.</div></div>}<label className="primary" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,cursor:busy?'wait':'pointer',padding:12,borderRadius:12}}>{!IS_PRODUCTION&&/audio/i.test(msg)?<FileAudio size={18}/>:<FileUp size={18}/>} {busy?'Clasificando, subiendo y leyendo…':activeContext.staging?'Elegir paquete':'Elegir todos los documentos'}<input type="file" multiple accept={IS_PRODUCTION?PROD_ACCEPT:undefined} onChange={e=>void choose(e)} disabled={busy} style={{display:'none'}}/></label>{selectedFiles.length>0&&<div data-testid="context-evidence-selected" style={{display:'grid',gap:4,padding:12,borderRadius:12,border:'1px solid rgba(135,0,100,.22)'}}>{selectedFiles.map(file=><span key={`${file.name}-${file.size}`}><strong>{file.name}</strong> · {(file.size/1024/1024).toFixed(1)} MB</span>)}</div>}{staged>0&&<small>{staged} archivo{staged===1?'':'s'} preparado{staged===1?'':'s'}.</small>}{msg&&<strong data-testid="context-evidence-status">{msg}</strong>}<small>{IS_PRODUCTION?`Subida: máximo ${PROD_MAX_MB} MB por archivo. Lectura automática: hasta ${PROD_ANALYSIS_MAX_MB} MB por archivo. Se procesan hasta ${PROD_CONCURRENCY} documentos en paralelo.`:'Tamaño máximo actual por archivo: 12 MB.'}</small></section></div>}</>;
}
