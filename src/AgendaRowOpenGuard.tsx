import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

const INTERACTIVE='input,button,a,select,textarea,label';

export default function AgendaRowOpenGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname!=='/agenda')return;
  const cleanups:Array<()=>void>=[];
  const bind=()=>{
   document.querySelectorAll<HTMLTableRowElement>('.agenda-table tbody tr.ops-clickable-row').forEach(row=>{
    if(row.dataset.agendaOpenBound==='1')return;
    row.dataset.agendaOpenBound='1';row.tabIndex=0;
    let forwarding=false;
    const open=()=>{if(forwarding)return;const cells=row.querySelectorAll<HTMLTableCellElement>('td');const target=cells[1]||cells[cells.length-1];if(!target)return;forwarding=true;target.click();forwarding=false;};
    const click=(event:MouseEvent)=>{if(forwarding)return;const target=event.target as HTMLElement|null;if(target?.closest(INTERACTIVE))return;open();};
    const key=(event:KeyboardEvent)=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement|null;if(target?.closest(INTERACTIVE))return;event.preventDefault();open();};
    row.addEventListener('click',click);row.addEventListener('keydown',key);cleanups.push(()=>{row.removeEventListener('click',click);row.removeEventListener('keydown',key);delete row.dataset.agendaOpenBound;row.removeAttribute('tabindex');});
   });
  };
  bind();const observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();cleanups.forEach(fn=>fn());};
 },[location.pathname]);
 return null;
}
