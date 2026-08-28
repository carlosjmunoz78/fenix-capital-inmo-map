import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react';
import {FileAudio,FileUp,X} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

const BUCKET='fenix-preprod-documents-test';
const FUNCTION='fenix-evidence-universal-test';
const AUDIO_EXTENSIONS=['.mp3','.m4a','.wav','.webm','.ogg','.oga','.opus','.aac','.flac'];

type OriginCtx={type:string;code:string;label:string;staging:boolean};
type Prepare={ok?:boolean;upload_id?:string;storage_path?:string;token?:string;max_bytes?:number};
type Complete={ok?:boolean;reused?:boolean;document_page_id?:string};
type Queue={originType:string;label:string;files:File[]};

function routeContext(pathname:string):OriginCtx|null{
 const path=(pathname.replace(/\/+$/,'')||'/');
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
function isAudio(file:File){const mime=(file.type||'').toLowerCase();if(mime.startsWith('audio/'))return true;const name=file.name.toLowerCase();return AUDIO_EXTENSIONS.some(ext=>name.endsWith(ext));}
function mimeOf(file:File){const mime=(file.type||'').trim().toLowerCase();return mime||'application/octet-stream';}

async function evidenceFetch<T>(path:string,init?:RequestInit):Promise<{status:number;data:T|null}>{
 const{data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return{status:401,data:null};
 let response:Response;
 try{
  response=await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}${path}`,{
   ...init,
   headers:{
    'content-type':'application/json',
    apikey:SUPABASE_PUBLISHABLE_KEY,
    Authorization:`Bearer ${session.access_token}`,
    ...(init?.headers||{})
   }
  });
 }catch{return{status:0,data:null};}
 let data:T|null=null;try{data=await response.json()}catch{}
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
 const context=explicit??routeContext(location.pathname);
 const legacyOpen=location.pathname==='/documentacion'&&params.get('upload')==='1'&&Boolean(explicit);
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[queue,setQueue]=useState<Queue|null>(null);
 const autoUploading=useRef(false);

 useEffect(()=>{if(legacyOpen)setOpen(true)},[legacyOpen]);
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

 async function uploadFiles(files:File[],target:OriginCtx){
  if(!target.code)return;
  setBusy(true);
  let saved=0,reused=0,failed=0,oversize=0;
  for(const file of files){
   const mime=mimeOf(file),audio=isAudio(file);
   const prepared=await evidenceFetch<Prepare>('/prepare',{method:'POST',body:JSON.stringify({origin_type:target.type,origin_code:target.code,evidence_kind:audio?'audio_conversacion':'documento',filename:file.name,mime_type:mime})});
   if(prepared.status!==200||!prepared.data?.upload_id||!prepared.data.storage_path||!prepared.data.token){failed++;continue;}
   if(prepared.data.max_bytes&&file.size>prepared.data.max_bytes){oversize++;continue;}
   const uploaded=await supabase.storage.from(BUCKET).uploadToSignedUrl(prepared.data.storage_path,prepared.data.token,file,{contentType:mime});
   if(uploaded.error){failed++;continue;}
   const done=await evidenceFetch<Complete>('/complete',{method:'POST',body:JSON.stringify({upload_id:prepared.data.upload_id,title:file.name})});
   if(done.status===200&&done.data?.ok){if(done.data.reused)reused++;else saved++;}else failed++;
  }
  setBusy(false);
  const bits=[saved?`${saved} guardado${saved===1?'':'s'} y enlazado${saved===1?'':'s'}`:'',reused?`${reused} ya existía${reused===1?'':'n'}`:'',oversize?`${oversize} supera${oversize===1?'':'n'} 12 MB`:'',failed?`${failed} no se pudo${failed===1?'':'ieron'} completar`:''].filter(Boolean);
  setMsg(bits.length?bits.join(' · '):'No se seleccionaron archivos.');
 }

 async function choose(e:ChangeEvent<HTMLInputElement>){
  const files=[...(e.target.files??[])];e.target.value='';if(!files.length)return;
  if(context.staging){
   setQueue({originType:context.type,label:context.label,files});
   setMsg(`${files.length} archivo${files.length===1?'':'s'} preparado${files.length===1?'':'s'}. Se vinculará${files.length===1?'':'n'} automáticamente cuando exista y se abra la ficha.`);
   return;
  }
  await uploadFiles(files,context);
 }
 function close(){
  setOpen(false);
  if(legacyOpen){const q=new URLSearchParams(location.search);q.delete('upload');navigate(`${location.pathname}${q.toString()?`?`?${q}`:''}`,{replace:true});}
 }
 const staged=queue?.originType===context.type?queue.files.length:0;
 const label=context.staging?`Preparar archivos para ${context.label}`:`Subir archivos a ${context.label}`;
 return <>
  <button type="button" data-testid="context-evidence-open" onClick={()=>setOpen(true)} style={{position:'fixed',right:22,bottom:98,zIndex:7200,border:0,borderRadius:999,padding:'11px 15px',display:'inline-flex',alignItems:'center',gap:8,background:'#870064',color:'#fff',fontWeight:800,boxShadow:'0 12px 32px rgba(61,13,50,.24)',cursor:'pointer'}}><FileUp size={17}/>{staged?`${staged} archivo${staged===1?'':'s'} preparado${staged===1?'':'s'}`:'Subir documentos / audio'}</button>
  {open&&<div role="presentation" style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(20,16,24,.42)',display:'grid',placeItems:'center',padding:18}}><section className="ops-message" style={{display:'grid',gap:14,border:'2px solid #870064',width:'min(620px,100%)',maxHeight:'88vh',overflow:'auto',background:'var(--panel,#fff)',boxShadow:'0 24px 70px rgba(0,0,0,.28)'}} aria-label="Subir archivos contextuales"><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><strong style={{fontSize:18}}>{label}</strong><p style={{margin:'5px 0 0'}}>Admite cualquier tipo de archivo, incluido audio. El original se conserva sin ejecutarlo ni transformarlo y queda enlazado al contexto correcto.</p></div><button type="button" onClick={close} aria-label="Cerrar"><X size={16}/></button></div>{context.staging&&<div style={{padding:11,borderRadius:12,background:'rgba(135,0,100,.07)'}}><strong>La ficha aún no existe.</strong><div>Selecciona ahora los archivos y los mantendré preparados en esta sesión. Al crear y abrir la ficha se asociarán automáticamente.</div></div>}<label className="primary" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,cursor:busy?'wait':'pointer',padding:12,borderRadius:12}}>{isAudioName(msg)?<FileAudio size={18}/>:<FileUp size={18}/>} {busy?'Subiendo y enlazando…':context.staging?'Elegir cualquier archivo':'Elegir archivos o audios'}<input type="file" multiple onChange={e=>void choose(e)} disabled={busy} style={{display:'none'}}/></label>{staged>0&&<small>{staged} archivo{staged===1?'':'s'} pendiente{staged===1?'':'s'} de que exista la ficha.</small>}{msg&&<strong>{msg}</strong>}<small>Tamaño máximo actual por archivo: 12 MB. Los audios se conservan como evidencia original y quedan marcados como audio pendiente de tratamiento posterior.</small></section></div>}
 </>;
}

function isAudioName(value:string){return /audio/i.test(value)}
