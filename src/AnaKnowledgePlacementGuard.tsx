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
   const quick=[...document.querySelectorAll('.ops-root .ops-shared-quick, .ops-root .dir-quick')].filter(isVisible).at(-1) as HTMLElement|undefined;
   const mount=document.querySelector('.ana-knowledge-mount') as HTMLElement|null;
   if(!quick||!mount)return;
   if(quick.nextElementSibling!==mount)quick.insertAdjacentElement('afterend',mount);
  };
  place();
  const observer=new MutationObserver(place);
  observer.observe(document.body,{childList:true,subtree:true});
  const raf=requestAnimationFrame(place);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();};
 },[location.pathname]);
 return null;
}
