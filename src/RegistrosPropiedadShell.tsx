import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {Building2,LogOut,Moon,Search,Sun} from 'lucide-react';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,orderAuthorizedNavigation,type NavItem} from './masterNavigation';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './notarias-polish.css';

type Theme='light'|'dark';
type Ctx={role?:string};
const ROUTE='/registros-propiedad';
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function RegistrosPropiedadShell(){
 const location=useLocation(),navigate=useNavigate(),active=location.pathname===ROUTE;
 const[ready,setReady]=useState(false),[logged,setLogged]=useState(false),[theme,setTheme]=useState<Theme>(()=>(sessionStorage.getItem('fenix-theme') as Theme)||'light'),[ctx,setCtx]=useState<Ctx|null>(null),[nav,setNav]=useState<NavItem[]>([]),[authorized,setAuthorized]=useState<boolean|null>(null),[q,setQ]=useState('');

 useEffect(()=>{if(!active)return;let alive=true;supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setReady(true)}});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setLogged(Boolean(s));setReady(true)});return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(active){document.documentElement.dataset.theme=theme;sessionStorage.setItem('fenix-theme',theme)}},[active,theme]);
 useEffect(()=>{if(!active||!logged)return;let alive=true;Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([c,n])=>{if(!alive)return;setCtx(c.status===200?c.data:null);const parsed=n.status===200?orderAuthorizedNavigation(normalizeNavigation(n.data)):[];setNav(parsed);const canUse=parsed.some(i=>i.route===ROUTE);setAuthorized(canUse);if(!canUse)navigate('/inicio',{replace:true});}).catch(()=>{if(alive){setAuthorized(false);navigate('/inicio',{replace:true});}});return()=>{alive=false};},[active,logged,navigate]);

 const effectiveNav=nav.length?nav:fallbackNav;
 if(!active||!ready||!logged||authorized!==true)return null;
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}

 return <div className="ops-root notarias-root" data-theme={theme}>
  <aside className="ops-side">
   <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
   <nav>{effectiveNav.map(i=><button key={i.route} className={i.route===ROUTE?'active':''} onClick={()=>navigate(i.route)}>{i.label}</button>)}</nav>
   <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Te ayudo con registros y documentación.</small></span></button>
  </aside>
  <main className="ops-main">
   <header className="ops-top">
    <div className="ops-search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar registro, localidad..."/></div>
    <div className="ops-top-actions"><button onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{ctx?.role||'Usuario'}</strong></div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div>
   </header>
   <section className="ops-content notarias-content">
    <div className="ops-title"><div><span className="ops-icon"><Building2 size={20}/></span><div><small>MÓDULO PENDIENTE</small><h1>Registros de la Propiedad</h1><p>La navegación ya respeta el contrato global autorizado. El módulo funcional completo se construirá en su fase final.</p></div></div></div>
    <div className="ops-empty" data-testid="property-registry-placeholder"><strong>Módulo todavía no desarrollado</strong><span>Listado, alta, ficha editable y personal asociado se incorporarán al final, siguiendo el patrón de Inmobiliarias y sin inventar datos.</span></div>
   </section>
  </main>
 </div>;
}
