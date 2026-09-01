import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FileCheck2,FolderOpen} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';
type Ctx={role?:string};
const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function FirmaCreateShell(){
 const location=useLocation(),navigate=useNavigate(),active=location.pathname==='/firmas/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[query,setQuery]=useState('');
 const[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);localStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])}).catch(()=>{if(alive){setCtx(null);setNav([])}});return()=>{alive=false};},[active,logged]);
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function search(){const q=query.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
 const role=ctx?.role||'Usuario';
 return <OperationalShellFrame className="inmo-root inmo-create-root" theme={theme} navigation={nav.length?nav:fallback} activeRoute="/firmas" anaSubtitle="Te ayudo a preparar la firma desde su expediente, sin crear datos parciales." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria..." searchActionLabel="Buscar" onSearchAction={search} name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-content">
  <div className="ops-title"><div><span className="ops-icon"><FileCheck2 size={20}/></span><div><h1>Nueva firma</h1><p>Preparación de firma vinculada al expediente operativo.</p></div></div></div>
  <section className="inmo-ana-hero" data-testid="firma-create-ana-canonical">
   <div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div>
   <div className="inmo-ana-body"><span>ANA · NUEVA FIRMA</span><h2>Preparamos la firma desde el expediente correcto</h2><p>La firma debe conservar su relación con el expediente, la FEIN, el banco y la notaría. Por eso no creo una ficha aislada ni invento datos que todavía no existan.</p><div className="inmo-next"><button type="button" onClick={()=>navigate('/expedientes')}><b>1</b><strong>Qué necesita atención</strong><small>Seleccionar el expediente que va a firmar →</small></button><button type="button" onClick={()=>navigate('/firmas')}><b>2</b><strong>Qué estoy comprobando</strong><small>FEIN, fecha, banco, notaría y documentación →</small></button><button type="button" onClick={()=>navigate('/expedientes')}><b>3</b><strong>Siguiente paso</strong><small>Abrir el expediente y continuar su fase de firma →</small></button></div></div>
   <article className="inmo-correct"><span>CONTROL ANTES DE CREAR</span><h3>Sin firmas huérfanas</h3><p>Producción permite consultar, programar, confirmar y cerrar una firma existente. El alta directa queda protegida hasta disponer de un contrato canónico específico.</p><button type="button" className="primary" onClick={()=>navigate('/expedientes')}><FolderOpen size={16}/> Abrir expedientes</button><button type="button" onClick={()=>navigate('/firmas')}>Volver a Firmas</button></article>
  </section>
 </OperationalShellFrame>;
}
