import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroOperativeConsole from './CerebroOperativeConsole';
import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard';
import {fetchAppApi,supabase} from './supabase';
import './cerebro-console-host.css';
import './cerebro-operative-console-v2.css';
import './cerebro-operative-console-v3.css';
import './cerebro-operative-console-v3-fixes.css';

type CerebroView='V0'|'OPERATIVA';
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};
const VIEW_STORAGE_KEY='cerebro_console_view_v1';

function initialView():CerebroView{
 if(typeof window==='undefined')return'OPERATIVA';
 try{return window.sessionStorage.getItem(VIEW_STORAGE_KEY)==='V0'?'V0':'OPERATIVA'}catch{return'OPERATIVA'}
}

export default function CerebroConsoleHost(){
 const location=useLocation();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const[view,setView]=useState<CerebroView>(initialView);
 const[ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');

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

 return <div className={`cerebro-console-host view-${view.toLowerCase()}`}>
  <CerebroSpeechOutputGuard/>
  {view==='V0'?<div className="cerebro-host-topbar"><nav className="cerebro-view-switch" aria-label="Cambiar interfaz de CEREBRO"><span className="cerebro-view-switch-label">INTERFAZ</span><button type="button" className="is-active">HABLAR</button><button type="button" onClick={()=>setView('OPERATIVA')}>TÉCNICA</button><button type="button" disabled title="NEURAL se recuperará desde los artefactos existentes; no se reconstruirá desde cero.">NEURAL · POR AUDITAR</button></nav></div>:null}
  <div className={`cerebro-host-v0 ${view==='V0'?'is-visible':'is-hidden'}`} aria-hidden={view!=='V0'}><CerebroConsoleShell/></div>
  {view==='OPERATIVA'?<CerebroOperativeConsole onViewChange={setView}/>:null}
 </div>;
}
