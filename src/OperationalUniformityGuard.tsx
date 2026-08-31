import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {BarChart3,Building2,CalendarDays,FileText,FolderOpen,UserRound} from 'lucide-react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchAppApi} from './supabase';
import {normalizeNavigation,type NavItem} from './masterNavigation';
import OperationalSidebar from './OperationalSidebar';
import './operational-uniformity.css';

type Ctx={role?:string};
const fallbackNav:NavItem[]=[{label:'Inicio',route:'/inicio'}];

function visible(el:Element){
 const r=(el as HTMLElement).getBoundingClientRect();
 const s=getComputedStyle(el as HTMLElement);
 return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';
}
function activeRoot(pathname:string){
 const root=`/${pathname.split('/').filter(Boolean)[0]||'inicio'}`;
 return root==='/'?'/inicio':root;
}

export default function OperationalUniformityGuard(){
 const location=useLocation(),navigate=useNavigate();
 const[nav,setNav]=useState<NavItem[]>([]);
 const[sidebarHost,setSidebarHost]=useState<HTMLElement|null>(null);
 const[footerHost,setFooterHost]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  let alive=true;
  Promise.all([fetchAppApi<Ctx>('/session/context'),fetchAppApi<unknown>('/navigation')]).then(([,n])=>{
   if(!alive)return;
   setNav(n.status===200?normalizeNavigation(n.data):[]);
  }).catch(()=>{if(alive)setNav([])});
  return()=>{alive=false};
 },[location.pathname]);

 const navigation=nav.length?nav:fallbackNav;
 const activeRoute=useMemo(()=>activeRoot(location.pathname),[location.pathname]);
 const authorized=useMemo(()=>new Set(navigation.map(item=>item.route)),[navigation]);
 const can=(route:string)=>route==='/inicio'||authorized.has(route)||authorized.has(`/${route.split('/')[1]}`);
 const quickLinks=[
  {route:'/expedientes/nuevo',label:'+ Nuevo expediente',Icon:FolderOpen},
  {route:'/contactos/nuevo',label:'+ Nuevo contacto',Icon:UserRound},
  {route:'/inmobiliarias',label:'Inmobiliarias',Icon:Building2},
  {route:'/agenda',label:'Agenda',Icon:CalendarDays},
  {route:'/documentacion',label:'Documentación',Icon:FileText},
  {route:'/informes',label:'Informes',Icon:BarChart3}
 ].filter(item=>can(item.route));

 useEffect(()=>{
  setSidebarHost(null);setFooterHost(null);
  const place=()=>{
   const roots=[...document.querySelectorAll('.ops-root')].filter(visible);
   const root=roots.at(-1) as HTMLElement|undefined;
   if(!root){setSidebarHost(null);setFooterHost(null);return;}

   // Inicio/Dirección already owns its canonical sidebar contract; never overlay it.
   const isHome=location.pathname.replace(/\/+$/,'')==='/inicio'||root.classList.contains('dir-shell');
   const directSide=root.querySelector(':scope > .ops-side') as HTMLElement|null;
   let sideHost=root.querySelector(':scope > .ops-uniform-sidebar-host') as HTMLElement|null;
   if(isHome||directSide){
    if(sideHost){sideHost.remove();sideHost=null;}
   }else if(!sideHost){
    sideHost=document.createElement('div');sideHost.className='ops-uniform-sidebar-host';
    root.insertBefore(sideHost,root.firstChild);
   }
   setSidebarHost(current=>current===sideHost?current:sideHost);

   const content=root.querySelector('.ops-content') as HTMLElement|null;
   if(!content){setFooterHost(null);return;}
   const existing=content.querySelector(':scope > .ops-shared-quick') as HTMLElement|null;
   let fhost=content.querySelector(':scope > .ops-uniform-footer-host') as HTMLElement|null;
   if(!existing&&!fhost&&location.pathname.replace(/\/+$/,'')!=='/inicio'){
    fhost=document.createElement('div');fhost.className='ops-uniform-footer-host';content.appendChild(fhost);
   }
   if((existing||location.pathname.replace(/\/+$/,'')==='/inicio')&&fhost){fhost.remove();fhost=null;}
   setFooterHost(current=>current===fhost?current:fhost);
  };
  place();
  const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.querySelectorAll('.ops-uniform-sidebar-host,.ops-uniform-footer-host').forEach(x=>x.remove());};
 },[location.pathname]);

 return <>
  {sidebarHost&&createPortal(<OperationalSidebar navigation={navigation} activeRoute={activeRoute}/>,sidebarHost)}
  {footerHost&&quickLinks.length>0&&createPortal(<section className="dir-quick ops-shared-quick" aria-label="Accesos rápidos"><h2>ACCESOS RÁPIDOS</h2><div className="dir-quick-grid">{quickLinks.map(({route,label,Icon})=><button key={route} type="button" onClick={()=>navigate(route)}><Icon/>{label}</button>)}</div></section>,footerHost)}
 </>;
}
