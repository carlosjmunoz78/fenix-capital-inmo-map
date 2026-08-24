import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {supabase} from './supabase';

const LOGOUT_CLASS='ops-logout-guard';

export default function OperationalLogoutGuard(){
  const navigate=useNavigate();
  useEffect(()=>{
    let uid='';
    let stopped=false;
    supabase.auth.getSession().then(({data})=>{if(!stopped)uid=data.session?.user?.id||'';});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{uid=session?.user?.id||'';});

    const clearSessionState=()=>{
      if(uid)sessionStorage.removeItem(`fenix-calc:${uid}`);
      sessionStorage.removeItem('fenix-session-active');
    };

    const ensureLogout=(top:HTMLElement)=>{
      let actions=top.querySelector<HTMLElement>('.ops-top-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='ops-top-actions';
        top.appendChild(actions);
      }
      const existing=actions.querySelector<HTMLButtonElement>('button[aria-label="Cerrar sesión"]');
      if(existing){
        existing.setAttribute('aria-label','Cerrar sesión');
        return;
      }
      const button=document.createElement('button');
      button.type='button';
      button.className=LOGOUT_CLASS;
      button.setAttribute('aria-label','Cerrar sesión');
      button.setAttribute('title','Salir');
      button.addEventListener('click',async()=>{
        clearSessionState();
        await supabase.auth.signOut();
        navigate('/',{replace:true});
      });
      actions.appendChild(button);
    };

    const wire=()=>document.querySelectorAll<HTMLElement>('.ops-top').forEach(ensureLogout);
    wire();
    const observer=new MutationObserver(wire);
    observer.observe(document.body,{childList:true,subtree:true});

    const cleanup=(event:Event)=>{
      const target=event.target as Element|null;
      const button=target?.closest?.('button[aria-label="Cerrar sesión"]');
      if(!button||!button.closest('.ops-root'))return;
      clearSessionState();
    };
    document.addEventListener('pointerdown',cleanup,true);
    document.addEventListener('click',cleanup,true);
    return()=>{
      stopped=true;
      observer.disconnect();
      subscription.unsubscribe();
      document.removeEventListener('pointerdown',cleanup,true);
      document.removeEventListener('click',cleanup,true);
    };
  },[navigate]);
  return null;
}
