import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';

type Ctx={role?:string;display_name?:string;full_name?:string;name?:string};
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
   const c=await fetchAppApi<Ctx>('/session/context');
   if(stopped)return;
   const role=clean(c.data?.role)||'Usuario';
   const name=clean(meta.full_name)||clean(meta.name)||clean(meta.display_name)||clean(c.data?.display_name)||clean(c.data?.full_name)||clean(c.data?.name);
   const visibleName=name||'Mi perfil';
   const avatarUrl=safeAvatar(meta.avatar_url)||safeAvatar(meta.picture);
   const patch=()=>{
    document.querySelectorAll<HTMLElement>('.ops-profile').forEach(root=>{
     root.setAttribute('data-role',role);
     root.setAttribute('title',name?`${name} · ${role}`:role);
     let copy=root.querySelector<HTMLElement>('.ops-profile-copy');
     if(!copy){
      const legacyStrong=root.querySelector('strong');
      copy=document.createElement('span');
      copy.className='ops-profile-copy';
      const strong=document.createElement('strong');
      const small=document.createElement('small');
      copy.append(strong,small);
      if(legacyStrong)legacyStrong.remove();
      root.appendChild(copy);
     }
     const strong=copy.querySelector('strong');
     const small=copy.querySelector('small');
     if(strong&&strong.textContent!==visibleName)strong.textContent=visibleName;
     if(small&&small.textContent!==role)small.textContent=role;
     root.querySelectorAll('.ops-profile-avatar,img[data-auth-avatar="true"]').forEach(el=>el.remove());
     if(avatarUrl){
      const img=document.createElement('img');img.dataset.authAvatar='true';img.alt='';img.referrerPolicy='no-referrer';img.src=avatarUrl;root.insertBefore(img,root.firstChild);
     }else{
      const span=document.createElement('span');span.className='ops-profile-avatar';span.setAttribute('aria-hidden','true');span.textContent=initials(name||role);root.insertBefore(span,root.firstChild);
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
