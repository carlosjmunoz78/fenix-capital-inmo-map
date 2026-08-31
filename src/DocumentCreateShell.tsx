import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FileText,Upload} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';type Ctx={role?:string;display_name?:string};const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
export default function DocumentCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/documentacion/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[query,setQuery]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()}},[active]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])});return()=>{alive=false}},[active,logged]);
 if(!active||!ready||!logged)return null;const displayName=ctx?.display_name||ctx?.role||'Usuario';
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL}function search(){const q=query.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar')}function openUploader(){const button=document.querySelector<HTMLButtonElement>('[data-testid="context-evidence-open"]');if(button)button.click();else navigate('/documentacion?upload=1')}
 return <OperationalShellFrame className="document-create-root" theme={theme} navigation={nav.length?nav:fallbackNav} activeRoute="/documentacion" sidebarClassName="create-auth-nav" anaSubtitle="Subimos el archivo y lo dejamos vinculado a su contexto correcto." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar documento, expediente o cliente..." searchActionLabel="Buscar" onSearchAction={search} name={displayName} role={ctx?.role||''} initials={displayName.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-content">
  <section className="inmo-ana-hero" data-testid="document-create-ana"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO DOCUMENTO</span><h2>Subimos el documento al lugar correcto</h2><p>Abre el cargador, selecciona el archivo o audio y vincúlalo al expediente o contexto correspondiente. El documento queda dentro del almacenamiento autorizado.</p><div className="inmo-next"><button onClick={openUploader}><b>1</b><strong>Seleccionar archivo</strong><small>Documento / audio →</small></button><button onClick={()=>navigate('/documentacion')}><b>2</b><strong>Revisar biblioteca</strong><small>Volver a Documentación →</small></button></div></div></section>
  <div className="ops-title"><div><span className="ops-icon"><FileText size={20}/></span><div><h1>Nuevo documento</h1><p>Alta documental con el mismo entorno de navegación de toda la aplicación.</p></div></div><span className="ops-live ok">LISTO</span></div>
  <section className="ops-table-card" style={{padding:20,display:'grid',gap:14}}><div className="ops-table-head"><strong>Subir documento o audio</strong><span>Almacenamiento autorizado</span></div><p>Usa el cargador documental para seleccionar el archivo, revisar el contexto y completar la subida.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="primary" type="button" onClick={openUploader}><Upload size={16}/> Abrir cargador</button><button type="button" onClick={()=>navigate('/documentacion')}>Volver a Documentación</button></div></section>
 </OperationalShellFrame>
}
