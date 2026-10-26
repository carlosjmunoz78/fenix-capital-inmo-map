import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroBrowserConsole from './CerebroBrowserConsole';
import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';
import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard';
import {fetchAppApi,supabase} from './supabase';
import './cerebro-console-host.css';

type CerebroView='V0'|'OPERATIVA'|'NAVEGADOR';
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};
const VIEW_STORAGE_KEY='cerebro_console_view_v1';

function initialView():CerebroView{
 if(typeof window==='undefined')return'OPERATIVA';
 const section=new URLSearchParams(window.location.search).get('section');
 if(section==='browser')return'NAVEGADOR';
 if(section==='legacy-v0')return'V0';
 return'OPERATIVA';
}

export default function CerebroConsoleHost(){
 const location=useLocation();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const[view,setView]=useState<CerebroView>(initialView);
 const[ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const changeView=(next:CerebroView)=>setView(next==='V0'?'OPERATIVA':next);

 useEffect(()=>{
  if(!isCerebroPath)return;
  const ensure=()=>{if(document.documentElement.dataset.cerebroConsole!=='1')document.documentElement.dataset.cerebroConsole='1'};
  ensure();
  const observer=new MutationObserver(ensure);
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-cerebro-console']});
  return()=>{observer.disconnect();delete document.documentElement.dataset.cerebroConsole};
 },[isCerebroPath]);

 useEffect(()=>{
  if(!isCerebroPath){setOwnerAccess('checking');return}
  let cancelled=false;
  const check=async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(cancelled)return;
   if(!session){setOwnerAccess('checking');return}
   const {status,data}=await fetchAppApi<SessionContext>('/session/context');
   if(cancelled)return;
   setOwnerAccess(status===200&&data?.actor_code==='CARLOS-ADMIN'?'allowed':'denied');
  };
  void check();
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});
  return()=>{cancelled=true;subscription.unsubscribe()};
 },[isCerebroPath]);

 useEffect(()=>{
  if(!isCerebroPath)return;
  try{window.sessionStorage.setItem(VIEW_STORAGE_KEY,view)}catch{/* session storage is optional */}
 },[isCerebroPath,view]);

 if(!isCerebroPath)return <CerebroConsoleShell/>;
 if(ownerAccess!=='allowed')return <CerebroConsoleShell/>;

 const legacy=view==='V0';
 const browser=view==='NAVEGADOR';

 return <div className={`cerebro-console-host view-${view.toLowerCase()}`}>
  <CerebroSpeechOutputGuard/>
  {legacy?<>
   <div className="cerebro-host-topbar"><nav className="cerebro-view-switch" aria-label="Rollback técnico de CEREBRO"><span className="cerebro-view-switch-label">ROLLBACK</span><button type="button" className="is-active">LEGACY V0</button><button type="button" onClick={()=>changeView('OPERATIVA')}>JARVIS WORK</button><button type="button" onClick={()=>changeView('NAVEGADOR')}>NAVEGADOR</button></nav></div>
   <div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div>
  </>:null}
  {!legacy?<div className="cerebro-work-mount" hidden={browser} aria-hidden={browser}>
   <CerebroJarvisWorkConsole onViewChange={next=>changeView(next)}/>
  </div>:null}
  {browser?<CerebroBrowserConsole onViewChange={changeView}/>:null}
 </div>;
}
