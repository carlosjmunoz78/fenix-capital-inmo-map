import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';
import DirectionStateGuard from './DirectionStateGuard';

type Ctx={role?:string;actor_code?:string;worker_id?:string;display_name?:string;full_name?:string;name?:string};
type Row=Record<string,unknown>;
type PersonalResponse={items?:Row[]};

function clean(value:unknown){return typeof value==='string'&&value.trim()?value.trim():'';}
function firstName(name:string){return name.split(/\s+/).filter(Boolean)[0]||'';}
function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')||'FC';}
function setText(node:Element|null,value:string){if(node&&node.textContent!==value)node.textContent=value;}
function daypart(){const h=new Date().getHours();return h<12?'buenos días':h<20?'buenas tardes':'buenas noches';}
function rowMatchesSelf(row:Row,ctx:Ctx|null){
 const actor=clean(ctx?.actor_code),worker=clean(ctx?.worker_id);
 const rowActor=clean(row.actor_code),rowWorker=clean(row.worker_id);
 return Boolean((actor&&rowActor===actor)||(worker&&rowWorker===worker));
}
function rowName(row:Row|undefined){if(!row)return'';return clean(row.name)||clean(row.nombre)||clean(row.full_name)||clean(row.display_name);}
function contextName(ctx:Ctx|null){return clean(ctx?.display_name)||clean(ctx?.full_name)||clean(ctx?.name);}

export default function DirectionIdentityGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname!=='/inicio')return;
  let stopped=false;
  let observer:MutationObserver|null=null;
  let refreshTimer:number|undefined;
  async function apply(){
   const {data:{session}}=await supabase.auth.getSession();
   if(stopped||!session)return;
   const meta=(session.user.user_metadata||{}) as Record<string,unknown>;
   const sessionName=clean(meta.full_name)||clean(meta.name)||clean(meta.nombre)||clean(meta.display_name);
   const [c,p]=await Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<PersonalResponse>('/personal')]);
   if(stopped)return;
   const ctx=c.status===200?c.data:null;
   const selfRow=p.status===200?(p.data?.items??[]).find(row=>rowMatchesSelf(row,ctx)):undefined;
   const name=sessionName||contextName(ctx)||rowName(selfRow);
   const displayName=name||'Mi perfil';
   const role=clean(ctx?.role)||'Usuario';
   const patch=()=>{
    const root=document.querySelector('.dir-shell');
    if(!root)return;
    setText(root.querySelector('.dir-user-copy strong'),displayName);
    setText(root.querySelector('.dir-user-copy span'),name?role:'Identidad no disponible');
    setText(root.querySelector('.dir-avatar'),initials(displayName));
    const salutation=daypart();
    setText(root.querySelector('.dir-priority-copy h1'),name?`Hola ${firstName(name)}, ${salutation}`:`${salutation.charAt(0).toUpperCase()}${salutation.slice(1)}`);
   };
   patch();
   observer=new MutationObserver(()=>patch());
   observer.observe(document.body,{childList:true,subtree:true});
   refreshTimer=window.setInterval(patch,60_000);
  }
  void apply();
  return()=>{stopped=true;observer?.disconnect();if(refreshTimer)window.clearInterval(refreshTimer)};
 },[location.pathname]);
 return <DirectionStateGuard/>;
}
