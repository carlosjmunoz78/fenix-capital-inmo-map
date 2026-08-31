import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

function isVisible(el:Element){
 const r=(el as HTMLElement).getBoundingClientRect();
 const s=getComputedStyle(el as HTMLElement);
 return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
}

export default function AnaKnowledgePlacementGuard(){
 const location=useLocation();
 useEffect(()=>{
  const place=()=>{
   const roots=[...document.querySelectorAll('.ops-root')].filter(isVisible);
   const root=roots.at(-1) as HTMLElement|undefined;
   if(!root)return;
   const content=root.querySelector('.ops-content') as HTMLElement|null;
   if(!content)return;
   const mount=document.querySelector('.ana-knowledge-mount') as HTMLElement|null;
   if(!mount)return;
   const footerHost=content.querySelector(':scope > .ops-uniform-footer-host') as HTMLElement|null;
   const directQuick=content.querySelector(':scope > .ops-shared-quick, :scope > .dir-quick') as HTMLElement|null;
   if(footerHost){
    const alreadyFinal=footerHost.nextElementSibling===mount&&mount.parentElement===content&&mount===content.lastElementChild;
    if(!alreadyFinal){
     content.appendChild(footerHost);
     content.appendChild(mount);
    }
    return;
   }
   if(directQuick){
    const alreadyFinal=directQuick.nextElementSibling===mount&&mount.parentElement===content&&mount===content.lastElementChild;
    if(!alreadyFinal){
     content.appendChild(directQuick);
     content.appendChild(mount);
    }
   }
  };
  place();
  const observer=new MutationObserver(place);
  observer.observe(document.body,{childList:true,subtree:true});
  const raf=requestAnimationFrame(place);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();};
 },[location.pathname]);
 return null;
}
