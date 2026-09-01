import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';

export default function DirectoryRowOpenGuard(){
 const location=useLocation();
 const navigate=useNavigate();
 useEffect(()=>{
  const isDirectory=location.pathname==='/notarias'||location.pathname==='/registros-propiedad';
  const isBanks=location.pathname==='/bancos';
  if(!isDirectory&&!isBanks)return;
  const cleanups:Array<()=>void>=[];
  const wireDirectoryRows=()=>{
   if(!isDirectory)return;
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
  const wireBankCards=()=>{
   if(!isBanks)return;
   document.querySelectorAll<HTMLElement>('.bancos-grid article').forEach(card=>{
    if(card.dataset.bankOpenWired==='1')return;
    const bankName=card.querySelector('h2')?.textContent?.trim()||'';
    if(!bankName)return;
    card.dataset.bankOpenWired='1';
    card.tabIndex=0;
    card.setAttribute('role','link');
    card.setAttribute('aria-label',`Abrir ficha de ${bankName}`);
    card.style.cursor='pointer';
    const go=()=>navigate(`/bancos/${encodeURIComponent(bankName)}`);
    const open=(event:Event)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('button,a,input,select,textarea,label'))return;
      go();
    };
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();go();}
    };
    card.addEventListener('click',open);
    card.addEventListener('keydown',key);
    cleanups.push(()=>{card.removeEventListener('click',open);card.removeEventListener('keydown',key);delete card.dataset.bankOpenWired;card.removeAttribute('role');card.removeAttribute('aria-label');card.removeAttribute('tabindex');card.style.cursor='';});
   });
  };
  const wire=()=>{wireDirectoryRows();wireBankCards();};
  wire();
  const obs=new MutationObserver(wire);
  obs.observe(document.body,{childList:true,subtree:true});
  return()=>{obs.disconnect();cleanups.forEach(fn=>fn())};
 },[location.pathname,navigate]);
 return null;
}
