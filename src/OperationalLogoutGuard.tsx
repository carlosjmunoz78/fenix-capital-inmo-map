import {useEffect} from 'react';
import {supabase} from './supabase';

export default function OperationalLogoutGuard(){
  useEffect(()=>{
    let uid='';
    let stopped=false;
    supabase.auth.getSession().then(({data})=>{if(!stopped)uid=data.session?.user?.id||'';});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{uid=session?.user?.id||'';});
    const cleanup=(event:Event)=>{
      const target=event.target as Element|null;
      const button=target?.closest?.('button[aria-label="Cerrar sesión"]');
      if(!button||!button.closest('.ops-root'))return;
      if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
      sessionStorage.removeItem('fenix-session-active');
    };
    document.addEventListener('pointerdown',cleanup,true);
    document.addEventListener('click',cleanup,true);
    return()=>{
      stopped=true;
      subscription.unsubscribe();
      document.removeEventListener('pointerdown',cleanup,true);
      document.removeEventListener('click',cleanup,true);
    };
  },[]);
  return null;
}
