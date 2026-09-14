import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchNotionRuntime} from './notionRuntime';

type Row={cliente_alias?:string;cliente?:string;nombre_cliente?:string;expediente?:string;expediente_code?:string};
function humanName(row:Row|null){return String(row?.cliente_alias||row?.cliente||row?.nombre_cliente||row?.expediente||'').trim();}

export default function ExpedienteHumanAliasGuard(){
 const {pathname}=useLocation();
 useEffect(()=>{
  const match=pathname.match(/^\/expedientes\/([^/]+)$/);const code=match?.[1]?decodeURIComponent(match[1]):'';
  if(!code||code==='nuevo')return;
  let alive=true;
  void fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`).then(r=>{
   if(!alive||r.status!==200)return;
   const row=(r.data?.expediente??r.data?.item??null) as Row|null;const alias=humanName(row);if(!alias)return;
   const apply=()=>{const h1=document.querySelector<HTMLElement>('.detail-exp-root .detail-master-title h1');if(h1)h1.textContent=alias;};
   apply();queueMicrotask(apply);
  });
  return()=>{alive=false};
 },[pathname]);
 return null;
}
