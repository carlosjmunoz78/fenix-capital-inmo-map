import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';

type NavPayload={items?:unknown[]};
type NavItem={route:string};

const ALWAYS_ALLOWED=new Set(['/','/inicio','/perfil','/ana']);
const ROOTS=['/expedientes','/contactos','/inmobiliarias','/tasaciones','/agenda','/firmas','/documentacion','/financieros','/visitadores','/economia','/informes','/buscar','/bancos','/notificaciones','/notarias','/visitas','/comunicaciones'];

function normalizePath(value:string){
 const bare=(value||'/').split('?')[0].split('#')[0];
 if(bare==='/')return '/';
 return `/${bare.replace(/^\/+|\/+$/g,'')}`;
}

function normalizeNav(data:unknown):NavItem[]{
 if(!data||typeof data!=='object')return[];
 const items=(data as NavPayload).items;
 if(!Array.isArray(items))return[];
 return items.map(item=>{
  if(typeof item==='string'&&item.startsWith('/'))return{route:normalizePath(item)};
  if(item&&typeof item==='object'){
   const route=(item as Record<string,unknown>).route;
   if(typeof route==='string'&&route.startsWith('/'))return{route:normalizePath(route)};
  }
  return null;
 }).filter((item):item is NavItem=>Boolean(item));
}

function canonicalRoot(pathname:string){
 const path=normalizePath(pathname);
 if(path==='/tareas'||path.startsWith('/tareas/'))return '/agenda';
 if(path==='/bancos/contactos'||path.startsWith('/bancos/contactos/'))return '/bancos';
 if(path==='/contactos-b2b'||path.startsWith('/contactos-b2b/'))return '/contactos';
 return ROOTS.find(root=>path===root||path.startsWith(`${root}/`))||null;
}

export function isRouteAuthorized(pathname:string,navRoutes:string[],navigationResolved=true){
 const path=normalizePath(pathname);
 if(ALWAYS_ALLOWED.has(path))return true;
 const root=canonicalRoot(path);
 if(!root||!navigationResolved)return false;
 const normalized=navRoutes.map(normalizePath);
 return normalized.some(route=>route===root||path===route||path.startsWith(`${route}/`));
}

export default function RouteAccessGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[logged,setLogged]=useState(false),[authReady,setAuthReady]=useState(false),[navRoutes,setNavRoutes]=useState<string[]>([]),[navigationResolved,setNavigationResolved]=useState(false);

 useEffect(()=>{
  let alive=true;
  supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setAuthReady(true)}});
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setLogged(Boolean(session));setAuthReady(true);if(!session){setNavRoutes([]);setNavigationResolved(false)}});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);

 useEffect(()=>{
  if(!authReady||!logged){setNavRoutes([]);setNavigationResolved(false);return;}
  let alive=true;
  setNavigationResolved(false);
  fetchAppApi<NavPayload>('/navigation').then(result=>{
   if(!alive)return;
   if(result.status===200){setNavRoutes(normalizeNav(result.data).map(item=>item.route));setNavigationResolved(true)}
   else{setNavRoutes([]);setNavigationResolved(true)}
  }).catch(()=>{if(alive){setNavRoutes([]);setNavigationResolved(true)}});
  return()=>{alive=false};
 },[authReady,logged]);

 const authorized=useMemo(()=>isRouteAuthorized(location.pathname,navRoutes,navigationResolved),[location.pathname,navRoutes,navigationResolved]);
 useEffect(()=>{
  if(!authReady||!logged||!navigationResolved)return;
  if(!authorized&&location.pathname!=='/inicio')navigate('/inicio',{replace:true});
 },[authReady,logged,navigationResolved,authorized,location.pathname,navigate]);

 return null;
}
