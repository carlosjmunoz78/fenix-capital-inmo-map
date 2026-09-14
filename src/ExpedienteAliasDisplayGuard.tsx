import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';

type ExpRow={cliente_alias?:string;cliente?:string;nombre_cliente?:string;expediente?:string};
export default function ExpedienteAliasDisplayGuard(){
 const {pathname}=useLocation();
 useEffect(()=>{
  const m=pathname.match(/^\/expedientes\/([^/]+)$/);const code=m?.[1]?decodeURIComponent(m[1]):'';
  if(!code||code==='nuevo')return;let alive=true;
  fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`).then(r=>{
   if(!alive||r.status!==200)return;const row=(r.data?.expediente??r.data?.item??null) as ExpRow|null;
   const alias=String(row?.cliente_alias||row?.cliente||row?.nombre_cliente||row?.expediente||'').trim();if(!alias)return;
   const title=document.querySelector<HTMLElement>('.detail-exp-root .detail-master-title h1');if(title)title.textContent=alias;
  });
  return()=>{alive=false};
 },[pathname]);
 return null;
}
