import {useEffect,useMemo,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {supabase} from './supabase';

const ALWAYS_ALLOWED=new Set(['/','/inicio','/perfil','/ana']);
const KNOWN_ROOTS=['/expedientes','/contactos','/contactos-b2b','/inmobiliarias','/tasaciones','/agenda','/tareas','/firmas','/documentacion','/financieros','/visitadores','/economia','/informes','/buscar','/bancos','/notificaciones','/notarias','/registros-propiedad','/visitas','/comunicaciones'];

function normalizePath(value:string){
 const bare=(value||'/').split('?')[0].split('#')[0];
 if(bare==='/')return '/';
 return `/${bare.replace(/^\/+|\/+$/g,'')}`;
}

export function isKnownRoute(pathname:string){
 const path=normalizePath(pathname);
 if(ALWAYS_ALLOWED.has(path))return true;
 return KNOWN_ROOTS.some(root=>path===root||path.startsWith(`${root}/`));
}

export default function RouteAccessGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[logged,setLogged]=useState(false),[authReady,setAuthReady]=useState(false);

 useEffect(()=>{
  let alive=true;
  supabase.auth.getSession().then(({data})=>{if(alive){setLogged(Boolean(data.session));setAuthReady(true)}});
  const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setLogged(Boolean(session));setAuthReady(true)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);

 const known=useMemo(()=>isKnownRoute(location.pathname),[location.pathname]);
 useEffect(()=>{
  if(!authReady||!logged)return;
  if(!known&&location.pathname!=='/inicio')navigate('/inicio',{replace:true});
 },[authReady,logged,known,location.pathname,navigate]);

 return null;
}
