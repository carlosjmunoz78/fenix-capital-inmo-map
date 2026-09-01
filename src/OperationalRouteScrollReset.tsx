import {useEffect,useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';

function ownsOperationalChrome(pathname:string){
 const exact=new Set([
  '/perfil',
  '/expedientes','/expedientes/nuevo',
  '/contactos','/contactos/nuevo',
  '/documentacion','/documentacion/nuevo',
  '/inmobiliarias','/inmobiliarias/nueva',
  '/bancos','/bancos/nuevo','/bancos/contactos',
  '/tasaciones','/agenda','/firmas','/firmas/nuevo','/firmas/nueva',
  '/financieros','/visitadores','/economia','/informes','/buscar',
  '/notificaciones','/notarias','/registros-propiedad','/visitas','/comunicaciones'
 ]);
 if(exact.has(pathname))return true;
 return /^\/expedientes\/[^/]+$/.test(pathname)
  || /^\/contactos\/[^/]+$/.test(pathname)
  || /^\/inmobiliarias\/[^/]+$/.test(pathname)
  || /^\/inmobiliarias\/[^/]+\/contactos\/(?:nuevo|[^/]+)$/.test(pathname)
  || /^\/bancos\/contactos\/[^/]+$/.test(pathname)
  || /^\/bancos\/[^/]+$/.test(pathname)
  || /^\/tareas\/(?:nueva|[^/]+)$/.test(pathname)
  || /^\/financieros\/[^/]+$/.test(pathname)
  || /^\/visitadores\/[^/]+$/.test(pathname)
  || /^\/notarias\/(?:nueva|[^/]+)$/.test(pathname)
  || /^\/registros-propiedad\/(?:nuevo|[^/]+)$/.test(pathname)
  || /^\/visitas\/(?:nueva|[^/]+)$/.test(pathname)
  || /^\/documentacion\/[^/]+$/.test(pathname);
}

export default function OperationalRouteScrollReset(){
 const {pathname,search}=useLocation();
 useLayoutEffect(()=>{
  const operational=ownsOperationalChrome(pathname);
  if(operational)document.documentElement.dataset.operationalChrome='1';
  else delete document.documentElement.dataset.operationalChrome;
  const legacy=document.querySelectorAll<HTMLElement>('.app-shell > .sidebar,.app-shell > .main');
  legacy.forEach(node=>{
   if(operational){node.setAttribute('aria-hidden','true');node.inert=true;}
   else{node.removeAttribute('aria-hidden');node.inert=false;}
  });
  return()=>{delete document.documentElement.dataset.operationalChrome;};
 },[pathname]);
 useEffect(()=>{
  const reset=()=>{
   const main=document.querySelector<HTMLElement>('.ops-root .ops-main');
   if(main)main.scrollTop=0;
   window.scrollTo({top:0,left:0,behavior:'auto'});
  };
  reset();
  const frame=requestAnimationFrame(reset);
  const timer=window.setTimeout(reset,0);
  return()=>{cancelAnimationFrame(frame);window.clearTimeout(timer)};
 },[pathname,search]);
 return null;
}
