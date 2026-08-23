import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi,supabase} from './supabase';

type Ctx={role?:string};
function roleKind(role?:string){const r=(role||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return r==='direccion'?'direccion':r==='visitador'?'visitador':r==='financiero'?'financiero':'otro';}

export default function InmobiliariaCreateAccess(){
 const location=useLocation(),navigate=useNavigate();
 const active=location.pathname==='/inmobiliarias';
 const[logged,setLogged]=useState(false),[ctx,setCtx]=useState<Ctx|null>(null),[target,setTarget]=useState<Element|null>(null);
 useEffect(()=>{if(!active){setTarget(null);return;}let alive=true;supabase.auth.getSession().then(({data})=>{if(alive)setLogged(Boolean(data.session))});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>alive&&setLogged(Boolean(s)));return()=>{alive=false;subscription.unsubscribe()};},[active]);
 useEffect(()=>{if(!active||!logged){setCtx(null);return;}let alive=true;fetchAppApi<Ctx>('/session/context').then(r=>{if(alive)setCtx(r.status===200?r.data:null)});return()=>{alive=false};},[active,logged]);
 useEffect(()=>{
  if(!active)return;
  const resolve=()=>{
   const next=document.querySelector('.inmo-title');
   // Do not tear down the CTA during transient shell mutations. Only switch
   // portals when a real replacement target is present; route changes clear it.
   if(next)setTarget(current=>current===next?current:next);
  };
  resolve();
  const observer=new MutationObserver(resolve);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[active]);
 const kind=roleKind(ctx?.role);const allowed=kind==='direccion'||kind==='visitador';
 if(!active||!logged||!allowed||!target)return null;
 return createPortal(<button type="button" className="primary" data-testid="new-inmobiliaria-access" onClick={()=>navigate('/inmobiliarias/nueva')}>+ Nueva inmobiliaria</button>,target);
}
