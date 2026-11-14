import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import CerebroConsoleShell from './CerebroConsoleShell';
import CerebroBrowserConsole from './CerebroBrowserConsole';
import CerebroJarvisWorkConsole from './CerebroJarvisWorkConsole';
import CerebroOperativeConsole from './CerebroOperativeConsole';
import CerebroOperativeCockpitV3Bridge from './CerebroOperativeCockpitV3Bridge';
import CerebroInterfaceBar,{type CerebroPrimaryView} from './CerebroInterfaceBar';
import CerebroNeuralView from './CerebroNeuralView';
import CerebroSpeechOutputGuard from './CerebroSpeechOutputGuard';
import JarvisVisibleLanguageGuard from './JarvisVisibleLanguageGuard';
import {fetchAppApi,supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
import './cerebro-console-host.css';
import './cerebro-route-isolation-v2.css';

type CerebroView=CerebroPrimaryView|'V0';
type OwnerAccess='checking'|'allowed'|'denied';
type SessionContext={actor_code?:string;role?:string};
const VIEW_STORAGE_KEY='cerebro_console_view_v2';

function initialView():CerebroView{
 if(typeof window==='undefined')return'JARVIS';
 const section=new URLSearchParams(window.location.search).get('section');
 if(section==='browser')return'NAVEGADOR';
 if(section==='operativa')return'OPERATIVA';
 if(section==='neuronal'||section==='neural')return'NEURONAL';
 if(section==='legacy-v0')return'V0';
 if(section==='jarvis'||section==='v0')return'JARVIS';
 return'JARVIS';
}

const SECTION_BY_VIEW:Record<CerebroPrimaryView,string>={JARVIS:'jarvis',OPERATIVA:'operativa',NEURONAL:'neuronal',NAVEGADOR:'browser'};

export default function CerebroConsoleHost(){
 const location=useLocation();
 const navigate=useNavigate();
 const isCerebroPath=location.pathname.replace(/\/+$/,'')==='/cerebro';
 const previewHost=typeof window!=='undefined'&&/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/.test(window.location.hostname);
 const params=new URLSearchParams(location.search);
 const visualPreview=params.get('visual_lab')==='cockpit-v3';
 // The owner-only V3 is the production Operativa default. Legacy remains reversible.
 const realProduction=typeof window!=='undefined'&&window.location.hostname==='app.fenixcapital.es';
 const legacyRequested=params.get('operativa_legacy')==='1';
 const showPremiumV3=(realProduction||visualPreview)&&!legacyRequested;
 const previewOwnerGate=Boolean(isCerebroPath&&previewHost&&visualPreview);
 const[view,setView]=useState<CerebroView>(initialView);
 const[ownerAccess,setOwnerAccess]=useState<OwnerAccess>('checking');
 const[previewLogged,setPreviewLogged]=useState(false);
 const changeView=(next:CerebroPrimaryView)=>{setView(next);navigate({pathname:'/cerebro',search:`?section=${SECTION_BY_VIEW[next]}${previewOwnerGate?'&visual_lab=cockpit-v3':''}`},{replace:true})};

 useEffect(()=>{if(!isCerebroPath)return;const next=initialView();setView(current=>current===next?current:next)},[isCerebroPath,location.search]);
 useEffect(()=>{if(!isCerebroPath)return;const ensure=()=>{if(document.documentElement.dataset.cerebroConsole!=='1')document.documentElement.dataset.cerebroConsole='1'};ensure();const observer=new MutationObserver(ensure);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-cerebro-console']});return()=>{observer.disconnect();delete document.documentElement.dataset.cerebroConsole}},[isCerebroPath]);
 useEffect(()=>{if(!isCerebroPath){setOwnerAccess('checking');return}let cancelled=false;const check=async()=>{
  const{data:{session}}=await supabase.auth.getSession();
  if(cancelled)return;
  if(!session){setPreviewLogged(false);setOwnerAccess(previewOwnerGate?'denied':'checking');return}
  if(previewOwnerGate){setPreviewLogged(true);setOwnerAccess('checking')}
  if(previewOwnerGate){
   let allowed=false;
   try{
    const response=await fetch('/api/cerebro-preview-owner',{method:'GET',cache:'no-store',
     headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'}});
    if(response.status===200){const result:unknown=await response.json();allowed=Boolean(result&&typeof result==='object'&&(result as {allowed?:boolean}).allowed===true)}
   }catch{/* fail closed */}
   if(!cancelled)setOwnerAccess(allowed?'allowed':'denied');
   return;
  }
  const{status,data}=await fetchAppApi<SessionContext>('/session/context');
  if(!cancelled)setOwnerAccess(status===200&&data?.actor_code==='CARLOS-ADMIN'?'allowed':'denied');
 };void check();const{data:{subscription}}=supabase.auth.onAuthStateChange(()=>{void check()});return()=>{cancelled=true;subscription.unsubscribe()}},[isCerebroPath,previewOwnerGate]);
 useEffect(()=>{if(!isCerebroPath)return;try{window.sessionStorage.setItem(VIEW_STORAGE_KEY,view)}catch{/* optional */}},[isCerebroPath,view]);

 if(!isCerebroPath)return <CerebroConsoleShell/>;
 if(previewOwnerGate&&!previewLogged)return null;
 if(previewOwnerGate&&ownerAccess!=='allowed')return <section role="status" style={{padding:'3rem',minHeight:'65vh',background:'#06131d',color:'#e9f6ff'}}>
   <h1>Operativa V3 · vista previa protegida</h1>
   <p>{ownerAccess==='checking'?'Comprobando acceso de propietario…':'No se ha podido verificar tu acceso de propietario. No se han cambiado tus permisos.'}</p>
  </section>;
 if(ownerAccess!=='allowed')return <><JarvisVisibleLanguageGuard/><CerebroConsoleShell/></>;
 if(view==='V0')return <div className="cerebro-console-host view-v0"><JarvisVisibleLanguageGuard/><CerebroSpeechOutputGuard/><div className="cerebro-host-v0 is-visible"><CerebroConsoleShell/></div></div>;

 const primaryView=view as CerebroPrimaryView;
 // Owner authentication is unchanged; V3 and classic share the canonical chat/voice hook.

 return <div className={`cerebro-console-host view-${primaryView.toLowerCase()}`}>
  {primaryView==='JARVIS'?<JarvisVisibleLanguageGuard/>:null}
  <CerebroSpeechOutputGuard/>
  <CerebroInterfaceBar view={primaryView} onViewChange={changeView}/>
  <div className="cerebro-interface-stage">
   {primaryView==='JARVIS'?<div className="cerebro-work-mount cerebro-host-v0"><CerebroJarvisWorkConsole surface="JARVIS"/></div>:null}
   {primaryView==='OPERATIVA'?<div className="cerebro-work-mount cerebro-host-v0">{showPremiumV3?<CerebroOperativeCockpitV3Bridge/>:<><CerebroOperativeConsole/>{realProduction?<div style={{padding:'12px 20px',textAlign:'center'}}><a href="/cerebro?section=operativa" style={{color:'#8bdcf8'}}>Abrir Operativa Premium V3</a></div>:null}</>}</div>:null}
   {primaryView==='NEURONAL'?<CerebroNeuralView/>:null}
   {primaryView==='NAVEGADOR'?<CerebroBrowserConsole/>:null}
  </div>
 </div>;
}
