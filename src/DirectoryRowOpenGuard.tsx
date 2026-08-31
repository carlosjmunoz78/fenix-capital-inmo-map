import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function DirectoryRowOpenGuard(){
 const location=useLocation();
 useEffect(()=>{
  const active=location.pathname==='/notarias'||location.pathname==='/registros-propiedad';
  if(!active)return;
  const cleanups:Array<()=>void>=[];
  const wire=()=>{
   document.querySelectorAll<HTMLTableRowElement>('.ops-table.inmo-table tbody tr').forEach(row=>{
    if(row.dataset.rowOpenWired==='1')return;
    const button=[...row.querySelectorAll<HTMLButtonElement>('button')].find(b=>/abrir ficha/i.test(b.textContent||''));
    if(!button)return;
    row.dataset.rowOpenWired='1';
    row.tabIndex=0;
    row.setAttribute('role','button');
    row.setAttribute('aria-label',`Abrir ficha de ${row.querySelector('strong')?.textContent?.trim()||'este registro'}`);
    row.style.cursor='pointer';
    const open=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('button,a,input,select,textarea,label'))return;
      button.click();
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();button.click();}
    };
    row.addEventListener('click',open);
    row.addEventListener('keydown',key);
    cleanups.push(()=>{row.removeEventListener('click',open);row.removeEventListener('keydown',key);delete row.dataset.rowOpenWired;row.removeAttribute('role');row.removeAttribute('aria-label');row.removeAttribute('tabindex');row.style.cursor='';});
   });
  };
  wire();
  const obs=new MutationObserver(wire);
  obs.observe(document.body,{childList:true,subtree:true});
  return()=>{obs.disconnect();cleanups.forEach(fn=>fn())};
 },[location.pathname]);
 return null;
}
