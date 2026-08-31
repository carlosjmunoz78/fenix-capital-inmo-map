import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

const TARGETS='.avatar,.ops-profile';

type Bound={click:(event:Event)=>void;key:(event:KeyboardEvent)=>void};

export default function ProfileLauncherGuard(){
 const navigate=useNavigate();
 useEffect(()=>{
  const bound=new Map<HTMLElement,Bound>();
  const wire=(el:HTMLElement)=>{
   if(bound.has(el))return;
   el.setAttribute('role','button');
   el.setAttribute('tabindex','0');
   el.setAttribute('aria-label','Abrir mi perfil');
   el.setAttribute('title','Mi perfil');
   el.style.cursor='pointer';
   const click=(event:Event)=>{event.preventDefault();navigate('/perfil');};
   const key=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate('/perfil');}};
   el.addEventListener('click',click);
   el.addEventListener('keydown',key);
   bound.set(el,{click,key});
  };
  const scan=()=>document.querySelectorAll<HTMLElement>(TARGETS).forEach(wire);
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{
   observer.disconnect();
   bound.forEach(({click,key},el)=>{el.removeEventListener('click',click);el.removeEventListener('keydown',key);});
   bound.clear();
  };
 },[navigate]);
 return null;
}
