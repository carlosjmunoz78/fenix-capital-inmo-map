import { useEffect } from 'react';

const masterNavigation=[
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
  {label:'Notificaciones',route:'/notificaciones'},
  {label:'Mi perfil',route:'/perfil'}
] as const;

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
function enforceNavigation(nav:HTMLElement){
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

  const template=buttons[0];
  const fragment=document.createDocumentFragment();
  for(const item of masterNavigation){
    const key=normalizeLabel(item.label);
    let button=existing.get(key);
    if(!button){
      button=template.cloneNode(true) as HTMLButtonElement;
      button.classList.remove('active');
      button.removeAttribute('aria-current');
      setButtonLabel(button,item.label);
      button.addEventListener('click',event=>{event.preventDefault();navigateTo(item.route)});
    }
    button.dataset.masterRoute=item.route;
    fragment.appendChild(button);
  }

  nav.replaceChildren(fragment);
}
function apply(){
  document.querySelectorAll<HTMLElement>('.dir-nav,.sidebar nav,.ops-side nav').forEach(enforceNavigation);
}

export default function MasterNavigationGuard(){
  useEffect(()=>{
    let raf=0;
    const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})};
    apply();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('popstate',schedule);
    return()=>{observer.disconnect();window.removeEventListener('popstate',schedule);if(raf)cancelAnimationFrame(raf)};
  },[]);
  return null;
}
