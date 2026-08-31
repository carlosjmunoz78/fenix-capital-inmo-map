import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import type {DirectionLiveSnapshot} from './useDirectionLiveData';

function norm(value:string){return value.replace(/\s+/g,' ').trim().toUpperCase();}

export default function DirectionLiveOperationsGuard(){
 const location=useLocation();
 const navigate=useNavigate();
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let stopped=false;
  let observer:MutationObserver|null=null;
  let live:DirectionLiveSnapshot|null=null;
  const patch=()=>{
   if(stopped||!live)return;
   const root=document.querySelector('.dir-shell');
   if(!root)return;
   const kpis=Array.from(root.querySelectorAll<HTMLButtonElement>('.dir-kpi'));
   for(const button of kpis){
    const label=norm(button.querySelector('span')?.textContent||button.textContent||'');
    button.dataset.kpiExactRoute='';
    button.disabled=false;
    if(label.includes('EXPEDIENTES EN CURSO'))button.dataset.kpiExactRoute='/expedientes?estado=en-curso';
    else if(label.includes('FIRMAS ESTE MES'))button.dataset.kpiExactRoute='/firmas?firma=mes-actual&estado=prevista';
    else if(label.includes('FIRMADOS ESTE MES'))button.dataset.kpiExactRoute='/firmas?firma=mes-actual&estado=firmada';
    else if(label.includes('EN RIESGO')){
      if(live.riskSupported)button.dataset.kpiExactRoute='/expedientes?riesgo=si';
      else{
       button.disabled=true;
       const value=button.querySelector('strong');if(value)value.textContent='—';
       const note=button.querySelector('small');if(note)note.textContent='Riesgo no expuesto por la fuente canónica';
      }
    }else if(label.includes('HONORARIOS PENDIENTES')){
      button.disabled=true;
      button.removeAttribute('data-kpi-exact-route');
      const note=button.querySelector('small');if(note)note.textContent='Sin fuente económica suficiente';
    }
   }
   const hero=root.querySelector('.dir-priority-copy');
   const summary=hero?.querySelector('.dir-empty-compact');
   const first=live.priorities[0];
   if(summary&&first){
    const strong=summary.querySelector('strong');if(strong)strong.textContent=first.title;
    const small=summary.querySelector('small');if(small)small.textContent=first.reason;
    summary.setAttribute('data-live-priority','true');
   }else if(summary&&live.tareasReady&&live.firmasReady&&live.expedientesReady){
    const strong=summary.querySelector('strong');if(strong)strong.textContent='No hay incidencias críticas ahora';
    const small=summary.querySelector('small');if(small)small.textContent='Las fuentes visibles no exponen una actuación prioritaria inmediata.';
   }
   const heroButton=hero?.querySelector<HTMLButtonElement>('.dir-alert-button');
   if(heroButton){
    if(first){heroButton.textContent=first.action;heroButton.dataset.livePriorityRoute=first.route;}
    else{heroButton.textContent='Abrir Agenda/Tareas';heroButton.dataset.livePriorityRoute='/agenda';}
   }
   const priorityButtons=Array.from(root.querySelectorAll<HTMLButtonElement>('.dir-live-priority'));
   priorityButtons.forEach((button,index)=>{const p=live!.priorities[index];if(!p)return;button.dataset.livePriorityRoute=p.route;const strong=button.querySelector('strong');if(strong)strong.textContent=p.title;const small=button.querySelector('small');if(small)small.textContent=p.reason;const action=button.querySelector('b');if(action)action.textContent=p.action.toUpperCase();});
  };
  const onLive=(event:Event)=>{live=(event as CustomEvent<DirectionLiveSnapshot>).detail;patch();};
  const capture=(event:Event)=>{
   const target=event.target as Element|null;
   const kpi=target?.closest<HTMLButtonElement>('.dir-kpi');
   if(kpi){
    const route=kpi.dataset.kpiExactRoute;
    if(kpi.disabled||!route){event.preventDefault();event.stopPropagation();return;}
    event.preventDefault();event.stopPropagation();navigate(route);return;
   }
   const priority=target?.closest<HTMLButtonElement>('[data-live-priority-route]');
   const route=priority?.dataset.livePriorityRoute;
   if(priority&&route){event.preventDefault();event.stopPropagation();navigate(route);}
  };
  window.addEventListener('fenix-direction-live-data',onLive as EventListener);
  observer=new MutationObserver(patch);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',capture,true);
  return()=>{stopped=true;observer?.disconnect();window.removeEventListener('fenix-direction-live-data',onLive as EventListener);document.removeEventListener('click',capture,true)};
 },[location.pathname,navigate]);
 return null;
}
