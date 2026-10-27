import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroBrowserConsole from './CerebroBrowserConsole';
import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';
import CerebroNeuralView from './CerebroNeuralView';
import CerebroInterfaceBar,{type CerebroPrimaryView} from './CerebroInterfaceBar';
import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard';
import {fetchAppApi,supabase} from './supabase';
import './cerebro-console-host.css';
import './cerebro-technical-surface.css';

type CerebroView=CerebroPrimaryView|'LEGACY';
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};

function initialView():CerebroView{
 if(typeof window==='undefined')return'JARVIS';
 const section=(new URLSearchParams(window.location.search).get('section')||'').toLowerCase();
 if(section==='browser'||section==='navegador')return'NAVEGADOR';
 if(section==='technical'||section==='tecnica'||section==='técnica'||section==='v0')return'TECNICA';
 if(section==='neural'||section==='neuronal')return'NEURONAL';
 if(section==='legacy-v0')return'LEGACY';
 return'JARVIS';
}

function sectionFor(view:CerebroPrimaryView){if(view==='TECNICA')return'technical';if(view==='NEURONAL')return'neuronal';if(view==='NAVEGADOR')return'browser';return''}

export default function CerebroConsoleHost(){
 const location=useLocation();
 const navigate=useNavigate();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const[view,setView]=useState<CerebroView>(initialView);
 const[ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const changeView=(next:CerebroPrimaryView)=>{setView(next);const section=sectionFor(next);navigate({pathname:'/cerebro',search:section?`?section=${section}`:''},{replace:true})};

 useEffect(()=>{if(!isCerebroPath)return;const ensure=()=>{if(document.documentElement.dataset.cerebroConsole!=='1')document.documentElement.dataset.cerebroConsole='1'};ensure();const observer=new MutationObserver(ensure);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-cerebro-console']});return()=>{observer.disconnect();delete document.documentElement.dataset.cerebroConsole}},[isCerebroPath]);
 useEffect(()=>{if(!isCerebroPath){setOwnerAccess('checking');return}let cancelled=false;const check=async()=>{const {data:{session}}=await supabase.auth.getSession();if(cancelled)return;if(!session){setOwnerAccess('checking');return}const {status,data}=await fetchAppApi<SessionContext>('/session/context');if(cancelled)return;setOwnerAccess(status===200&&data?.actor_code==='CARLOS-ADMIN'?'allowed':'denied')};void check();const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});return()=>{cancelled=true;subscription.unsubscribe()}},[isCerebroPath]);
 useEffect(()=>{if(!isCerebroPath)return;setView(initialView())},[isCerebroPath,location.search]);

 if(!isCerebroPath)return <CerebroConsoleShell/>;
 if(ownerAccess!=='allowed')return <CerebroConsoleShell/>;

 if(view==='LEGACY')return <div className="cerebro-console-host cerebro-legacy-host"><CerebroSpeechOutputGuard/><div className="cerebro-legacy-top"><strong>ROLLBACK · LEGACY V0</strong><button type="button" onClick={()=>changeView('TECNICA')}>VOLVER A TÉCNICA</button></div><div className="cerebro-host-v0 cerebro-legacy-v0"><CerebroConsoleShell/></div></div>;

 return <div className="cerebro-console-host cerebro-four-interface-host">
  <CerebroSpeechOutputGuard/>
  <CerebroInterfaceBar view={view} onViewChange={changeView}/>
  <div className="cerebro-interface-stage">
   <div className="cerebro-interface-panel cerebro-jarvis-surface" hidden={view!=='JARVIS'} aria-hidden={view!=='JARVIS'}><CerebroJarvisWorkConsole/></div>
   <div className="cerebro-interface-panel cerebro-host-v0 cerebro-technical-surface" hidden={view!=='TECNICA'} aria-hidden={view!=='TECNICA'}><CerebroConsoleShell/></div>
   {view==='NEURONAL'?<CerebroNeuralView/>:null}
   {view==='NAVEGADOR'?<div className="cerebro-interface-panel cerebro-browser-surface"><CerebroBrowserConsole onViewChange={next=>{if(next==='NAVEGADOR')changeView('NAVEGADOR');else changeView('JARVIS')}}/></div>:null}
  </div>
 </div>;
}
