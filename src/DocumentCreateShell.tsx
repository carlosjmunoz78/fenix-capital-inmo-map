import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {FileText,FolderOpen} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';
type Ctx={role?:string};
const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function DocumentCreateShell(){
 const location=useLocation(),navigate=useNavigate(),active=location.pathname==='/documentacion/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[query,setQuery]=useState('');
 const[theme,setTheme]=useState<Theme>(()=>((sessionStorage.getItem('fenix-theme')||localStorage.getItem('fenix-theme')) as Theme)||'light');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active)return;document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme);localStorage.setItem('fenix-theme',theme);},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])}).catch(()=>{if(alive){setCtx(null);setNav([])}});return()=>{alive=false};},[active,logged]);
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 function search(){const q=query.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
 const role=ctx?.role||'Usuario';
 return <OperationalShellFrame className="inmo-root doc-create-root" theme={theme} navigation={nav.length?nav:fallback} activeRoute="/documentacion" anaSubtitle="Te ayudo a guardar cada documento en el contexto correcto." query={query} onQueryChange={setQuery} searchPlaceholder="Buscar expediente, cliente, banco, inmobiliaria..." searchActionLabel="Buscar" onSearchAction={search} name={role} role="" initials={role.slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout} contentClassName="inmo-content">
  <div className="ops-title"><div><span className="ops-icon"><FileText size={20}/></span><div><h1>Nuevo documento</h1><p>Alta documental vinculada al registro operativo que corresponda.</p></div></div></div>
  <section className="inmo-ana-hero" data-testid="document-create-ana-canonical"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO DOCUMENTO</span><h2>Primero elegimos dónde pertenece el documento</h2><p>Para mantener trazabilidad, un documento operativo debe quedar vinculado a su expediente, contacto o firma. No creo documentos huérfanos ni invento relaciones.</p><div className="inmo-next"><button type="button" onClick={()=>navigate('/expedientes')}><b>1</b><strong>Expediente</strong><small>Abrir el expediente y subirlo allí →</small></button><button type="button" onClick={()=>navigate('/contactos')}><b>2</b><strong>Contacto</strong><small>Abrir la ficha del contacto →</small></button><button type="button" onClick={()=>navigate('/firmas')}><b>3</b><strong>Firma</strong><small>Abrir la firma correspondiente →</small></button></div></div></section>
  <section className="ops-message" data-testid="document-create-safety"><strong>Documento general</strong><p>La biblioteca general permanece en modo consulta hasta disponer de un contrato productivo específico para altas sin contexto. Para documentación operativa, abre primero la ficha a la que pertenece y usa allí la subida contextual.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" className="primary" onClick={()=>navigate('/documentacion')}><FolderOpen size={16}/> Volver a Documentación</button><button type="button" onClick={()=>navigate('/ana?mode=help&resource=documentacion')}>Revisar con Ana</button></div></section>
 </OperationalShellFrame>;
}
