import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileAudio,FileUp,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {IS_PRODUCTION,SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

const BUCKET=IS_PRODUCTION?'fenix-prod-documents':'fenix-preprod-documents-test';
const FUNCTION=IS_PRODUCTION?'fenix-evidence-api':'fenix-evidence-universal-test';
const PROD_SUPPORTED_ORIGINS=new Set(['expediente','contacto','firma']);
const PROD_ALLOWED_MIME=new Set([
 'application/pdf','image/png','image/jpeg','image/webp','text/plain','application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const PROD_ACCEPT='.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx';
const AUDIO_EXTENSIONS=['.mp3','.m4a','.wav','.webm','.ogg','.oga','.opus','.aac','.flac'];
const MIME_BY_EXT:Record<string,string>={
 '.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml',
 '.txt':'text/plain','.csv':'text/csv','.json':'application/json','.xml':'application/xml','.zip':'application/zip','.doc':'application/msword',
 '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 '.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation',
 '.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.webm':'audio/webm','.ogg':'audio/ogg','.oga':'audio/ogg','.opus':'audio/opus','.aac':'audio/aac','.flac':'audio/flac'
};

type OriginCtx={type:string;code:string;label:string;staging:boolean};
type Prepare={ok?:boolean;upload_id?:string;storage_path?:string;token?:string;max_bytes?:number};
type Complete={ok?:boolean;reused?:boolean;document_page_id?:string};
type Queue={originType:string;label:string;files:File[]};

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
  if(path.startsWith(`${def.base}/`)){
   const id=decodeURIComponent(path.slice(def.base.length+1));
   if(id&&!['nuevo','nueva'].includes(id))return{type:def.type,code:id,label:def.label,staging:false};
  }
 }
 if(path==='/documentacion')return{type:'documentacion_general',code:'general',label:'Documentación',staging:false};
 if(path==='/firmas')return{type:'firmas_general',code:'general',label:'Firmas',staging:false};
 return null;
}
function isAudio(file:File){
 const mime=(file.type||'').toLowerCase();
 if(mime.startsWith('audio/'))return true;
 const name=file.name.toLowerCase();
 return AUDIO_EXTENSIONS.some(ext=>name.endsWith(ext));
}
function mimeOf(file:File){
 const direct=(file.type||'').trim().toLowerCase();
 if(direct)return direct;
 const lower=file.name.toLowerCase();
 for(const[ext,mime]of Object.entries(MIME_BY_EXT))if(lower.endsWith(ext))return mime;
 return'application/octet-stream';
}

async function evidenceFetch<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null};
 let response:Response;
 try{
  response=await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}${path}`,{
   ...init,
   headers:{'content-type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}
  });
 }catch{return{status:0,data:null};}
 let data:T|null=null;
 try{data=await response.json()}catch{}
 return{status:response.status,data};
}

export default function ContextEvidenceUpload(){
 const location=useLocation(),navigate=useNavigate();
 const params=useMemo(()=>new URLSearchParams(location.search),[location.search]);
 const explicit=useMemo<OriginCtx|null>(()=>{
  const comprador=params.get('comprador')||'',expediente=params.get('expediente')||'';
  if(comprador)return{type:'comprador',code:comprador,label:'esta persona y su expediente',staging:false};
  if(expediente)return{type:'expediente',code:expediente,label:'este expediente',staging:false};
  return null;
 },[params]);
 const rawContext=explicit??routeContext(location.pathname);
 const context=IS_PRODUCTION&&rawContext&&!PROD_SUPPORTED_ORIGINS.has(rawContext.type)?null:rawContext;
 const legacyOpen=location.pathname==='/documentacion'&&params.get('upload')==='1'&&Boolean(explicit)&&Boolean(context);
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[queue,setQueue]=useState<Queue|null>(null),[inlineHost,setInlineHost]=useState<HTMLElement|null>(null);
 const autoUploading=useRef(false);

 useEffect(()=>{if(legacyOpen)setOpen(true)},[legacyOpen]);
 useEffect(()=>{
  if(!context){setInlineHost(null);return;}
  const host=document.createElement('div');
  host.className='context-evidence-inline-host';
  const place=()=>{
   const content=document.querySelector<HTMLElement>('.ops-content,.dir-content');
   if(!content)return;
   const lifecycle=content.querySelector<HTMLElement>(':scope > .exp-life-inline-host');
   const kpis=content.querySelector<HTMLElement>(':scope > .tas-kpis, :scope > .firmas-kpis, :scope > .fin-kpis, :scope > .vis-kpis, :scope > .inmo-kpis, :scope > [class$="-kpis"]');
   const hero=content.querySelector<HTMLElement>(':scope > [class*="-ana-hero"], :scope > .vis-ana, :scope > .ops-ana-card, :scope > .dir-priority-copy');
   const anchor=lifecycle??kpis??hero;
   if(anchor){if(anchor.nextElementSibling!==host)content.insertBefore(host,anchor.nextElementSibling)}else if(host.parentElement!==content)content.insertBefore(host,content.firstChild);
   if(content.closest('.firmas-root')){host.style.gridColumn='1';host.style.gridRow='4'}else{host.style.gridColumn='';host.style.gridRow=''}
   for(const duplicate of document.querySelectorAll<HTMLElement>('.firma-upload-inline,.doc-upload-inline'))duplicate.style.setProperty('display','none','important');
  };
  place();
  setInlineHost(host);
  const observer=new MutationObserver(place);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();host.remove();setInlineHost(null)};
 },[location.pathname,Boolean(context)]);
 useEffect(()=>{
  if(!queue||!context||context.staging||!context.code||queue.originType!==context.type||busy||autoUploading.current)return;
  autoUploading.current=true;
  const files=queue.files;
  setQueue(null);
  setOpen(true);
  setMsg(`Vinculando ${files.length} archivo${files.length===1?'':'s'} a ${context.label}…`);
  void uploadFiles(files,context).finally(()=>{autoUploading.current=false});
 },[location.pathname,context?.type,context?.code,context?.staging,queue,busy]);

 if(!context)return null;
 const activeContext:OriginCtx=context;

 async function uploadFiles(files:File[],target:OriginCtx){
  if(!target.code)return;
  setBusy(true);
  let saved=0,reused=0,failed=0,oversize=0,blocked=0;
  for(const file of files){
   const mime=mimeOf(file),audio=isAudio(file);
   if(IS_PRODUCTION&&(audio||!PROD_ALLOWED_MIME.has(mime))){blocked++;continue;}
   const prepared=await evidenceFetch<Prepare>('/prepare',{method:'POST',body:JSON.stringify({origin_type:target.type,origin_code:target.code,evidence_kind:audio?'audio_conversacion':'documento',filename:file.name,mime_type:mime})});
   if(prepared.status!==200||!prepared.data?.upload_id||!prepared.data.storage_path||!prepared.data.token){failed++;continue;}
   if(prepared.data.max_bytes&&file.size>prepared.data.max_bytes){oversize++;continue;}
   const uploaded=await supabase.storage.from(BUCKET).uploadToSignedUrl(prepared.data.storage_path,prepared.data.token,file,{contentType:mime});
   if(uploaded.error){failed++;continue;}
   const done=await evidenceFetch<Complete>('/complete',{method:'POST',body:JSON.stringify({upload_id:prepared.data.upload_id,title:file.name})});
   if(done.status===200&&done.data?.ok){if(done.data.reused)reused++;else saved++;}else failed++;
  }
  setBusy(false);
  const bits:string[]=[];
  if(saved)bits.push(`${saved} guardado${saved===1?'':'s'} y enlazado${saved===1?'':'s'}`);
  if(reused)bits.push(`${reused} ya existía${reused===1?'':'n'}`);
  if(oversize)bits.push(`${oversize} supera${oversize===1?'':'n'} 12 MB`);
  if(blocked)bits.push(`${blocked} pendiente${blocked===1?'':'s'} de habilitación segura en producción`);
  if(failed)bits.push(`${failed} con error`);
  setMsg(bits.length?bits.join(' · '):'No se seleccionaron archivos.');
 }

 async function choose(e:ChangeEvent<HTMLInputElement>){
  const files=[...(e.target.files??[])];
  e.target.value='';
  if(!files.length)return;
  if(activeContext.staging){
   const allowed=IS_PRODUCTION?files.filter(file=>!isAudio(file)&&PROD_ALLOWED_MIME.has(mimeOf(file))):files;
   const blocked=files.length-allowed.length;
   if(!allowed.length){setMsg(blocked?'Audio o formato pendiente de habilitación segura en producción.':'No se seleccionaron archivos.');return;}
   setQueue({originType:activeContext.type,label:activeContext.label,files:allowed});
   setMsg(`${allowed.length} archivo${allowed.length===1?'':'s'} preparado${allowed.length===1?'':'s'}. Se vinculará${allowed.length===1?'':'n'} automáticamente cuando exista y se abra la ficha.${blocked?` ${blocked} archivo${blocked===1?'':'s'} no se cargará${blocked===1?'':'n'} hasta habilitar su tratamiento seguro en producción.`:''}`);
   return;
  }
  await uploadFiles(files,activeContext);
 }
 function close(){
  setOpen(false);
  if(legacyOpen){
   const q=new URLSearchParams(location.search);
   q.delete('upload');
   const suffix=q.toString();
   navigate(location.pathname+(suffix?'?'+suffix:''),{replace:true});
  }
 }
 const staged=queue?.originType===activeContext.type?queue.files.length:0;
 const label=activeContext.staging?`Preparar archivos para ${activeContext.label}`:`Subir archivos a ${activeContext.label}`;
 const launcher=<button type="button" data-testid="context-evidence-open" onClick={()=>setOpen(true)} style={{width:'100%',border:'1px solid #f4741f',borderRadius:12,padding:'12px 16px',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,background:'#f4741f',color:'#fff',fontWeight:800,boxShadow:'none',cursor:'pointer'}}><FileUp size={17}/>{staged?`${staged} archivo${staged===1?'':'s'} preparado${staged===1?'':'s'}`:IS_PRODUCTION?'Subir documentos':'Subir documentos / audio'}</button>;
 return <>
  {inlineHost&&createPortal(launcher,inlineHost)}
  {open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(20,16,24,.42)',display:'grid',placeItems:'center',padding:18}}><section className="ops-message" style={{display:'grid',gap:14,border:'2px solid #870064',width:'min(620px,100%)',maxHeight:'88vh',overflow:'auto',background:'var(--panel,#fff)',boxShadow:'0 24px 70px rgba(0,0,0,.28)'}} aria-label="Subir archivos contextuales"><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><strong style={{fontSize:18}}>{label}</strong><p style={{margin:'5px 0 0'}}>{IS_PRODUCTION?'Admite documentos validados para producción. El original se conserva sin ejecutarlo ni transformarlo y queda enlazado al contexto correcto.':'Admite cualquier tipo de archivo, incluido audio. El original se conserva sin ejecutarlo ni transformarlo y queda enlazado al contexto correcto.'}</p></div><button type="button" onClick={close} aria-label="Cerrar"><X size={16}/></button></div>{activeContext.staging&&<div style={{padding:11,borderRadius:12,background:'rgba(135,0,100,.07)'}}><strong>La ficha aún no existe.</strong><div>Selecciona ahora los archivos y los mantendré preparados en esta sesión. Al crear y abrir la ficha se asociarán automáticamente.</div></div>}<label className="primary" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,cursor:busy?'wait':'pointer',padding:12,borderRadius:12}}>{!IS_PRODUCTION&&/audio/i.test(msg)?<FileAudio size={18}/>:<FileUp size={18}/>} {busy?'Subiendo y enlazando…':activeContext.staging?'Elegir archivos':IS_PRODUCTION?'Elegir documentos':'Elegir archivos o audios'}<input type="file" multiple accept={IS_PRODUCTION?PROD_ACCEPT:undefined} onChange={e=>void choose(e)} disabled={busy} style={{display:'none'}}/></label>{staged>0&&<small>{staged} archivo{staged===1?'':'s'} pendiente{staged===1?'':'s'} de que exista la ficha.</small>}{msg&&<strong>{msg}</strong>}<small>{IS_PRODUCTION?'Tamaño máximo actual por archivo: 12 MB. Audio y contextos sin contrato productivo permanecen bloqueados hasta disponer de tratamiento seguro validado.':'Tamaño máximo actual por archivo: 12 MB. Los audios se conservan como evidencia original y quedan marcados como audio pendiente de tratamiento posterior.'}</small></section></div>}
 </>;
}