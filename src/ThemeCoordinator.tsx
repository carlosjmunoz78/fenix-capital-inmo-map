import {useEffect} from 'react';

type Theme='light'|'dark';
const KEY='fenix-theme';
function valid(v:string|null):v is Theme{return v==='light'||v==='dark';}
function canonical():Theme{
 const local=localStorage.getItem(KEY),session=sessionStorage.getItem(KEY),html=document.documentElement.dataset.theme??null;
 return valid(local)?local:valid(session)?session:valid(html)?html:'light';
}
function persist(theme:Theme){localStorage.setItem(KEY,theme);sessionStorage.setItem(KEY,theme);}
function apply(theme:Theme){
 persist(theme);
 if(document.documentElement.dataset.theme!==theme)document.documentElement.dataset.theme=theme;
 document.querySelectorAll<HTMLElement>('[data-theme]').forEach(el=>{if(el.dataset.theme!==theme)el.dataset.theme=theme;});
 document.querySelectorAll<HTMLElement>('[data-dir-theme]').forEach(el=>{if(el.dataset.dirTheme!==theme)el.dataset.dirTheme=theme;});
}
export default function ThemeCoordinator(){
 useEffect(()=>{
  apply(canonical());
  let busy=false;
  const reconcile=()=>{if(busy)return;busy=true;queueMicrotask(()=>{apply(canonical());busy=false;});};
  const htmlObs=new MutationObserver(reconcile);htmlObs.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  const bodyObs=new MutationObserver(reconcile);bodyObs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-theme','data-dir-theme']});
  const click=(ev:MouseEvent)=>{
   const button=(ev.target as Element|null)?.closest('button') as HTMLButtonElement|null;if(!button)return;
   const label=button.getAttribute('aria-label')||'';
   if(label!=='Cambiar tema'&&!button.classList.contains('theme-toggle')&&!button.classList.contains('dir-theme-toggle'))return;
   const next:Theme=canonical()==='dark'?'light':'dark';
   persist(next);document.documentElement.dataset.theme=next;requestAnimationFrame(()=>apply(next));
  };
  const storage=(ev:StorageEvent)=>{if(ev.key===KEY&&valid(ev.newValue))apply(ev.newValue);};
  document.addEventListener('click',click,true);window.addEventListener('storage',storage);
  return()=>{htmlObs.disconnect();bodyObs.disconnect();document.removeEventListener('click',click,true);window.removeEventListener('storage',storage);};
 },[]);
 return null;
}
