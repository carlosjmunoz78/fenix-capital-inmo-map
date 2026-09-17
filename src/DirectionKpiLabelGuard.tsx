import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchEconomiaRuntime} from './economiaRuntime';

type Eco={pipeline_activo?:{ingreso_fenix_esperado?:number}};
const money=(n:number)=>`${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')} €`;

export default function DirectionKpiLabelGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let stopped=false,timer:number|undefined;
  const labels=()=>Array.from(document.querySelectorAll('.dir-kpi')) as HTMLElement[];
  const syncLabels=()=>{
   if(stopped)return;
   for(const button of labels()){
    const label=button.querySelector(':scope > span') as HTMLElement|null;
    if(!label)continue;
    const txt=(label.textContent||'').toUpperCase();
    if(txt.includes('FIRMAS')&&!txt.includes('FIRMADOS')&&!txt.includes('PREVISTAS'))label.innerHTML='FIRMAS<br/>PREVISTAS ESTE MES';
    const updated=(label.textContent||'').toUpperCase();
    if(updated.includes('FIRMAS')&&updated.includes('PREVISTAS')&&!updated.includes('FIRMADOS')){
     const note=button.querySelector(':scope > small') as HTMLElement|null;
     const next='Solo fecha de firma canónica del mes';
     if(note&&note.textContent!==next)note.textContent=next;
    }
   }
  };
  const syncEconomy=async()=>{
   try{
    const r=await fetchEconomiaRuntime<Eco>();
    if(stopped||r.status!==200)return;
    const expected=Number(r.data?.pipeline_activo?.ingreso_fenix_esperado);
    if(!Number.isFinite(expected))return;
    for(const button of labels()){
     const label=button.querySelector(':scope > span') as HTMLElement|null;
     if(!(label?.textContent||'').toUpperCase().includes('HONOR'))continue;
     const value=button.querySelector(':scope > strong') as HTMLElement|null;
     const note=button.querySelector(':scope > small') as HTMLElement|null;
     const nextValue=money(expected),nextNote='Ingreso Fénix esperado · cartera activa';
     if(value&&value.textContent!==nextValue)value.textContent=nextValue;
     if(note&&note.textContent!==nextNote)note.textContent=nextNote;
    }
   }catch{
    // Direction remains usable if the optional economy enrichment is unavailable.
   }
  };
  const refresh=()=>{syncLabels();void syncEconomy()};
  refresh();
  timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh()},10000);
  const obs=new MutationObserver(syncLabels);
  obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',refresh);
  window.addEventListener('fenix-operational-data-changed',refresh as EventListener);
  return()=>{stopped=true;obs.disconnect();if(timer)clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('fenix-operational-data-changed',refresh as EventListener)};
 },[location.pathname]);
 return null;
}
