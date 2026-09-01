import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import './expediente-journey-guard.css';

const PHASES=['Entrada','Documentación','Análisis','Banco','Tasación','Oferta','FEIN','Notaría','Firma','Cierre'];

function phaseText(node:Element|null|undefined){return node?.querySelector('small')?.textContent?.trim()||'';}

export default function ExpedienteJourneyGuard(){
 const {pathname}=useLocation();
 const active=/^\/expedientes\/[^/]+$/.test(pathname)&&pathname!=='/expedientes/nuevo';
 useEffect(()=>{
  if(!active)return;
  let scheduled=false;
  const sync=()=>{
   if(scheduled)return;
   scheduled=true;
   queueMicrotask(()=>{
    scheduled=false;
    const content=document.querySelector<HTMLElement>('.detail-exp-root .detail-exp-content');
    if(!content)return;
    const real=content.querySelector<HTMLElement>(':scope > .detail-journey:not(.exp-journey-fallback)');
    const fallback=content.querySelector<HTMLElement>(':scope > .exp-journey-fallback');
    if(real){
     fallback?.remove();
     real.dataset.testid='expediente-journey';
     const current=real.querySelector('.detail-phase-track > .current');
     const next=current?.nextElementSibling;
     const currentName=phaseText(current);
     const nextName=phaseText(next);
     let guide=real.querySelector<HTMLElement>(':scope > .exp-journey-guidance');
     if(!guide){guide=document.createElement('div');guide.className='exp-journey-guidance';const track=real.querySelector(':scope > .detail-phase-track');real.insertBefore(guide,track);}
     guide.textContent=currentName
      ? `ANA · Estamos en ${currentName}.${nextName?` Siguiente fase: ${nextName}.`: ' Este es el último tramo del expediente.'}`
      : 'ANA · Estoy comprobando la fase actual del expediente antes de indicarte el siguiente paso.';
     return;
    }
    if(fallback)return;
    const section=document.createElement('section');
    section.className='detail-journey exp-journey-fallback';
    section.dataset.testid='expediente-journey';
    section.innerHTML=`<div class="detail-section-label">RECORRIDO DEL EXPEDIENTE · ESTADO PENDIENTE DE CARGA</div><div class="exp-journey-guidance">ANA · Estoy cargando el estado real del expediente. No marco ninguna fase hasta recibir el dato canónico.</div><div class="detail-phase-track">${PHASES.map((phase,i)=>`<div><span>${i+1}</span><small>${phase}</small></div>`).join('')}</div>`;
    const upload=content.querySelector(':scope > .context-evidence-inline-host');
    const lifecycle=content.querySelector(':scope > .exp-life-inline-host');
    const ana=content.querySelector(':scope > .detail-ana-hero');
    const anchor=upload??lifecycle??ana;
    if(anchor)content.insertBefore(section,anchor.nextSibling);else content.prepend(section);
   });
  };
  sync();
  const observer=new MutationObserver(sync);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  return()=>{observer.disconnect();document.querySelectorAll('.exp-journey-fallback,.exp-journey-guidance').forEach(node=>{if(node.closest('.exp-journey-fallback'))return;node.remove();});};
 },[active,pathname]);
 return null;
}
