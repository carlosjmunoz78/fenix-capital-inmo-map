import { useEffect } from 'react';
import { fetchAppApi } from './supabase';
import { normalizeNavigation, orderAuthorizedNavigation, type NavItem } from './masterNavigation';

type NavResponse={items?:unknown[]};

function normalizeLabel(value:string){return value.replace(/\s+/g,' ').trim().toLocaleLowerCase('es');}
function isDirectionNavigation(items:NavItem[]){
  const routes=new Set(items.map(item=>item.route));
  return routes.has('/financieros')&&routes.has('/economia')&&routes.has('/comunicaciones');
}
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
function markManaged(nav:HTMLElement,buttons:HTMLButtonElement[],desiredNavigation:NavItem[]){
  nav.dataset.masterNavigation='true';
  buttons.forEach((button,index)=>{
    const item=desiredNavigation[index];
    if(item)button.dataset.masterRoute=item.route;
  });
}
function enforceNavigation(nav:HTMLElement,desiredNavigation:NavItem[]){
  const buttons=Array.from(nav.querySelectorAll(':scope > button')).filter((node):node is HTMLButtonElement=>node instanceof HTMLButtonElement);
  if(!buttons.length)return;
  const desired=desiredNavigation.map(item=>normalizeLabel(item.label));
  const current=buttons.map(button=>normalizeLabel(button.textContent||''));
  if(current.length===desired.length&&current.every((value,index)=>value===desired[index])){
    markManaged(nav,buttons,desiredNavigation);
    return;
  }
  const existing=new Map<string,HTMLButtonElement>();
  for(const button of buttons){
    const label=normalizeLabel(button.textContent||'');
    if(label&&!existing.has(label))existing.set(label,button);
  }
  const aliases=new Map<string,string>([['notificaciones','avisos']]);
  const template=buttons[0];
  const fragment=document.createDocumentFragment();
  const managed:HTMLButtonElement[]=[];
  for(const item of desiredNavigation){
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
    managed.push(button);
    fragment.appendChild(button);
  }
  nav.dataset.masterNavigation='true';
  nav.replaceChildren(fragment);
  markManaged(nav,managed,desiredNavigation);
}

export default function MasterNavigationGuard(){
  useEffect(()=>{
    let alive=true,observer:MutationObserver|null=null,raf=0;
    let desiredNavigation:NavItem[]=[];
    const apply=()=>{
      if(!desiredNavigation.length)return;
      document.querySelectorAll<HTMLElement>('.dir-nav,.ops-side nav').forEach(nav=>enforceNavigation(nav,desiredNavigation));
    };
    const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})};
    fetchAppApi<NavResponse>('/navigation').then(result=>{
      if(!alive||result.status!==200)return;
      const authorized=normalizeNavigation(result.data);
      if(!isDirectionNavigation(authorized))return;
      desiredNavigation=orderAuthorizedNavigation(authorized);
      if(!desiredNavigation.length)return;
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
