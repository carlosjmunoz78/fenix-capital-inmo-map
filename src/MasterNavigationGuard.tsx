import { useEffect } from 'react';
import { fetchAppApi } from './supabase';

type NavItem={label?:string;route?:string};
type NavResponse={items?:NavItem[]};

type MasterItem={label:string;route:string};

function normalizeLabel(value:string){return value.replace(/\s+/g,' ').trim().toLocaleLowerCase('es');}
function navigateTo(route:string){
  const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:`${import.meta.env.BASE_URL}/`;
  const target=`${base}${route.replace(/^\//,'')}`;
  if(window.location.pathname===target)return;
  window.history.pushState({},'',target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function setButtonLabel(button:HTMLButtonElement,label:string){
  const span=button.querySelector('span');
  if(span)span.textContent=label;
  else button.textContent=label;
}
function isMasterNavigation(items:MasterItem[]){
  const routes=new Set(items.map(item=>item.route));
  return routes.has('/obras-nuevas')&&routes.has('/herencias')&&routes.has('/perfil');
}
function enforceNavigation(nav:HTMLElement,masterNavigation:MasterItem[]){
  const buttons=Array.from(nav.querySelectorAll(':scope > button')).filter((node):node is HTMLButtonElement=>node instanceof HTMLButtonElement);
  if(!buttons.length)return;
  const desired=masterNavigation.map(item=>normalizeLabel(item.label));
  const current=buttons.map(button=>normalizeLabel(button.textContent||''));
  if(current.length===desired.length&&current.every((value,index)=>value===desired[index]))return;
  const existing=new Map<string,HTMLButtonElement>();
  for(const button of buttons){
    const label=normalizeLabel(button.textContent||'');
    if(label&&!existing.has(label))existing.set(label,button);
  }
  const aliases=new Map<string,string>([['notificaciones','avisos']]);
  const template=buttons[0];
  const fragment=document.createDocumentFragment();
  for(const item of masterNavigation){
    const key=normalizeLabel(item.label);
    const alias=aliases.get(key);
    let button=existing.get(key)||(alias?existing.get(alias):undefined);
    if(!button){
      button=template.cloneNode(true) as HTMLButtonElement;
      button.classList.remove('active');
      button.removeAttribute('aria-current');
      setButtonLabel(button,item.label);
      button.addEventListener('click',event=>{event.preventDefault();navigateTo(item.route)});
    }else if(normalizeLabel(button.textContent||'')!==key){
      setButtonLabel(button,item.label);
    }
    button.dataset.masterRoute=item.route;
    const pathname=window.location.pathname;
    const active=pathname.endsWith(item.route)||pathname.includes(`${item.route}/`);
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    fragment.appendChild(button);
  }
  nav.replaceChildren(fragment);
}

export default function MasterNavigationGuard(){
  useEffect(()=>{
    let alive=true,observer:MutationObserver|null=null,raf=0;
    let masterNavigation:MasterItem[]=[];
    const apply=()=>{
      if(!masterNavigation.length)return;
      document.querySelectorAll<HTMLElement>('.dir-nav,.sidebar nav,.ops-side nav').forEach(nav=>enforceNavigation(nav,masterNavigation));
    };
    const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})};
    fetchAppApi<NavResponse>('/navigation').then(result=>{
      if(!alive||result.status!==200||!Array.isArray(result.data?.items))return;
      const items=result.data.items
        .filter((item):item is Required<NavItem>=>Boolean(item&&typeof item.label==='string'&&typeof item.route==='string'))
        .map(item=>({label:item.label.trim(),route:item.route.trim()}))
        .filter(item=>item.label&&item.route);
      if(!isMasterNavigation(items))return;
      masterNavigation=items;
      apply();
      observer=new MutationObserver(schedule);
      observer.observe(document.body,{childList:true,subtree:true});
      window.addEventListener('popstate',schedule);
    }).catch(()=>{});
    return()=>{
      alive=false;
      observer?.disconnect();
      window.removeEventListener('popstate',schedule);
      if(raf)cancelAnimationFrame(raf);
    };
  },[]);
  return null;
}
