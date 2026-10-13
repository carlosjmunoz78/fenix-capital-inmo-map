import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Maximize2,Mic,MicOff,Minimize2} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import {fetchAppApi,supabase} from './supabase';
import {applyVoiceContextHints,createVoiceRecognition,voiceRecognitionSupported} from './cerebroVoice';
import './cerebro-visual-console.css';

type SessionContext={actor_code?:string};
type AccessState='checking'|'allowed'|'denied';

function setReactTextareaValue(textarea:HTMLTextAreaElement,value:string){
 const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;
 if(setter)setter.call(textarea,value);
 else textarea.value=value;
 textarea.dispatchEvent(new Event('input',{bubbles:true}));
}

export default function CerebroVisualConsole(){
 const location=useLocation();
 const navigate=useNavigate();
 const hostRef=useRef<HTMLDivElement|null>(null);
 const recognitionRef=useRef<ReturnType<typeof createVoiceRecognition>>(null);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const [ownerAccess,setOwnerAccess]=useState<AccessState>('checking');
 const [formHost,setFormHost]=useState<HTMLFormElement|null>(null);
 const [dictating,setDictating]=useState(false);
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';

 useEffect(()=>{
  const sync=()=>setIsFullscreen(document.fullscreenElement===hostRef.current);
  document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[]);

 useEffect(()=>{
  if(!isCerebroPath){
   setOwnerAccess('checking');
   if(document.fullscreenElement===hostRef.current)void document.exitFullscreen().catch(()=>{});
   return;
  }
  let cancelled=false;
  const check=async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(cancelled)return;
   if(!session){setOwnerAccess('denied');return;}
   const {status,data}=await fetchAppApi<SessionContext>('/session/context');
   if(cancelled)return;
   const allowed=Boolean(status===200&&data?.actor_code==='CARLOS-ADMIN');
   setOwnerAccess(allowed?'allowed':'denied');
   if(!allowed)navigate('/inicio',{replace:true});
  };
  setOwnerAccess('checking');
  void check();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});
  return()=>{cancelled=true;subscription.unsubscribe();};
 },[isCerebroPath,navigate]);

 useEffect(()=>{
  if(!isCerebroPath||ownerAccess!=='allowed'){setFormHost(null);return;}
  const root=hostRef.current;
  if(!root)return;
  const locate=()=>{
   const form=root.querySelector<HTMLFormElement>('.cerebro-chat-form');
   setFormHost(current=>current===form?current:form);
  };
  locate();
  const observer=new MutationObserver(locate);
  observer.observe(root,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[isCerebroPath,ownerAccess]);

 useEffect(()=>()=>{
  const recognition=recognitionRef.current;
  recognitionRef.current=null;
  if(recognition){try{recognition.abort()}catch{/* no-op */}}
 },[]);

 if(!isCerebroPath||ownerAccess!=='allowed')return null;

 async function toggleFullscreen(){
  const host=hostRef.current;
  if(!host)return;
  try{
   if(document.fullscreenElement===host)await document.exitFullscreen();
   else await host.requestFullscreen({navigationUI:'hide'});
  }catch{
   // Browser/OS can deny fullscreen when the call is not considered a user gesture.
  }
 }

 function toggleDictation(){
  const active=recognitionRef.current;
  if(active){
   recognitionRef.current=null;
   try{active.stop()}catch{/* no-op */}
   setDictating(false);
   return;
  }
  if(!voiceRecognitionSupported()||hostRef.current?.querySelector('.cerebro-voice-session.is-active'))return;
  const textarea=hostRef.current?.querySelector<HTMLTextAreaElement>('.cerebro-chat-form textarea');
  const recognition=createVoiceRecognition();
  if(!textarea||!recognition)return;
  const prefix=textarea.value.trim();
  recognition.lang='es-ES';
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.maxAlternatives=3;
  applyVoiceContextHints(recognition);
  recognition.onstart=()=>setDictating(true);
  recognition.onresult=event=>{
   const chunks:string[]=[];
   for(let index=0;index<event.results.length;index+=1){
    const text=event.results[index]?.[0]?.transcript?.trim();
    if(text)chunks.push(text);
   }
   const transcript=chunks.join(' ').trim();
   if(!transcript)return;
   setReactTextareaValue(textarea,[prefix,transcript].filter(Boolean).join(prefix?' ':'').trim());
   textarea.focus();
  };
  recognition.onerror=()=>{recognitionRef.current=null;setDictating(false)};
  recognition.onend=()=>{recognitionRef.current=null;setDictating(false)};
  recognitionRef.current=recognition;
  try{recognition.start()}catch{recognitionRef.current=null;setDictating(false)}
 }

 const dictationButton=formHost?createPortal(
  <button type="button" className="cerebro-visual-dictate" onClick={toggleDictation} disabled={!voiceRecognitionSupported()} aria-pressed={dictating} title={dictating?'Detener dictado':'Dictar al cuadro de texto'}>
   {dictating?<MicOff size={17}/>:<Mic size={17}/>}<span>{dictating?'Parar':'Dictar'}</span>
  </button>,formHost
 ):null;

 return <div ref={hostRef} className={`cerebro-visual-console ${isFullscreen?'is-fullscreen':''}`} data-cerebro-visual="v1.4.25">
  <iframe
   className="cerebro-visual-frame"
   src="/cerebro-visual/candidate-v1425.html"
   title="CEREBRO OS · Visual Presence V1.4.25"
   aria-label="Representación visual viva de CEREBRO"
  />
  <div className="cerebro-visual-toolbar" aria-label="Controles de CEREBRO">
   <button type="button" onClick={()=>navigate('/perfil')} title="Volver a la aplicación"><ArrowLeft size={18}/><span>App</span></button>
   <span className="cerebro-visual-badge">CEREBRO · PREPROD</span>
   <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen} title={isFullscreen?'Salir de pantalla completa':'Pantalla completa'}>
    {isFullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{isFullscreen?'Salir':'Pantalla completa'}</span>
   </button>
  </div>
  <CerebroConsoleShell/>
  {dictationButton}
 </div>;
}
