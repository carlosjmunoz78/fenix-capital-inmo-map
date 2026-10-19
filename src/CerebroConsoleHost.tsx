import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroOperativeConsole from './CerebroOperativeConsole';
import CerebroNeuralView from './CerebroNeuralView';
import './cerebro-console-host.css';

type CerebroView='V0'|'OPERATIVA'|'NEURAL';
const VIEW_STORAGE_KEY='cerebro_console_view_v1';

function initialView():CerebroView{
 if(typeof window==='undefined')return'OPERATIVA';
 try{
  const stored=window.sessionStorage.getItem(VIEW_STORAGE_KEY);
  if(stored==='V0'||stored==='NEURAL')return stored;
  return'OPERATIVA';
 }catch{return'OPERATIVA'}
}

export default function CerebroConsoleHost(){
 const location=useLocation();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const[view,setView]=useState<CerebroView>(initialView);

 useEffect(()=>{
  if(!isCerebroPath)return;
  try{window.sessionStorage.setItem(VIEW_STORAGE_KEY,view)}catch{/* session storage is optional */}
 },[isCerebroPath,view]);

 if(!isCerebroPath)return <CerebroConsoleShell/>;

 const coreClass=view==='V0'?'is-visible':view==='NEURAL'?'is-neural-overlay':'is-hidden';
 return <div className={`cerebro-console-host view-${view.toLowerCase()}`}>
  <div className={`cerebro-host-v0 ${coreClass}`} aria-hidden={view==='OPERATIVA'}>
   <CerebroConsoleShell/>
  </div>
  {view==='OPERATIVA'?<CerebroOperativeConsole/>:null}
  {view==='NEURAL'?<CerebroNeuralView/>:null}
  <nav className="cerebro-view-switch" aria-label="Cambiar vista de CEREBRO">
   <button type="button" className={view==='V0'?'is-active':''} onClick={()=>setView('V0')}>VISTA 0</button>
   <button type="button" className={view==='OPERATIVA'?'is-active':''} onClick={()=>setView('OPERATIVA')}>OPERATIVA</button>
   <button type="button" className={view==='NEURAL'?'is-active':''} onClick={()=>setView('NEURAL')}>NEURAL</button>
  </nav>
 </div>;
}
