import { useEffect } from 'react';
import { fetchAppApi } from './supabase';

type NavItem={label?:string;route?:string};
type NavResponse={items?:NavItem[]};
type MasterItem={label:string;route:string};

const MASTER_ORDER:MasterItem[]=[
  {label:'Inicio',route:'/inicio'},
  {label:'Expedientes',route:'/expedientes'},
  {label:'Bancos',route:'/bancos'},
  {label:'Contactos',route:'/contactos'},
  {label:'Inmobiliarias',route:'/inmobiliarias'},
  {label:'Tasaciones',route:'/tasaciones'},
  {label:'Firmas',route:'/firmas'},
  {label:'Documentación',route:'/documentacion'},
  {label:'Financieros',route:'/financieros'},
  {label:'Visitadores',route:'/visitadores'},
  {label:'Obras Nuevas',route:'/obras-nuevas'},
  {label:'Herencias',route:'/herencias'},
  {label:'Agenda',route:'/agenda'},
  {label:'Economía',route:'/economia'},
  {label:'Informes',route:'/informes'},
  {label:'Notarías',route:'/notarias'},
  {label:'Registros de la Propiedad',route:'/registros-propiedad'},
  {label:'Comunicaciones',route:'/comunicaciones'},
  {label:'Notificaciones',route:'/notificaciones'}
];

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
function directionNavigation(items:MasterItem[]){
  const authorized=new Set(items.map(item=>item.route));
  const isDirection=authorized.has('/financieros')&&authorized.has('/economia')&&authorized.has('/comunicaciones');
  if(!isDirection)return [];
  const visualAdditions=new Set(['/obras-nuevas','/herencias','/registros-propiedad']);
  return MASTER_ORDER.filter(item=>authorized.has(item.route)||visualAdditions.has(item.route));
}
function markManaged(nav:HTMLElement,buttons:HTMLButtonElement[],desiredNavigation:MasterItem[]){
  nav.dataset.masterNavigation='true';
  buttons.forEach((button,index)=>{
    const item=desiredNavigation[index];
    if(item)button.dataset.masterRoute=item.route;
  });
}
function enforceNavigation(nav:HTMLElement,desiredNavigation:MasterItem[]){
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
    let desiredNavigation:MasterItem[]=[];
    const apply=()=>{
      if(!desiredNavigation.length)return;
      document.querySelectorAll<HTMLElement>('.dir-nav,.ops-side nav').forEach(nav=>enforceNavigation(nav,desiredNavigation));
    };
    const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})};
    fetchAppApi<NavResponse>('/navigation').then(result=>{
      if(!alive||result.status!==200||!Array.isArray(result.data?.items))return;
      const items=result.data.items
        .filter((item):item is Required<NavItem>=>Boolean(item&&typeof item.label==='string'&&typeof item.route==='string'))
        .map(item=>({label:item.label.trim(),route:item.route.trim()}))
        .filter(item=>item.label&&item.route);
      desiredNavigation=directionNavigation(items);
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
