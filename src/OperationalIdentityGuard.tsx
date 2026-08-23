import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';

type Ctx={role?:string};
function clean(v:unknown){return typeof v==='string'&&v.trim()?v.trim():'';}
function safeAvatar(v:unknown){const x=clean(v);return /^https:\/\//i.test(x)?x:'';}
function initials(value:string){return value.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('')||'FC';}

export default function OperationalIdentityGuard(){
 const location=useLocation();
 useEffect(()=>{
  if(location.pathname==='/inicio')return;
  let stopped=false;
  let observer:MutationObserver|null=null;
  let timer:number|undefined;
  async function apply(){
   const {data:{session}}=await supabase.auth.getSession();
   if(stopped||!session)return;
   const meta=(session.user.user_metadata||{}) as Record<string,unknown>;
   const name=clean(meta.full_name)||clean(meta.name)||clean(meta.display_name);
   const avatarUrl=safeAvatar(meta.avatar_url)||safeAvatar(meta.picture);
   const c=await fetchAppApi<Ctx>('/session/context');
   if(stopped)return;
   const role=clean(c.data?.role)||'Usuario';
   const patch=()=>{
    document.querySelectorAll<HTMLElement>('.ops-profile').forEach(root=>{
     if(root.querySelector('.ops-profile-copy'))return;
     const strong=root.querySelector('strong');
     if(!strong)return;
     const visibleName=name||role;
     if(strong.textContent!==visibleName)strong.textContent=visibleName;
     root.setAttribute('data-role',role);
     root.setAttribute('title',name?`${name} · ${role}`:role);
     if(avatarUrl){
      let img=root.querySelector<HTMLImageElement>('img[data-auth-avatar="true"]');
      if(!img){img=document.createElement('img');img.dataset.authAvatar='true';img.alt='';img.referrerPolicy='no-referrer';root.insertBefore(img,root.firstChild);}
      if(img.src!==avatarUrl)img.src=avatarUrl;
     }else if(!root.querySelector('.ops-profile-avatar')){
      const span=document.createElement('span');span.className='ops-profile-avatar';span.setAttribute('aria-hidden','true');span.textContent=initials(visibleName);root.insertBefore(span,root.firstChild);
     }
    });
   };
   patch();
   observer=new MutationObserver(patch);
   observer.observe(document.body,{childList:true,subtree:true});
   timer=window.setTimeout(()=>observer?.disconnect(),10000);
  }
  void apply();
  return()=>{stopped=true;observer?.disconnect();if(timer)window.clearTimeout(timer)};
 },[location.pathname]);
 return null;
}
