import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {anaVertical} from './assets/visualAssets';
import './inmobiliarias-polish.css';

export default function ExpedienteCreateAnaGuard(){
 const location=useLocation(),navigate=useNavigate();
 const active=location.pathname==='/expedientes/nuevo';
 const[host,setHost]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  if(!active){setHost(null);return}
  const place=()=>{
   const roots=[...document.querySelectorAll('.expediente-create-root')].filter(el=>{const r=(el as HTMLElement).getBoundingClientRect();return r.width>0&&r.height>0});
   const root=roots.at(-1) as HTMLElement|undefined;if(!root)return;
   const content=root.querySelector('.ops-content') as HTMLElement|null;if(!content)return;
   const title=content.querySelector(':scope > .ops-title') as HTMLElement|null;
   const legacy=content.querySelector(':scope > .ops-ana-card') as HTMLElement|null;
   if(legacy){legacy.hidden=true;legacy.style.setProperty('display','none','important');legacy.classList.add('exp-create-legacy-ana')}
   let h=content.querySelector(':scope > .exp-create-ana-host') as HTMLElement|null;
   if(!h){h=document.createElement('div');h.className='exp-create-ana-host';if(title?.nextSibling)content.insertBefore(h,title.nextSibling);else content.prepend(h)}
   setHost(current=>current===h?current:h);
  };
  place();const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.querySelectorAll('.exp-create-ana-host').forEach(x=>x.remove());document.querySelectorAll('.exp-create-legacy-ana').forEach(x=>{const h=x as HTMLElement;h.hidden=false;h.style.removeProperty('display');h.classList.remove('exp-create-legacy-ana')});setHost(null)};
 },[active,location.pathname]);
 if(!active||!host)return null;
 return createPortal(<section className="inmo-ana-hero" data-testid="expediente-create-ana"><div className="inmo-ana-photo"><img src={anaVertical} alt="Ana"/></div><div className="inmo-ana-body"><span>ANA · NUEVO EXPEDIENTE</span><h2>Vamos a dar de alta la operación completa desde el principio</h2><p>Registra solo datos reales. Titulares, avalistas, documentación y responsable quedarán relacionados con el mismo expediente; antes de crear nada revisarás la vista previa y confirmarás la operación.</p><div className="inmo-next"><button type="button" onClick={()=>document.querySelector('.exp-create-form')?.scrollIntoView({behavior:'smooth',block:'start'})}><b>1</b><strong>Completar operación</strong><small>Personas y datos →</small></button><button type="button" onClick={()=>document.querySelector('.exp-create-docs')?.scrollIntoView({behavior:'smooth',block:'center'})}><b>2</b><strong>Adjuntar documentación</strong><small>Vincular evidencia →</small></button><button type="button" onClick={()=>navigate('/ana?mode=help&resource=expediente&intent=nuevo')}><b>3</b><strong>Ayúdame con Ana</strong><small>Revisar antes de crear →</small></button></div></div><article className="inmo-correct"><span>CONTROL DEL ALTA</span><h3>Nada se crea sin revisión</h3><p>Si falta información, puedes dejarla pendiente. Ana no completará datos por suposición y cualquier corrección conserva el contexto de esta alta.</p><button type="button" onClick={()=>navigate('/ana?mode=help&resource=expediente&intent=nuevo')}>Corregir o ampliar contexto</button></article></section>,host);
}
