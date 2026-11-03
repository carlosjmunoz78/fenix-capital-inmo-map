import {useEffect,useState} from 'react';
import {Code2,ExternalLink,GitBranch,Globe2,MonitorUp,RefreshCw,ShieldCheck} from 'lucide-react';
import JarvisRepoWorkbench from './JarvisRepoWorkbench';
import JarvisGitAdvancedPanel from './JarvisGitAdvancedPanel';
import {fetchBrowserInteractiveApi,type BrowserCompanyV3,type BrowserSessionV3} from './cerebroBrowserInteractive';
import './jarvis-work-tools.css';
import './jarvis-final-fixes.css';

type ToolTab='workbench'|'git'|'browser';
type CompaniesResponse={ok:boolean;companies?:BrowserCompanyV3[];error?:string};
type StatusResponse={ok:boolean;session?:BrowserSessionV3|null;error?:string};

function cleanState(value:string|undefined){
 const raw=String(value||'SIN SESIÓN').trim().toUpperCase();
 if(raw==='CEREBRO_CONTROL')return'JARVIS EN CONTROL';
 if(raw==='HUMAN_CONTROL')return'HUMANO EN CONTROL';
 if(raw==='HUMAN_REQUIRED')return'INTERVENCIÓN HUMANA';
 return raw.replaceAll('_',' ').replace(/CEREBRO/g,'JARVIS');
}

function BrowserHandoff(){
 const[company,setCompany]=useState('');
 const[session,setSession]=useState<BrowserSessionV3|null>(null);
 const[error,setError]=useState('');
 async function refresh(){
  setError('');
  const companies=await fetchBrowserInteractiveApi<CompaniesResponse>('/owner/companies',{});
  const first=companies.data?.companies?.find(item=>item.company_id==='fenix')||companies.data?.companies?.[0];
  if(companies.status!==200||!companies.data?.ok||!first){setError(companies.data?.error||'No se pudo verificar el navegador conectado.');return}
  setCompany(first.company_id);
  const status=await fetchBrowserInteractiveApi<StatusResponse>('/owner/status',{company_id:first.company_id});
  if(status.status!==200||!status.data?.ok){setError(status.data?.error||'No se pudo leer el estado del navegador.');return}
  setSession(status.data.session||null);
 }
 useEffect(()=>{void refresh();const id=window.setInterval(()=>void refresh(),5000);return()=>window.clearInterval(id)},[]);
 function openBrowser(){window.location.assign('/cerebro?section=browser&from=jarvis-work');}
 return <section className="jarvis-browser-handoff" aria-label="Navegador y control humano">
  <header><div><small>NAVEGADOR / CONTROL</small><strong>{session?.current_title||'Superficie interactiva'}</strong></div><button type="button" onClick={()=>void refresh()} title="Actualizar"><RefreshCw size={15}/></button></header>
  <div className="jarvis-browser-state"><span className={session?.worker_alive?'is-live':'is-idle'}><i/>{session?.worker_alive?'Conectado':'Sin worker activo'}</span><b>{cleanState(session?.state)}</b></div>
  <dl><div><dt>Empresa</dt><dd>{company||'—'}</dd></div><div><dt>Control</dt><dd>{cleanState(session?.control_owner)}</dd></div><div><dt>URL</dt><dd>{session?.current_url||'—'}</dd></div><div><dt>Intervención</dt><dd>{session?.human_required?'Requerida':'No requerida'}</dd></div></dl>
  {error?<p>{error}</p>:null}
  <button type="button" className="jarvis-browser-open" onClick={openBrowser}><MonitorUp size={17}/><span><strong>Abrir navegador interactivo</strong><small>Tomar control · devolver control · parada segura</small></span><ExternalLink size={15}/></button>
  <footer><ShieldCheck size={13}/> El handoff reutiliza Browser 1 existente. No crea otra sesión ni otra infraestructura.</footer>
 </section>;
}

export default function JarvisWorkTools(){
 const[tab,setTab]=useState<ToolTab>('workbench');
 return <section className="jarvis-work-tools" aria-label="Herramientas de trabajo">
  <nav className="jarvis-work-tools-tabs" aria-label="Herramientas">
   <button type="button" className={tab==='workbench'?'is-active':''} onClick={()=>setTab('workbench')}><Code2 size={14}/> Código</button>
   <button type="button" className={tab==='git'?'is-active':''} onClick={()=>setTab('git')}><GitBranch size={14}/> Git</button>
   <button type="button" className={tab==='browser'?'is-active':''} onClick={()=>setTab('browser')}><Globe2 size={14}/> Navegador</button>
  </nav>
  <div className="jarvis-work-tools-body">{tab==='workbench'?<JarvisRepoWorkbench/>:tab==='git'?<JarvisGitAdvancedPanel/>:<BrowserHandoff/>}</div>
 </section>;
}
