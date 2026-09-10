import {ChangeEvent,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {FileAudio,LoaderCircle,X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL,supabase} from './supabase';

type OriginCtx={type:string;code:string;label:string};
type Prepare={ok?:boolean;upload_id?:string;storage_path?:string;token?:string;max_bytes?:number};
type Complete={ok?:boolean};
const BUCKET='fenix-prod-documents';
const API=`${SUPABASE_URL}/functions/v1/fenix-evidence-api`;
const AUDIO_EXT='.mp3,.m4a,.wav,.webm,.ogg,.oga,.opus,.aac,.flac,audio/*';
const AUDIO_MIME=new Set(['audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg','audio/opus','audio/aac','audio/flac']);
let cachedTranscriber:any=null;

function contextOf(pathname:string):OriginCtx|null{
 const path=pathname.replace(/\/+$/,'');
 for(const [base,type,label] of [['/expedientes','expediente','este expediente'],['/contactos','contacto','este contacto'],['/notarias','notaria','esta notaría']] as const){
  if(path.startsWith(`${base}/`)){
   const code=decodeURIComponent(path.slice(base.length+1));
   if(code&&!['nuevo','nueva'].includes(code))return{type,code,label};
  }
 }
 return null;
}
function mimeOf(file:File){
 const direct=(file.type||'').toLowerCase();if(AUDIO_MIME.has(direct))return direct;
 const n=file.name.toLowerCase();
 if(n.endsWith('.mp3'))return'audio/mpeg';if(n.endsWith('.m4a'))return'audio/mp4';if(n.endsWith('.wav'))return'audio/wav';if(n.endsWith('.webm'))return'audio/webm';if(n.endsWith('.ogg')||n.endsWith('.oga'))return'audio/ogg';if(n.endsWith('.opus'))return'audio/opus';if(n.endsWith('.aac'))return'audio/aac';if(n.endsWith('.flac'))return'audio/flac';
 return direct||'application/octet-stream';
}
async function api<T>(path:string,body:unknown):Promise<{status:number;data:T|null}>{
 const{data:{session}}=await supabase.auth.getSession();if(!session?.access_token)return{status:401,data:null};
 try{const r=await fetch(`${API}${path}`,{method:'POST',headers:{'content-type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});let data:T|null=null;try{data=await r.json()}catch{}return{status:r.status,data};}catch{return{status:0,data:null};}
}
async function saveEvidence(file:File,ctx:OriginCtx,kind:'audio_conversacion'|'texto_conversacion'){
 const mime=mimeOf(file);
 const p=await api<Prepare>('/prepare',{origin_type:ctx.type,origin_code:ctx.code,evidence_kind:kind,filename:file.name,mime_type:mime});
 if(p.status!==200||!p.data?.upload_id||!p.data.storage_path||!p.data.token)throw new Error('prepare_failed');
 if(p.data.max_bytes&&file.size>p.data.max_bytes)throw new Error('file_too_large');
 const up=await supabase.storage.from(BUCKET).uploadToSignedUrl(p.data.storage_path,p.data.token,file,{contentType:mime});if(up.error)throw new Error('upload_failed');
 const c=await api<Complete>('/complete',{upload_id:p.data.upload_id,title:file.name,tipo:kind==='audio_conversacion'?'Audio':'Otro'});if(c.status!==200||!c.data?.ok)throw new Error('complete_failed');
}
async function transcribeLocal(file:File,onProgress:(s:string)=>void){
 onProgress('Cargando motor local gratuito…');
 if(!cachedTranscriber){
  const moduleUrl='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
  const mod:any=await import(/* @vite-ignore */ moduleUrl);
  cachedTranscriber=await mod.pipeline('automatic-speech-recognition','onnx-community/whisper-tiny');
 }
 onProgress('Transcribiendo en este dispositivo…');
 const url=URL.createObjectURL(file);
 try{const out:any=await cachedTranscriber(url,{language:'spanish',task:'transcribe',chunk_length_s:30,stride_length_s:5});return String(out?.text||'').trim();}
 finally{URL.revokeObjectURL(url);}
}

export default function LocalAudioTranscriptionGuard(){
 const location=useLocation(),ctx=useMemo(()=>contextOf(location.pathname),[location.pathname]);
 const[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[text,setText]=useState('');
 const input=useRef<HTMLInputElement|null>(null);
 if(!ctx)return null;
 const activeCtx:OriginCtx=ctx;
 async function choose(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const mime=mimeOf(file);if(!AUDIO_MIME.has(mime)){setStatus('Formato de audio no compatible.');return;}
  setBusy(true);setText('');
  try{
   setStatus('Guardando audio original…');await saveEvidence(file,activeCtx,'audio_conversacion');
   const transcript=await transcribeLocal(file,setStatus);if(!transcript)throw new Error('empty_transcript');
   setText(transcript);setStatus('Guardando transcripción vinculada…');
   const txt=new File([transcript],`${file.name.replace(/\.[^.]+$/,'')}-transcripcion.txt`,{type:'text/plain'});await saveEvidence(txt,activeCtx,'texto_conversacion');
   setStatus('Audio y transcripción guardados y vinculados.');
  }catch(e){setStatus(e instanceof Error&&e.message==='file_too_large'?'El audio supera el tamaño máximo permitido.':'No se pudo completar la transcripción. El audio original no se borra si ya quedó guardado.');}
  finally{setBusy(false);}
 }
 return createPortal(<><button type="button" aria-label="Subir audio y transcribir" title="Audio → texto" onClick={()=>setOpen(true)} style={{position:'fixed',right:18,bottom:96,zIndex:9050,width:46,height:46,borderRadius:14,border:'1px solid #870064',background:'#870064',color:'#fff',display:'grid',placeItems:'center',cursor:'pointer',boxShadow:'0 8px 24px rgba(0,0,0,.18)'}}><FileAudio size={20}/></button>{open&&<div style={{position:'fixed',inset:0,zIndex:10010,background:'rgba(20,16,24,.45)',display:'grid',placeItems:'center',padding:18}}><section style={{width:'min(620px,100%)',maxHeight:'86vh',overflow:'auto',background:'var(--panel,#fff)',color:'var(--text,#222)',border:'2px solid #870064',borderRadius:16,padding:18,display:'grid',gap:14}} aria-label="Transcribir audio"><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><strong>Audio → texto</strong><div style={{fontSize:12,marginTop:4}}>Se guarda el audio original y la transcripción en {activeCtx.label}. La transcripción se ejecuta localmente, sin API de pago.</div></div><button type="button" onClick={()=>setOpen(false)} disabled={busy} aria-label="Cerrar"><X size={16}/></button></div><button type="button" disabled={busy} onClick={()=>input.current?.click()} style={{padding:12,borderRadius:12,fontWeight:800,cursor:busy?'wait':'pointer'}}>{busy?<><LoaderCircle size={16}/> Procesando…</>:'Elegir audio'}</button><input ref={input} type="file" accept={AUDIO_EXT} onChange={e=>void choose(e)} style={{display:'none'}}/>{status&&<strong style={{fontSize:12}}>{status}</strong>}{text&&<textarea readOnly value={text} aria-label="Transcripción" style={{minHeight:150,width:'100%',padding:12,borderRadius:10}}/>}<small>La primera transcripción descarga y almacena en caché el modelo local; las siguientes reutilizan esa caché.</small></section></div>}</>,document.body);
}
