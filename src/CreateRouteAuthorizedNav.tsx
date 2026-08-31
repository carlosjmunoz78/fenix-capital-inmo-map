import {useEffect,useMemo,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import OperationalSidebar from './OperationalSidebar';
import './create-route-nav.css';

type NavItem={label:string;route:string};
function normalizeNav(data:unknown):NavItem[]{if(!data||typeof data!=='object')return[];const items=(data as{items?:unknown[]}).items;if(!Array.isArray(items))return[];return items.map(x=>{if(typeof x==='string')return{label:x.replace(/^\//,'')||'Inicio',route:x};if(x&&typeof x==='object'){const o=x as Record<string,unknown>;if(typeof o.route==='string')return{label:typeof o.label==='string'&&o.label.trim()?o.label:o.route.replace(/^\//,''),route:o.route};}return null;}).filter((x):x is NavItem=>Boolean(x));}
const fallback:NavItem[]=[{label:'Inicio',route:'/inicio'}];
function routeGroup(path:string){
 if(path==='/expedientes/nuevo')return'/expedientes';
 if(path==='/contactos/nuevo')return'/contactos';
 if(path==='/inmobiliarias/nueva')return'/inmobiliarias';
 if(path==='/bancos/nuevo')return'/bancos';
 if(path==='/tareas/nueva')return'/agenda';
 if(path==='/documentacion/nuevo')return'/documentacion';
 if(path==='/notarias/nueva')return'/notarias';
 if(path==='/registros-propiedad/nuevo')return'/registros-propiedad';
 if(path==='/herencias/nuevo')return'/herencias';
 if(path==='/obras-nuevas/nuevo')return'/obras-nuevas';
 if(path==='/visitas/nueva')return'/visitas';
 if(/^\/inmobiliarias\/[^/]+\/contactos\/nuevo$/.test(path))return'/inmobiliarias';
 return'';
}

export default function CreateRouteAuthorizedNav(){
 const location=useLocation();
 const activeRoute=useMemo(()=>routeGroup(location.pathname),[location.pathname]);
 const[nav,setNav]=useState<NavItem[]>([]);
 useEffect(()=>{
  if(!activeRoute)return;
  let alive=true;
  document.documentElement.dataset.createNav='1';
  fetchAppApi<unknown>('/navigation').then(r=>{if(alive)setNav(r.status===200?normalizeNav(r.data):[])}).catch(()=>{if(alive)setNav([])});
  return()=>{alive=false;delete document.documentElement.dataset.createNav};
 },[activeRoute]);
 if(!activeRoute)return null;
 return <OperationalSidebar navigation={nav.length?nav:fallback} activeRoute={activeRoute} className="create-auth-nav"/>;
}
