import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';

const SUCCESS_MESSAGES=[
 'Datos de la persona guardados y auditados.',
 'Persona añadida al expediente y auditada.',
];

export default function ExpedienteAdviceRefreshBridge(){
 const location=useLocation();
 const reloading=useRef(false);
 const active=/^\/expedientes\/[^/]+$/.test(location.pathname);
 useEffect(()=>{
  if(!active)return;
  const check=()=>{
   if(reloading.current)return;
   const messages=Array.from(document.querySelectorAll('.exp-people .ops-message'));
   const confirmed=messages.some(node=>SUCCESS_MESSAGES.some(text=>node.textContent?.includes(text)));
   if(!confirmed)return;
   reloading.current=true;
   window.setTimeout(()=>window.location.reload(),120);
  };
  check();
  const observer=new MutationObserver(check);
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  return()=>observer.disconnect();
 },[active,location.pathname]);
 return null;
}
