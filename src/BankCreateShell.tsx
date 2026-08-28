import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Landmark} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalShellFrame from './OperationalShellFrame';
import {anaVertical} from './assets/visualAssets';
import './operational.css';
import './inmobiliarias-polish.css';

type Theme='light'|'dark';type Ctx={role?:string};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];
export default function BankCreateShell(){
 const location=useLocation(),navigate=useNavigate();const active=location.pathname==='/bancos/nuevo';
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[nombre,setNombre]=useState(''),[perfil,setPerfil]=useState(''),[cien,setCien]=useState('No informado'),[doble,setDoble]=useState('No informado'),[globalQuery,setGlobalQuery]=useState('');
 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()}},[active]);
 useEffect(()=>{if(active){document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)}},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);setNav(n.status===200?normalizeNavigation(n.data):[])});return()=>{alive=false}},[active,logged]);
 if(!active||!ready||!logged)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL}function globalSearch(){const q=globalQuery.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar')}
 return <OperationalShellFrame theme={theme} navigation={nav.length?nav:fallbackNav} activeRoute="/bancos" query={globalQuery} onQueryChange={setGlobalQuery} searchPlaceholder="Buscar en toda la app..." searchActionLabel="Buscar" onSearchAction={globalSearch} name={ctx?.role||'Usuario'} role="" initials={(ctx?.role||'U').slice(0,2).toUpperCase()} onToggleTheme={()=>setTheme(theme==='light'?'dark':'light')} onLogout={logout}>
  <button className="secondary-action" onClick={()=>navigate('/bancos')}><ArrowLeft size={15}/> Volver a Bancos</button>
  <section className="inmo-ana-hero"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO BANCO</span><h2>Vamos a preparar la ficha correctamente</h2><p>Primero registramos únicamente lo que sabemos. Lo que todavía no conste queda como no informado.</p><div className="inmo-next"><button onClick={()=>document.getElementById('nueva-ficha-banco')?.scrollIntoView({behavior:'smooth'})}><b>1</b><strong>Completar ficha</strong><small>Ir a datos →</small></button><button onClick={()=>navigate('/bancos/contactos')}><b>2</b><strong>Revisar contactos</strong><small>Abrir contactos →</small></button><button onClick={()=>navigate('/ana?mode=help&resource=banco&intent=nuevo')}><b>3</b><strong>Ayúdame</strong><small>Preparar con Ana →</small></button></div></div></section>
  <div className="ops-title"><div><span className="ops-icon"><Landmark size={20}/></span><div><h1>Nuevo banco</h1><p>Nueva ficha bancaria.</p></div></div></div>
  <section id="nueva-ficha-banco" className="ops-table-card" style={{padding:20,display:'grid',gap:12}}><label>Nombre del banco<input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Entidad"/></label><label>Perfil principal<select value={perfil} onChange={e=>setPerfil(e.target.value)}><option value="">Sin clasificar</option><option>General</option><option>Jóvenes</option><option>Funcionarios</option><option>Autónomos</option><option>Segunda vivienda</option><option>Operaciones especiales</option></select></label><label>Financiación 100%<select value={cien} onChange={e=>setCien(e.target.value)}><option>No informado</option><option>Sí</option><option>No</option></select></label><label>Doble garantía<select value={doble} onChange={e=>setDoble(e.target.value)}><option>No informado</option><option>Sí</option><option>No</option></select></label><button className="primary" disabled={!nombre.trim()} onClick={()=>navigate(`/ana?mode=do&resource=banco&intent=nuevo&nombre=${encodeURIComponent(nombre.trim())}`)}>Preparar alta con Ana</button></section>
 </OperationalShellFrame>
}
