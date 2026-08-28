import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import {anaAvatar,fenixLogo} from './assets/visualAssets';
import './operational.css';
import './create-route-nav.css';

type NavItem={label:string;route:string};
function normalizeNav(data:unknown):NavItem[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;if(!Array.isArray(items))return[];return items.map(x=>{if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};if(x&&typeof x==='object'){const o=x as Record<string,unknown>;if(typeof o.route==='string')return{label:typeof o.label==='string'&&o.label.trim()?o.label:o.route.replace(/^\//,''),route:o.route};}return null;}).filter((x):x is NavItem=>Boolean(x));}
const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function routeGroup(path:string){if(path==='/expedientes/nuevo')return'/expedientes';if(path==='/contactos/nuevo')return'/contactos';if(path==='/tareas/nueva')return'/agenda';if(/^\/inmobiliarias\/[^/]+\/contactos\/nuevo$/.test(path))return'/inmobiliarias';return'';}

export default function CreateRouteAuthorizedNav(){
 const location=useLocation(),navigate=useNavigate();const activeRoute=useMemo(()=>routeGroup(location.pathname),[location.pathname]);const[nav,setNav]=useState<NavItem[]>([]);
 useEffect(()=>{if(!activeRoute)return;let alive=true;document.documentElement.dataset.createNav='1';fetchAppApi<unknown>('/navigation').then(r=>{if(alive)setNav(r.status===200?normalizeNav(r.data):[])}).catch(()=>{if(alive)setNav([])});return()=>{alive=false;delete document.documentElement.dataset.createNav};},[activeRoute]);
 if(!activeRoute)return null;const items=nav.length?nav:fallback;
 return <aside className="ops-side create-auth-nav" aria-label="Navegación autorizada de alta">
  <button className="ops-brand" onClick={()=>navigate('/inicio')}><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></button>
  <nav>{items.map(item=><button key={item.route} className={item.route===activeRoute?'active':''} onClick={()=>navigate(item.route)}>{item.label}</button>)}</nav>
  <button className="ops-ana" onClick={()=>navigate('/ana')}><img src={anaAvatar} alt="Ana"/><span><strong>Ana está contigo</strong><small>Asistente de Fénix Capital</small></span></button>
 </aside>;
}
