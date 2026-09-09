import {useEffect,useState} from 'react';
import {LogOut,Moon,Search,Sun} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import './operational.css';
import './expediente-detail-nav.css';

const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

type SessionContext={display_name?:string;name?:string;role?:string};

export default function ExpedienteDetailAuthorizedNav(){
 const navigate=useNavigate();
 const[nav,setNav]=useState<NavItem[]>([]);
 const[theme,setTheme]=useState(()=>sessionStorage.getItem('fenix-theme')||'light');
 const[query,setQuery]=useState('');
 const[context,setContext]=useState<SessionContext>({});
 useEffect(()=>{let alive=true;Promise.all([fetchAppApi<unknown>('/navigation'),fetchAppApi<SessionContext>('/session/context')]).then(([n,c])=>{if(!alive)return;setNav(n.status===200?normalizeNavigation(n.data):[]);setContext(c.status===200?(c.data||{}):{});}).catch(()=>{if(alive){setNav([]);setContext({});}});return()=>{alive=false};},[]);
 useEffect(()=>{const sync=()=>setTheme(sessionStorage.getItem('fenix-theme')||'light');sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 const items=nav.length?nav:fallback;
 function toggleTheme(){const next=theme==='light'?'dark':'light';setTheme(next);sessionStorage.setItem('fenix-theme',next);document.documentElement.dataset.theme=next;}
 function submitSearch(){const q=query.trim();navigate(q?`/buscar?q=${encodeURIComponent(q)}`:'/buscar');}
 async function logout(){await supabase.auth.signOut();window.location.href=import.meta.env.BASE_URL;}
 const displayName=context.display_name||context.name||context.role||'Usuario';
 return <>
  <OperationalSidebar navigation={items} activeRoute="/expedientes" anaSubtitle="Asistente de Fénix Capital" anaRoute="/ana" className="detail-auth-nav" theme={theme} ariaLabel="Navegación autorizada del expediente"/>
  <header className="ops-top">
   <div className="ops-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submitSearch();}} placeholder="Buscar expediente, cliente, banco, inmobiliaria..."/><button onClick={submitSearch}>Buscar</button></div>
   <div className="ops-top-actions"><button onClick={toggleTheme} aria-label="Cambiar tema">{theme==='light'?<Moon size={17}/>:<Sun size={17}/>} {theme==='light'?'Oscuro':'Claro'}</button><div className="ops-profile"><strong>{displayName}</strong>{context.role&&context.role!==displayName?<small>{context.role}</small>:null}</div><button onClick={logout} aria-label="Cerrar sesión"><LogOut size={17}/></button></div>
  </header>
 </>;
}
