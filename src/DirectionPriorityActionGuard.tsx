import {useEffect,useRef} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import type {DirectionLiveSnapshot} from './useDirectionLiveData';

export default function DirectionPriorityActionGuard(){
  const location=useLocation();
  const navigate=useNavigate();
  const latest=useRef<DirectionLiveSnapshot|null>(null);

  useEffect(()=>{
    const onData=(event:Event)=>{
      latest.current=(event as CustomEvent<DirectionLiveSnapshot>).detail??null;
    };
    window.addEventListener('fenix-direction-live-data',onData as EventListener);
    return()=>window.removeEventListener('fenix-direction-live-data',onData as EventListener);
  },[]);

  useEffect(()=>{
    if(location.pathname!=='/inicio')return;
    const onClick=(event:MouseEvent)=>{
      const target=event.target as Element|null;
      const button=target?.closest('.dir-live-priority') as HTMLButtonElement|null;
      if(!button)return;
      const buttons=Array.from(document.querySelectorAll('.dir-live-priority'));
      const index=buttons.indexOf(button);
      const priority=index>=0?latest.current?.priorities[index]:undefined;
      if(!priority?.route)return;
      event.preventDefault();
      event.stopPropagation();
      navigate(priority.route);
    };
    document.addEventListener('click',onClick,true);
    return()=>document.removeEventListener('click',onClick,true);
  },[location.pathname,navigate]);

  return null;
}
