import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

const DETAIL=/^\/expedientes\/[^/]+$/;

export default function ExpedienteLegacyChromeGuard(){
 const {pathname}=useLocation();
 const active=DETAIL.test(pathname)&&pathname!=='/expedientes/nuevo';
 useEffect(()=>{
  if(!active)return;
  const hide=()=>{
   document.querySelectorAll<HTMLElement>('.app-shell > .sidebar,.app-shell > .main').forEach(el=>{
    el.dataset.expedienteLegacySuppressed='true';
    el.style.setProperty('display','none','important');
    el.style.setProperty('visibility','hidden','important');
    el.style.setProperty('pointer-events','none','important');
   });
  };
  hide();
  const observer=new MutationObserver(hide);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{
   observer.disconnect();
   document.querySelectorAll<HTMLElement>('[data-expediente-legacy-suppressed="true"]').forEach(el=>{
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    delete el.dataset.expedienteLegacySuppressed;
   });
  };
 },[active,pathname]);
 return null;
}
