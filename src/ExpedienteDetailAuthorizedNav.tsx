import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './expediente-detail-nav.css';

type NavItem={label:string;route:string};
function normalizeNav(data:unknown):NavItem[]{
 if(!data||typeof data!=='object')return[];
 const items=(data as{items?:unknown[]}).items;
 if(!Array.isArray(items))return[];
 return items.map(x=>{
  if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};
  if(x&&typeof x==='object'){
   const o=x as Record<string,unknown>;
   if(typeof o.route==='string')return{label:typeof o.label==='string'&&o.label.trim()?o.label:o.route.replace(/^\//,''),route:o.route};
  }
  return null;
 }).filter((x):x is NavItem=>Boolean(x));
}
const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];

export default function ExpedienteDetailAuthorizedNav(){
 const location=useLocation(),navigate=useNavigate();
 const active=/^\/expedientes\/[^/]+$/.test(location.pathname)&&location.pathname!=='/expedientes/nuevo';
 const[nav,setNav]=useState<NavItem[]>([]);
 const[theme,setTheme]=useState(()=>sessionStorage.getItem('fenix-theme')||'light');
 useEffect(()=>{if(!active)return;let alive=true;fetchAppApi<unknown>('/navigation').then(r=>{if(alive)setNav(r.status===200?normalizeNav(r.data):[])}).catch(()=>{if(alive)setNav([])});return()=>{alive=false};},[active,location.pathname]);
 useEffect(()=>{if(!active)return;const sync=()=>setTheme(sessionStorage.getItem('fenix-theme')||'light');sync();window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[active]);
 if(!active)return null;
 const items=nav.length?nav:fallback;
 return <aside className="ops-side detail-auth-nav" data-theme={theme} aria-label="Navegación autorizada del expediente">
  <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{items.map(item=><button key={item.route} className={item.route==='/expedientes'?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
  <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Asistente de Fénix Capital</small></span></button>
 </aside>;
}
