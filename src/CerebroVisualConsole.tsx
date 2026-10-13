import {useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Maximize2,Minimize2} from 'lucide-react';
import CerebroConsoleShell from './CerebroConsoleShell';
import {fetchAppApi,supabase} from './supabase';
import './cerebro-visual-console.css';

type SessionContext={actor_code?:string};
type AccessState='checking'|'allowed'|'denied';

export default function CerebroVisualConsole(){
 const location=useLocation();
 const navigate=useNavigate();
 const hostRef=useRef<HTMLDivElement|null>(null);
 const [isFullscreen,setIsFullscreen]=useState(false);
 const [ownerAccess,setOwnerAccess]=useState<AccessState>('checking');
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
 </div>;
}
