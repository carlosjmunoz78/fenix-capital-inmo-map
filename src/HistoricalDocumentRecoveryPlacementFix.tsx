import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export default function HistoricalDocumentRecoveryPlacementFix(){
  const location=useLocation();
  const active=/^\/(?:documentos|documentacion)\/[^/]+$/.test(location.pathname);

  useEffect(()=>{
    if(!active)return;
    const place=()=>{
      const side=document.querySelector<HTMLElement>('.doc-view-side');
      const host=document.querySelector<HTMLElement>('.historical-document-recovery-host');
      if(side&&host&&host.parentElement!==side){
        side.insertBefore(host,side.firstChild);
      }
    };
    place();
    const observer=new MutationObserver(place);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[active,location.pathname]);

  return null;
}
