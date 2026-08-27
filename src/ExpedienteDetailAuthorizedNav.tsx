import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import './operational.css';
import './expediente-detail-nav.css';

const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function ExpedienteDetailAuthorizedNav(){
 const location=useLocation(),navigate=useNavigate();
 const active=/^\/expedientes\/[^/]+$/.test(location.pathname)&&location.pathname!=='/expedientes/nuevo';
 const[nav,setNav]=useState<NavItem[]>([]);
 const[theme,setTheme]=useState(()=>sessionStorage.getItem('fenix-theme')||'light');
 useEffect(()=>{if(!active)return;let alive=true;fetchAppApi<unknown>('/navigation').then(r=>{if(alive)setNav(r.status===200?normalizeNavigation(r.data):[])}).catch(()=>{if(alive)setNav([])});return()=>{alive=false};},[active,location.pathname]);
 useEffect(()=>{if(!active)return;const sync=()=>setTheme(sessionStorage.getItem('fenix-theme')||'light');sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[active]);
 if(!active)return null;
 const items=nav.length?nav:fallback;
 return <aside className="ops-side detail-auth-nav" data-theme={theme} aria-label="Navegación autorizada del expediente">
  <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{items.map(item=><button key={item.route} className={item.route==='/expedientes'?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
  <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Asistente de Fénix Capital</small></span></button>
 </aside>;
}
