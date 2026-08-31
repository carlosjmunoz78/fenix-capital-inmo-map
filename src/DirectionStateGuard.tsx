import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import type {DirectionLiveStatus} from './useDirectionLiveData';

type Host=Element|null;
const labels:Record<keyof DirectionLiveStatus,string>={expedientes:'Expedientes',firmas:'Firmas',tareas:'Agenda/Tareas'};

export default function DirectionStateGuard(){
 const location=useLocation();
 const[status,setStatus]=useState<DirectionLiveStatus>({expedientes:null,firmas:null,tareas:null});
 const[host,setHost]=useState<Host>(null);
 useEffect(()=>{
  if(location.pathname!=='/inicio'){setHost(null);return;}
  let stopped=false;
  const find=()=>{if(!stopped)setHost(document.querySelector('.dir-content'))};
  find();
  const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});
  const onState=(event:Event)=>setStatus((event as CustomEvent<DirectionLiveStatus>).detail);
  window.addEventListener('fenix-direction-live-status',onState as EventListener);
  return()=>{stopped=true;observer.disconnect();window.removeEventListener('fenix-direction-live-status',onState as EventListener)};
 },[location.pathname]);
 const state=useMemo(()=>{
  const entries=Object.entries(status) as Array<[keyof DirectionLiveStatus,number|null]>;
  if(entries.some(([,v])=>v===null))return{kind:'loading',text:'Cargando fuentes canónicas de Dirección…'};
  const denied=entries.filter(([,v])=>v===403).map(([k])=>labels[k]);
  if(denied.length)return{kind:'forbidden',text:`Acceso no autorizado en: ${denied.join(', ')}. Se mantienen ocultos esos datos.`};
  const failed=entries.filter(([,v])=>v!==200).map(([k])=>labels[k]);
  if(failed.length)return{kind:'error',text:`Fuente canónica no disponible: ${failed.join(', ')}. No se muestran datos inventados.`};
  return null;
 },[status]);
 if(location.pathname!=='/inicio'||!host||!state)return null;
 return createPortal(<div data-testid="direction-source-state" role="status" aria-live="polite" style={{margin:'0 0 10px',padding:'10px 12px',border:'1px solid var(--border,#e5e5e5)',borderRadius:10,background:'var(--panel,#fff)',fontSize:12,fontWeight:600}} data-state={state.kind}>{state.text}</div>,host);
}
