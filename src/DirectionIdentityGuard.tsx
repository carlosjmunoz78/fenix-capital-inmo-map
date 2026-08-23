import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import DirectionStateGuard from './DirectionStateGuard';

type Ctx={role?:string};

function clean(value:unknown){return typeof value==='string'&&value.trim()?value.trim():'';}
function firstName(name:string){return name.split(/\s+/).filter(Boolean)[0]||'';}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')||'D';}
function setText(node:Element|null,value:string){if(node&&node.textContent!==value)node.textContent=value;}

export default function DirectionIdentityGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let stopped=false;
  let observer:MutationObserver|null=null;
  let timer:number|undefined;
  async function apply(){
   const {data:{session}}=await supabase.auth.getSession();
   if(stopped||!session)return;
   const meta=(session.user.user_metadata||{}) as Record<string,unknown>;
   const name=clean(meta.full_name)||clean(meta.name)||clean(meta.display_name);
   const c=await fetchAppApi<Ctx>('/session/context');
   if(stopped)return;
   const role=clean(c.data?.role)||'Dirección';
   const patch=()=>{
    const root=document.querySelector('.dir-shell');
    if(!root)return;
    setText(root.querySelector('.dir-user-copy strong'),name||role);
    setText(root.querySelector('.dir-user-copy span'),role);
    setText(root.querySelector('.dir-avatar'),initials(name||role));
    setText(root.querySelector('.dir-priority-copy h1'),name?`Hola ${firstName(name)}, buenos días 👋`:'Buenos días 👋');
   };
   patch();
   observer=new MutationObserver(()=>patch());
   observer.observe(document.body,{childList:true,subtree:true});
   timer=window.setTimeout(()=>observer?.disconnect(),10000);
  }
  void apply();
  return()=>{stopped=true;observer?.disconnect();if(timer)window.clearTimeout(timer)};
 },[location.pathname]);
 return <DirectionStateGuard/>;
}
