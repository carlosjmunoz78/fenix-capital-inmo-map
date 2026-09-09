import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';

const TAB_ROUTES:Record<string,string>={
 'Documentación':'documentacion',
 'Análisis':'analisis',
 'Banco':'banco',
 'Tareas':'tareas'
};

export default function ExpedienteTabInterceptor(){
 const {pathname}=useLocation();
 const navigate=useNavigate();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 useEffect(()=>{
  if(!code)return;
  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null;
   const button=target?.closest<HTMLButtonElement>('.detail-tabs button');
   if(!button)return;
   const label=(button.textContent||'').trim();
   const tab=TAB_ROUTES[label];
   if(!tab)return;
   event.preventDefault();
   event.stopPropagation();
   navigate(`/expedientes/${encodeURIComponent(code)}/${tab}`);
  };
  document.addEventListener('click',onClick,true);
  return()=>document.removeEventListener('click',onClick,true);
 },[code,navigate]);
 return null;
}
