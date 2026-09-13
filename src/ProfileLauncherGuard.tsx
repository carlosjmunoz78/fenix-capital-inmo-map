import {useEffect} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';

const TARGETS='.avatar,.ops-profile';
const CEREBRO_LAUNCHER_ID='fenix-cerebro-profile-launcher';

type Bound={click:(event:Event)=>void;key:(event:KeyboardEvent)=>void};

export default function ProfileLauncherGuard(){
 const navigate=useNavigate();
 const location=useLocation();
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
  const ensureCerebroLauncher=()=>{
   const existing=document.getElementById(CEREBRO_LAUNCHER_ID);
   if(location.pathname!=='/perfil'){
    existing?.remove();
    return;
   }
   if(existing)return;
   const host=document.querySelector<HTMLElement>('.profile-heading');
   if(!host)return;
   const button=document.createElement('button');
   button.id=CEREBRO_LAUNCHER_ID;
   button.type='button';
   button.className='secondary-action';
   button.textContent='Abrir CEREBRO';
   button.setAttribute('aria-label','Abrir CEREBRO');
   button.setAttribute('title','Abrir CEREBRO');
   button.addEventListener('click',()=>navigate('/cerebro'));
   host.appendChild(button);
  };
  const scan=()=>{
   document.querySelectorAll<HTMLElement>(TARGETS).forEach(wire);
   ensureCerebroLauncher();
  };
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{
   observer.disconnect();
   bound.forEach(({click,key},el)=>{el.removeEventListener('click',click);el.removeEventListener('keydown',key);});
   bound.clear();
   document.getElementById(CEREBRO_LAUNCHER_ID)?.remove();
  };
 },[navigate,location.pathname]);
 return null;
}
