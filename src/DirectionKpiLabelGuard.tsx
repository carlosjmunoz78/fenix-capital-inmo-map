import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function DirectionKpiLabelGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let stopped=false;
  const sync=()=>{
   if(stopped)return;
   const buttons=Array.from(document.querySelectorAll('.dir-kpi')) as HTMLElement[];
   for(const button of buttons){
    const label=button.querySelector(':scope > span') as HTMLElement|null;
    if(!label)continue;
    const txt=(label.textContent||'').toUpperCase();
    if(txt.includes('FIRMAS')&&!txt.includes('FIRMADOS')&&!txt.includes('PREVISTAS')){
     label.innerHTML='FIRMAS<br/>PREVISTAS ESTE MES';
    }
    const updated=(label.textContent||'').toUpperCase();
    if(updated.includes('FIRMAS')&&updated.includes('PREVISTAS')&&!updated.includes('FIRMADOS')){
     const note=button.querySelector(':scope > small') as HTMLElement|null;
     if(note&&/fecha|dato no disponible/i.test(note.textContent||'')&&note.textContent!=='Solo fecha de firma canónica del mes')note.textContent='Solo fecha de firma canónica del mes';
    }
   }
  };
  sync();
  const obs=new MutationObserver(sync);obs.observe(document.body,{childList:true,subtree:true});
  return()=>{stopped=true;obs.disconnect()};
 },[location.pathname]);
 return null;
}
