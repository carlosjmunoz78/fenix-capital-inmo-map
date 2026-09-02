import {useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';

const DETAIL=/^\/expedientes\/[^/]+$/;
const STYLE_ID='fenix-expediente-detail-chrome-lock';

export default function ExpedienteLegacyChromeGuard(){
 const {pathname}=useLocation();
 const active=DETAIL.test(pathname)&&pathname!=='/expedientes/nuevo';
 useLayoutEffect(()=>{
  if(!active)return;
  document.documentElement.dataset.expedienteDetail='true';
  let style=document.getElementById(STYLE_ID) as HTMLStyleElement|null;
  if(!style){
   style=document.createElement('style');
   style.id=STYLE_ID;
   style.textContent=`
html[data-expediente-detail="true"] .app-shell{display:none!important;visibility:hidden!important;pointer-events:none!important}
html[data-expediente-detail="true"] .ops-uniform-sidebar-host{display:none!important;visibility:hidden!important;pointer-events:none!important}
html[data-expediente-detail="true"] .ops-root:not(.detail-exp-root){display:none!important;visibility:hidden!important;pointer-events:none!important}
html[data-expediente-detail="true"] #root header:not(.detail-exp-top),html[data-expediente-detail="true"] #root .ops-top:not(.detail-exp-top),html[data-expediente-detail="true"] #root .topbar:not(.detail-exp-top){display:none!important;visibility:hidden!important;pointer-events:none!important}
html[data-expediente-detail="true"] .detail-exp-root{display:grid!important;visibility:visible!important;pointer-events:auto!important}
html[data-expediente-detail="true"] .detail-exp-root .detail-exp-top{display:flex!important;visibility:visible!important;pointer-events:auto!important}
`;
   document.head.appendChild(style);
  }
  const hide=()=>{
   document.querySelectorAll<HTMLElement>('.app-shell,.ops-uniform-sidebar-host,.ops-root:not(.detail-exp-root),#root header:not(.detail-exp-top),#root .ops-top:not(.detail-exp-top),#root .topbar:not(.detail-exp-top)').forEach(el=>{
    el.dataset.expedienteLegacySuppressed='true';
    el.style.setProperty('display','none','important');
    el.style.setProperty('visibility','hidden','important');
    el.style.setProperty('pointer-events','none','important');
   });
   const root=document.querySelector<HTMLElement>('.detail-exp-root');
   if(root){
    root.style.setProperty('display','grid','important');
    root.style.setProperty('visibility','visible','important');
    root.style.setProperty('pointer-events','auto','important');
   }
   const canonical=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-top');
   if(canonical){
    canonical.style.setProperty('display','flex','important');
    canonical.style.setProperty('visibility','visible','important');
    canonical.style.setProperty('pointer-events','auto','important');
   }
  };
  hide();
  const observer=new MutationObserver(hide);
  observer.observe(document.getElementById('root')??document.body,{childList:true,subtree:true});
  return()=>{
   observer.disconnect();
   delete document.documentElement.dataset.expedienteDetail;
   document.getElementById(STYLE_ID)?.remove();
   document.querySelectorAll<HTMLElement>('[data-expediente-legacy-suppressed="true"]').forEach(el=>{
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    delete el.dataset.expedienteLegacySuppressed;
   });
   const root=document.querySelector<HTMLElement>('.detail-exp-root');
   root?.style.removeProperty('display');
   root?.style.removeProperty('visibility');
   root?.style.removeProperty('pointer-events');
   const canonical=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-top');
   canonical?.style.removeProperty('display');
   canonical?.style.removeProperty('visibility');
   canonical?.style.removeProperty('pointer-events');
  };
 },[active,pathname]);
 return null;
}
