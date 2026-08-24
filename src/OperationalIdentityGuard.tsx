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
    document.querySelectorAll<HTMLElement>('.ops-top').forEach(top=>{
     const profiles=Array.from(top.querySelectorAll<HTMLElement>('.ops-profile'));
     profiles.slice(1).forEach(extra=>extra.remove());
    });
    document.querySelectorAll<HTMLElement>('.ops-profile').forEach(root=>{
     if(root.getAttribute('data-role')!==role)root.setAttribute('data-role',role);
     const title=name?`${name} · ${role}`:role;if(root.getAttribute('title')!==title)root.setAttribute('title',title);
     let copy=root.querySelector<HTMLElement>('.ops-profile-copy');
     if(!copy){
      const legacyStrong=root.querySelector('strong');
      copy=document.createElement('span');copy.className='ops-profile-copy';
      const strong=document.createElement('strong'),small=document.createElement('small');copy.append(strong,small);
      legacyStrong?.remove();root.appendChild(copy);
     }
     const strong=copy.querySelector('strong'),small=copy.querySelector('small');
     if(strong&&strong.textContent!==visibleName)strong.textContent=visibleName;
     if(small&&small.textContent!==role)small.textContent=role;
     if(avatarUrl){
      root.querySelector('.ops-profile-avatar')?.remove();
      let img=root.querySelector<HTMLImageElement>('img[data-auth-avatar="true"]');
      if(!img){img=document.createElement('img');img.dataset.authAvatar='true';img.alt='';img.referrerPolicy='no-referrer';root.insertBefore(img,root.firstChild);}
      if(img.src!==avatarUrl)img.src=avatarUrl;
     }else{
      root.querySelector('img[data-auth-avatar="true"]')?.remove();
      let avatar=root.querySelector<HTMLElement>('.ops-profile-avatar');
      if(!avatar){avatar=document.createElement('span');avatar.className='ops-profile-avatar';avatar.setAttribute('aria-hidden','true');root.insertBefore(avatar,root.firstChild);}
      const value=initials(name||role);if(avatar.textContent!==value)avatar.textContent=value;
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
