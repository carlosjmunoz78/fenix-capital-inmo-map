import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {IS_PRODUCTION} from './supabase';

const INTERACTIVE='a,button,input,select,textarea,label';

export default function DocumentCardOpenGuard(){
 const location=useLocation(),navigate=useNavigate();
 useEffect(()=>{
  if(!IS_PRODUCTION)return;
  const detail=location.pathname.match(/^\/documentacion\/([^/]+)$/);
  if(detail&&detail[1]!=='nuevo'&&detail[1]!=='nueva'){
   navigate(`/documentos/${detail[1]}?returnTo=${encodeURIComponent('/documentacion')}`,{replace:true});
   return;
  }
  if(location.pathname!=='/documentacion')return;
  const cleanups:Array<()=>void>=[];
  const bind=()=>{
   document.querySelectorAll<HTMLElement>('.doc-library-card').forEach(card=>{
    if(card.dataset.documentOpenBound==='1')return;
    card.dataset.documentOpenBound='1';card.tabIndex=0;card.setAttribute('role','link');
    const open=()=>{
     const direct=card.querySelector<HTMLAnchorElement>('a[href]');
     if(direct?.href){window.open(direct.href,'_blank','noopener,noreferrer');return;}
     card.querySelector<HTMLButtonElement>('.doc-card-detail:not(:disabled)')?.click();
    };
    const click=(event:MouseEvent)=>{const target=event.target as HTMLElement|null;if(target?.closest(INTERACTIVE))return;open();};
    const key=(event:KeyboardEvent)=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement|null;if(target?.closest(INTERACTIVE))return;event.preventDefault();open();};
    card.addEventListener('click',click);card.addEventListener('keydown',key);
    cleanups.push(()=>{card.removeEventListener('click',click);card.removeEventListener('keydown',key);delete card.dataset.documentOpenBound;card.removeAttribute('tabindex');card.removeAttribute('role');});
   });
  };
  bind();const observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();cleanups.forEach(fn=>fn());};
 },[location.pathname,navigate]);
 return null;
}
