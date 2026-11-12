import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroBrowserConsole from './CerebroBrowserConsole';
import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';
import CerebroOperativeConsole from './CerebroOperativeConsole';
import CerebroNeuralView from './CerebroNeuralView';
import CerebroInterfaceBar,{type CerebroPrimaryView} from './CerebroInterfaceBar';
import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard';
import {fetchAppApi,supabase} from './supabase';
import './cerebro-console-host.css';

type CerebroView='V0'|CerebroPrimaryView;
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};
const VIEW_STORAGE_KEY='cerebro_console_view_v1';

function initialView():CerebroView{
 if(typeof window==='undefined')return'OPERATIVA';
 const section=new URLSearchParams(window.location.search).get('section');
 if(section==='browser')return'NAVEGADOR';
 if(section==='jarvis')return'JARVIS';
 if(section==='neuronal'||section==='neural')return'NEURONAL';
 if(section==='operativa')return'OPERATIVA';
 if(section==='legacy-v0')return'V0';
 return'OPERATIVA';
}

export default function CerebroConsoleHost(){
 const location=useLocation();
 const navigate=useNavigate();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const[view,setView]=useState<CerebroView>(initialView);
 const[ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const changeView=(next:CerebroPrimaryView)=>{setView(next);const section={JARVIS:'jarvis',OPERATIVA:'operativa',NEURONAL:'neuronal',NAVEGADOR:'browser'}[next];navigate({pathname:'/cerebro',search:`?section=${section}`},{replace:true})};

 useEffect(()=>{if(isCerebroPath)setView(initialView())},[isCerebroPath,location.search]);

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
 return <div className={`cerebro-console-host view-${view.toLowerCase()}`}>
  <CerebroSpeechOutputGuard/>
  {legacy?<div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div>:<>
   <CerebroInterfaceBar view={view as CerebroPrimaryView} onViewChange={changeView}/>
   <div className="cerebro-interface-stage">
    {view==='JARVIS'?<div className="cerebro-work-mount cerebro-host-v0"><CerebroJarvisWorkConsole onViewChange={changeView}/></div>:null}
    {view==='OPERATIVA'?<div className="cerebro-work-mount cerebro-host-v0"><CerebroOperativeConsole/></div>:null}
    {view==='NEURONAL'?<CerebroNeuralView/>:null}
    {view==='NAVEGADOR'?<CerebroBrowserConsole onViewChange={changeView}/>:null}
   </div>
  </>}
 </div>;
}
