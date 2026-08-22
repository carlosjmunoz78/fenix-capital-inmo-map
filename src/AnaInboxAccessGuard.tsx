import { useEffect, useState } from 'react';
import { fetchAnaApi, supabase } from './supabase';

type Caps={can_view_learning_inbox?:boolean;learning_inbox_disabled_reason?:string|null};
type Envelope={capabilities?:Caps};

export default function AnaInboxAccessGuard(){
  const [logged,setLogged]=useState(false),[caps,setCaps]=useState<Caps|null>(null);
  useEffect(()=>{let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setLogged(Boolean(s)));return()=>{alive=false;subscription.unsubscribe()};},[]);
  useEffect(()=>{if(!logged){setCaps(null);return;}fetchAnaApi<Envelope>('/capabilities').then(r=>setCaps(r.status===200?r.data?.capabilities??null:null));},[logged]);
  useEffect(()=>{
    if(!logged||!caps)return;
    const apply=()=>{
      document.querySelectorAll<HTMLButtonElement>('.ops-ana').forEach(btn=>{
        if(caps.can_view_learning_inbox){btn.disabled=false;btn.removeAttribute('aria-disabled');btn.removeAttribute('data-ana-inbox-capped');btn.title='';return;}
        btn.disabled=true;btn.setAttribute('aria-disabled','true');btn.setAttribute('data-ana-inbox-capped','true');btn.title=caps.learning_inbox_disabled_reason||'En Fase 1, la bandeja global de correcciones está reservada a Belén.';
      });
    };
    apply();
    const observer=new MutationObserver(apply);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[logged,caps]);
  return null;
}
